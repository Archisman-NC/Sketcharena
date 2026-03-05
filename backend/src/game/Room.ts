import { Player } from './Player';
import { Game } from './Game';

export class Room {
    public id: string;
    public hostId: string;
    public players: Player[];
    public settings: any;
    public game: Game | null;

    constructor(id: string, hostPlayer: Player) {
        this.id = id;
        this.hostId = hostPlayer.id;
        this.players = [hostPlayer];
        this.settings = {}; // Placeholder for now
        this.game = null;
    }

    startGame() {
        this.game = new Game(this.players, this.settings);
        this.game.startGame();
    }

    addPlayer(player: Player) {
        // Avoid adding the same player twice based on socket ID
        if (!this.players.find(p => p.id === player.id)) {
            this.players.push(player);
        }
    }

    removePlayer(playerId: string) {
        this.players = this.players.filter(p => p.id !== playerId);

        // If the host leaves and there are still players, reassign the host
        if (this.hostId === playerId && this.players.length > 0) {
            this.hostId = this.players[0]!.id;
        }
    }

    getPlayers() {
        return this.players;
    }
}
