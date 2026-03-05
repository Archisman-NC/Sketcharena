import { Player } from './Player';
export declare class Game {
    round: number;
    maxRounds: number;
    players: Player[];
    drawerIndex: number;
    drawerId: string;
    phase: 'lobby' | 'round_start' | 'drawing' | 'round_end' | 'game_over';
    word: string | null;
    wordOptions: string[];
    drawTime: number;
    timeRemaining: number;
    timerInterval: NodeJS.Timeout | null;
    maskedWord: string[];
    revealedIndexes: number[];
    hintInterval: NodeJS.Timeout | null;
    wordOptionsCount: number;
    hintsEnabled: boolean;
    hintsCount: number;
    hintsRevealed: number;
    constructor(players: Player[], settings: any);
    startGame(): void;
    nextDrawer(): void;
    nextRound(): void;
    getCurrentDrawer(): Player | undefined;
    generateWordOptions(): void;
    checkGuess(text: string): boolean;
    startTimer(onTick: (time: number) => void, onEnd: () => void): void;
    initializeHints(): void;
    startHintSystem(onHintReveal: (maskedWord: string[]) => void): void;
    stopTimer(): void;
    getState(): {
        phase: "lobby" | "round_start" | "drawing" | "round_end" | "game_over";
        round: number;
        drawerId: string;
        players: Player[];
        maxRounds: number;
        timeRemaining: number;
        maskedWord: string[];
    };
}
//# sourceMappingURL=Game.d.ts.map