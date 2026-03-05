"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
const Game_1 = require("./Game");
class Room {
    id;
    hostId;
    players;
    settings;
    game;
    constructor(id, hostPlayer, settings = {}) {
        this.id = id;
        this.hostId = hostPlayer.id;
        this.players = [hostPlayer];
        // Host-configurable settings with safe defaults
        this.settings = {
            maxRounds: settings.maxRounds ?? 3,
            drawTime: settings.drawTime ?? 60,
            wordOptionsCount: settings.wordOptionsCount ?? 3,
            hintsEnabled: settings.hintsEnabled ?? true,
            hintsCount: settings.hintsCount ?? 3,
            maxPlayers: settings.maxPlayers ?? 8,
            isPublic: settings.isPublic ?? true,
        };
        this.game = null;
    }
    startGame() {
        this.game = new Game_1.Game(this.players, this.settings);
        this.game.startGame();
    }
    addPlayer(player) {
        // Avoid adding the same player twice based on socket ID
        if (this.players.find(p => p.id === player.id)) {
            return false;
        }
        // Enforce max player limit for the room
        if (this.players.length >= this.settings.maxPlayers) {
            return false;
        }
        this.players.push(player);
        return true;
    }
    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
        // If the host leaves and there are still players, reassign the host
        if (this.hostId === playerId && this.players.length > 0) {
            this.hostId = this.players[0].id;
        }
    }
    getPlayers() {
        return this.players;
    }
}
exports.Room = Room;
//# sourceMappingURL=Room.js.map