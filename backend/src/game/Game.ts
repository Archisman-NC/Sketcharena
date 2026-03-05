import { Player } from './Player';
import { wordList } from '../utils/wordList';

export class Game {
    public round: number;
    public maxRounds: number;
    public players: Player[];
    public drawerIndex: number;
    public drawerId: string;
    public phase: 'lobby' | 'round_start' | 'drawing' | 'round_end' | 'game_over';
    public word: string | null;
    public wordOptions: string[];
    public drawTime: number;
    public timeRemaining: number;
    public timerInterval: NodeJS.Timeout | null;

    constructor(players: Player[], settings: any) {
        this.round = 0;
        this.maxRounds = settings.maxRounds || 3;
        this.players = players;
        this.drawerIndex = -1;
        this.drawerId = '';
        this.phase = 'lobby';
        this.word = null;
        this.wordOptions = [];
        this.drawTime = settings.drawTime || 60;
        this.timeRemaining = 0;
        this.timerInterval = null;
    }

    startGame() {
        this.round = 1;
        this.drawerIndex = 0;

        // Safety check just in case players array is empty
        if (this.players.length > 0) {
            this.drawerId = this.players[0]!.id;
        }

        this.word = null;
        this.generateWordOptions();
        this.phase = 'round_start';
    }

    nextDrawer() {
        this.drawerIndex++;

        // Check if we reached the end of the player list for this round
        if (this.drawerIndex >= this.players.length) {
            this.nextRound();
        } else {
            this.drawerId = this.players[this.drawerIndex]!.id;
            this.word = null;
            this.generateWordOptions();
            this.phase = 'round_start';
        }
    }

    nextRound() {
        this.round++;

        if (this.round > this.maxRounds) {
            this.phase = 'game_over';
        } else {
            this.drawerIndex = 0;
            if (this.players.length > 0) {
                this.drawerId = this.players[0]!.id;
            }
            this.word = null;
            this.generateWordOptions();
            this.phase = 'round_start';
        }
    }

    getCurrentDrawer(): Player | undefined {
        return this.players.find(p => p.id === this.drawerId);
    }

    generateWordOptions() {
        const shuffled = [...wordList].sort(() => 0.5 - Math.random());
        this.wordOptions = shuffled.slice(0, 3);
    }

    checkGuess(text: string): boolean {
        if (!this.word) return false;
        return text.trim().toLowerCase() === this.word.toLowerCase();
    }

    startTimer(onTick: (time: number) => void, onEnd: () => void) {
        this.stopTimer();
        this.timeRemaining = this.drawTime;

        this.timerInterval = setInterval(() => {
            this.timeRemaining -= 1;
            onTick(this.timeRemaining);

            if (this.timeRemaining <= 0) {
                this.stopTimer();
                onEnd();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    getState() {
        return {
            phase: this.phase,
            round: this.round,
            drawerId: this.drawerId,
            players: this.players,
            maxRounds: this.maxRounds,
            timeRemaining: this.timeRemaining
        };
    }
}
