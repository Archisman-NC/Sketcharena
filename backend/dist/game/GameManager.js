"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameManager = exports.GameManager = void 0;
const uuid_1 = require("uuid");
const Room_1 = require("./Room");
class GameManager {
    rooms;
    constructor() {
        this.rooms = new Map();
    }
    createRoom(hostPlayer, settings = {}) {
        // Generate a short room ID or use uuid
        const roomId = (0, uuid_1.v4)().substring(0, 6).toUpperCase();
        const newRoom = new Room_1.Room(roomId, hostPlayer, settings);
        this.rooms.set(roomId, newRoom);
        return roomId;
    }
    joinRoom(roomId, player) {
        const room = this.rooms.get(roomId);
        if (room) {
            const added = room.addPlayer(player);
            return added;
        }
        return false;
    }
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    removePlayerFromRoom(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.removePlayer(playerId);
            // Clean up empty rooms
            if (room.getPlayers().length === 0) {
                this.rooms.delete(roomId);
            }
            return true;
        }
        return false;
    }
    // Helper to find a room a player is in (useful on disconnect)
    findPlayerRoom(playerId) {
        for (const room of this.rooms.values()) {
            if (room.getPlayers().some(p => p.id === playerId)) {
                return room;
            }
        }
        return undefined;
    }
    // Public rooms helpers
    getJoinablePublicRooms() {
        const result = [];
        for (const room of this.rooms.values()) {
            const isPublic = room.settings?.isPublic !== false;
            const hasSpace = room.getPlayers().length < room.settings.maxPlayers;
            const lobbyPhase = !room.game || room.game.phase === 'lobby';
            if (isPublic && hasSpace && lobbyPhase) {
                result.push(room);
            }
        }
        return result;
    }
    findRandomPublicRoom() {
        const publicRooms = this.getJoinablePublicRooms();
        if (publicRooms.length === 0)
            return undefined;
        const idx = Math.floor(Math.random() * publicRooms.length);
        return publicRooms[idx];
    }
}
exports.GameManager = GameManager;
// Export a singleton instance
exports.gameManager = new GameManager();
//# sourceMappingURL=GameManager.js.map