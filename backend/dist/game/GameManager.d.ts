import { Room } from './Room';
import { Player } from './Player';
export declare class GameManager {
    private rooms;
    constructor();
    createRoom(hostPlayer: Player, settings?: any): string;
    joinRoom(roomId: string, player: Player): boolean;
    getRoom(roomId: string): Room | undefined;
    removePlayerFromRoom(roomId: string, playerId: string): boolean;
    findPlayerRoom(playerId: string): Room | undefined;
    getJoinablePublicRooms(): Room[];
    findRandomPublicRoom(): Room | undefined;
}
export declare const gameManager: GameManager;
//# sourceMappingURL=GameManager.d.ts.map