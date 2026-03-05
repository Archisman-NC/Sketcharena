import { Player } from './Player';
import { Game } from './Game';
export declare class Room {
    id: string;
    hostId: string;
    players: Player[];
    settings: any;
    game: Game | null;
    constructor(id: string, hostPlayer: Player, settings?: any);
    startGame(): void;
    addPlayer(player: Player): boolean;
    removePlayer(playerId: string): void;
    getPlayers(): Player[];
}
//# sourceMappingURL=Room.d.ts.map