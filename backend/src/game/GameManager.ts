import { v4 as uuidv4 } from 'uuid';
import { Room } from './Room';
import { Player } from './Player';

export class GameManager {
    private rooms: Map<string, Room>;

    constructor() {
        this.rooms = new Map();
    }

    createRoom(hostPlayer: Player): string {
        // Generate a short room ID or use uuid
        const roomId = uuidv4().substring(0, 6).toUpperCase();
        const newRoom = new Room(roomId, hostPlayer);
        this.rooms.set(roomId, newRoom);
        return roomId;
    }

    joinRoom(roomId: string, player: Player): boolean {
        const room = this.rooms.get(roomId);
        if (room) {
            room.addPlayer(player);
            return true;
        }
        return false;
    }

    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    removePlayerFromRoom(roomId: string, playerId: string): boolean {
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
    findPlayerRoom(playerId: string): Room | undefined {
        for (const room of this.rooms.values()) {
            if (room.getPlayers().some(p => p.id === playerId)) {
                return room;
            }
        }
        return undefined;
    }
}

// Export a singleton instance
export const gameManager = new GameManager();
