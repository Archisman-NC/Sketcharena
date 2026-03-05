"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const GameManager_1 = require("./game/GameManager");
const Player_1 = require("./game/Player");
const app = (0, express_1.default)();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use((0, cors_1.default)({
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
}));
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: FRONTEND_URL,
        methods: ['GET', 'POST'],
    },
});
io.on('connection', (socket) => {
    console.log(`[Socket] A client connected: ${socket.id}`);
    socket.on('ping', () => {
        console.log(`[Socket] Received ping from ${socket.id}, sending pong`);
        socket.emit('pong');
    });
    const handleRoundEndTransition = (room) => {
        setTimeout(() => {
            if (!room.game)
                return;
            room.game.nextDrawer();
            if (room.game.phase === 'game_over') {
                const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
                const winner = sortedPlayers[0];
                io.to(room.id).emit('game_over', {
                    winner,
                    leaderboard: sortedPlayers
                });
            }
            else {
                io.to(room.id).emit('round_start', {
                    round: room.game.round,
                    drawerId: room.game.drawerId
                });
                io.to(room.game.drawerId).emit('word_options', {
                    options: room.game.wordOptions
                });
            }
            io.to(room.id).emit('game_state', room.game.getState());
        }, 3000);
    };
    socket.on('create_room', (payload) => {
        if (!payload || !payload.playerName)
            return;
        const hostPlayer = new Player_1.Player(socket.id, payload.playerName);
        const roomId = GameManager_1.gameManager.createRoom(hostPlayer, payload.settings || {});
        const room = GameManager_1.gameManager.getRoom(roomId);
        socket.join(roomId);
        console.log(`[Socket] Room ${roomId} created by ${payload.playerName}`);
        if (room) {
            socket.emit('room_created', { roomId, hostId: room.hostId });
        }
    });
    socket.on('join_room', (payload) => {
        if (!payload || !payload.roomId || !payload.playerName)
            return;
        const roomId = payload.roomId.toUpperCase();
        const player = new Player_1.Player(socket.id, payload.playerName);
        const success = GameManager_1.gameManager.joinRoom(roomId, player);
        if (success) {
            socket.join(roomId);
            console.log(`[Socket] ${payload.playerName} joined room ${roomId}`);
            const room = GameManager_1.gameManager.getRoom(roomId);
            if (room) {
                io.to(roomId).emit('player_joined', { players: room.getPlayers(), hostId: room.hostId, settings: room.settings });
            }
        }
        else {
            socket.emit('error', { message: 'Room not found or full' });
        }
    });
    socket.on('join_random_room', (payload) => {
        if (!payload || !payload.playerName)
            return;
        // Try to find any joinable public room
        let targetRoom = GameManager_1.gameManager.findRandomPublicRoom();
        if (!targetRoom) {
            return socket.emit('error', { message: 'No public rooms available' });
        }
        const player = new Player_1.Player(socket.id, payload.playerName);
        // Attempt to join; if full due to race, try again once
        let success = GameManager_1.gameManager.joinRoom(targetRoom.id, player);
        if (!success) {
            targetRoom = GameManager_1.gameManager.findRandomPublicRoom();
            if (!targetRoom) {
                return socket.emit('error', { message: 'No public rooms available' });
            }
            success = GameManager_1.gameManager.joinRoom(targetRoom.id, player);
        }
        if (!success) {
            return socket.emit('error', { message: 'Failed to join public room' });
        }
        socket.join(targetRoom.id);
        console.log(`[Socket] ${payload.playerName} joined random public room ${targetRoom.id}`);
        io.to(targetRoom.id).emit('player_joined', {
            players: targetRoom.getPlayers(),
            hostId: targetRoom.hostId,
            settings: targetRoom.settings,
        });
        // Tell this client which room they ended up in
        socket.emit('joined_room', { roomId: targetRoom.id });
    });
    socket.on('start_game', (payload) => {
        const room = GameManager_1.gameManager.findPlayerRoom(socket.id);
        if (!room)
            return socket.emit('error', { message: 'Not in a room' });
        if (room.hostId !== socket.id) {
            return socket.emit('error', { message: 'Only the host can start the game' });
        }
        room.startGame();
        // Broadcast game start to everyone in the room
        io.to(room.id).emit('game_started', {
            round: room.game.round,
            drawerId: room.game.drawerId,
            players: room.players
        });
        // Broadcast initial game state
        io.to(room.id).emit('game_state', room.game.getState());
        // Send word options ONLY to the drawer
        io.to(room.game.drawerId).emit('word_options', {
            options: room.game.wordOptions
        });
        console.log(`[Socket] Game started in room ${room.id} led by ${socket.id}`);
    });
    socket.on('request_room_data', (payload) => {
        if (!payload || !payload.roomId)
            return;
        const roomId = payload.roomId.toUpperCase();
        const room = GameManager_1.gameManager.getRoom(roomId);
        if (room) {
            socket.emit('room_data', { players: room.getPlayers(), hostId: room.hostId, settings: room.settings });
        }
        else {
            socket.emit('error', { message: 'Room not found' });
        }
    });
    socket.on('request_game_state', (payload) => {
        if (!payload || !payload.roomId)
            return;
        const roomId = payload.roomId.toUpperCase();
        const room = GameManager_1.gameManager.getRoom(roomId);
        if (room && room.game) {
            socket.emit('game_state', room.game.getState());
            // If the requester is the drawer AND phase is round_start, re-emit word options
            if (room.game.drawerId === socket.id && room.game.phase === 'round_start') {
                socket.emit('word_options', { options: room.game.wordOptions });
            }
        }
    });
    socket.on('word_chosen', (payload) => {
        if (!payload || !payload.word)
            return;
        const room = GameManager_1.gameManager.findPlayerRoom(socket.id);
        if (!room || !room.game)
            return;
        // Only allow the current drawer to choose a word
        if (room.game.drawerId !== socket.id)
            return;
        room.game.word = payload.word;
        room.game.phase = 'drawing';
        console.log(`[Socket] Drawer ${socket.id} chose word: ${payload.word} in room ${room.id}`);
        // Notify everyone in the room that the round is ready
        io.to(room.id).emit('round_ready', {
            wordLength: payload.word.length,
            drawerId: room.game.drawerId
        });
        // Initialize hints
        room.game.initializeHints();
        // Sync phase change
        io.to(room.id).emit('game_state', room.game.getState());
        // Start Hint System
        room.game.startHintSystem((maskedWord) => {
            io.to(room.id).emit('hint_update', { maskedWord });
        });
        // Start timer
        room.game.startTimer((timeRemaining) => {
            io.to(room.id).emit('timer_update', { timeRemaining });
        }, () => {
            if (!room.game)
                return;
            room.game.phase = 'round_end';
            io.to(room.id).emit('round_end', {
                word: room.game.word,
                players: room.players
            });
            io.to(room.id).emit('game_state', room.game.getState());
            handleRoundEndTransition(room);
        });
    });
    socket.on('guess', (payload) => {
        if (!payload || !payload.text)
            return;
        const room = GameManager_1.gameManager.findPlayerRoom(socket.id);
        if (!room || !room.game)
            return;
        // Do not allow drawer to guess
        if (room.game.drawerId === socket.id)
            return;
        // Only allow guesses during drawing phase
        if (room.game.phase !== 'drawing')
            return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player)
            return;
        const isCorrect = room.game.checkGuess(payload.text);
        if (isCorrect) {
            player.score += 100;
            room.game.stopTimer();
            // Broadcast correct guess
            io.to(room.id).emit('guess_correct', {
                playerId: player.id,
                playerName: player.name,
                points: 100
            });
            // End round
            room.game.phase = 'round_end';
            io.to(room.id).emit('round_end', {
                word: room.game.word,
                players: room.players
            });
            // Sync phase change
            io.to(room.id).emit('game_state', room.game.getState());
            handleRoundEndTransition(room);
        }
        else {
            io.to(room.id).emit('chat_message', {
                playerId: player.id,
                playerName: player.name,
                text: payload.text,
                channel: 'guess',
            });
        }
    });
    socket.on('chat', (payload) => {
        if (!payload || !payload.text)
            return;
        const room = GameManager_1.gameManager.findPlayerRoom(socket.id);
        if (!room)
            return socket.emit('error', { message: 'Not in a room' });
        const player = room.players.find(p => p.id === socket.id);
        if (!player)
            return;
        const text = String(payload.text).trim();
        if (!text)
            return;
        io.to(room.id).emit('chat_message', {
            playerId: player.id,
            playerName: player.name,
            text,
            channel: 'chat',
        });
    });
    socket.on('draw_start', (payload) => {
        const room = GameManager_1.gameManager.findPlayerRoom(socket.id);
        if (!room || !room.game)
            return;
        if (room.game.drawerId !== socket.id)
            return;
        io.to(room.id).emit('draw_data', { type: 'start', ...payload });
    });
    socket.on('draw_move', (payload) => {
        const room = GameManager_1.gameManager.findPlayerRoom(socket.id);
        if (!room || !room.game)
            return;
        if (room.game.drawerId !== socket.id)
            return;
        io.to(room.id).emit('draw_data', { type: 'move', ...payload });
    });
    socket.on('draw_end', () => {
        const room = GameManager_1.gameManager.findPlayerRoom(socket.id);
        if (!room || !room.game)
            return;
        if (room.game.drawerId !== socket.id)
            return;
        io.to(room.id).emit('draw_data', { type: 'end' });
    });
    socket.on('draw_tool', (payload) => {
        const room = GameManager_1.gameManager.findPlayerRoom(socket.id);
        if (!room || !room.game)
            return;
        if (room.game.drawerId !== socket.id)
            return;
        io.to(room.id).emit('tool_update', payload);
    });
    socket.on('draw_undo', () => {
        const room = GameManager_1.gameManager.findPlayerRoom(socket.id);
        if (!room || !room.game)
            return;
        if (room.game.drawerId !== socket.id)
            return;
        io.to(room.id).emit('undo_stroke');
    });
    socket.on('canvas_clear', () => {
        const room = GameManager_1.gameManager.findPlayerRoom(socket.id);
        if (!room || !room.game)
            return;
        if (room.game.drawerId !== socket.id)
            return;
        io.to(room.id).emit('clear_canvas');
    });
    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
        const room = GameManager_1.gameManager.findPlayerRoom(socket.id);
        if (room) {
            const roomId = room.id;
            GameManager_1.gameManager.removePlayerFromRoom(roomId, socket.id);
            const updatedRoom = GameManager_1.gameManager.getRoom(roomId);
            if (updatedRoom) {
                io.to(roomId).emit('player_left', { players: updatedRoom.getPlayers(), hostId: updatedRoom.hostId, settings: updatedRoom.settings });
            }
        }
    });
});
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} (frontend: ${FRONTEND_URL})`);
});
//# sourceMappingURL=server.js.map