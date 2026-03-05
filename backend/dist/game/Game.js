"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const wordList_1 = require("../utils/wordList");
class Game {
    round;
    maxRounds;
    players;
    drawerIndex;
    drawerId;
    phase;
    word;
    wordOptions;
    drawTime;
    timeRemaining;
    timerInterval;
    maskedWord;
    revealedIndexes;
    hintInterval;
    wordOptionsCount;
    hintsEnabled;
    hintsCount;
    hintsRevealed;
    constructor(players, settings) {
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
        this.maskedWord = [];
        this.revealedIndexes = [];
        this.hintInterval = null;
        // Additional configurable behavior
        this.wordOptionsCount = settings.wordOptionsCount ?? 3;
        const rawHintsCount = settings.hintsCount ?? 3;
        this.hintsCount = Math.max(0, Math.min(5, rawHintsCount));
        // If hintsEnabled explicitly provided, honor it; otherwise derive from hintsCount
        this.hintsEnabled = settings.hintsEnabled ?? this.hintsCount > 0;
        this.hintsRevealed = 0;
    }
    startGame() {
        this.round = 1;
        this.drawerIndex = 0;
        // Safety check just in case players array is empty
        if (this.players.length > 0) {
            this.drawerId = this.players[0].id;
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
        }
        else {
            this.drawerId = this.players[this.drawerIndex].id;
            this.word = null;
            this.generateWordOptions();
            this.phase = 'round_start';
        }
    }
    nextRound() {
        this.round++;
        if (this.round > this.maxRounds) {
            this.phase = 'game_over';
        }
        else {
            this.drawerIndex = 0;
            if (this.players.length > 0) {
                this.drawerId = this.players[0].id;
            }
            this.word = null;
            this.generateWordOptions();
            this.phase = 'round_start';
        }
    }
    getCurrentDrawer() {
        return this.players.find(p => p.id === this.drawerId);
    }
    generateWordOptions() {
        const shuffled = [...wordList_1.wordList].sort(() => 0.5 - Math.random());
        this.wordOptions = shuffled.slice(0, this.wordOptionsCount);
    }
    checkGuess(text) {
        if (!this.word)
            return false;
        const normalize = (s) => s
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return normalize(text) === normalize(this.word);
    }
    startTimer(onTick, onEnd) {
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
    initializeHints() {
        if (!this.hintsEnabled)
            return;
        if (!this.word)
            return;
        this.maskedWord = Array(this.word.length).fill('_');
        this.revealedIndexes = [];
        this.hintsRevealed = 0;
        // Randomly reveal 1 letter at start if word is longer than 3 characters
        if (this.word.length > 3) {
            const randomIndex = Math.floor(Math.random() * this.word.length);
            this.maskedWord[randomIndex] = this.word.charAt(randomIndex);
            this.revealedIndexes.push(randomIndex);
        }
    }
    startHintSystem(onHintReveal) {
        if (!this.hintsEnabled || this.hintsCount <= 0)
            return;
        if (!this.word)
            return;
        // Clear any existing interval
        if (this.hintInterval) {
            clearInterval(this.hintInterval);
        }
        this.hintInterval = setInterval(() => {
            if (!this.word)
                return;
            // Find all unrevealed indexes
            const unrevealed = [];
            for (let i = 0; i < this.word.length; i++) {
                if (!this.revealedIndexes.includes(i)) {
                    unrevealed.push(i);
                }
            }
            // If only 1 letter left to be unrevealed, don't reveal it (don't give the whole word away)
            if (unrevealed.length <= 1) {
                if (this.hintInterval)
                    clearInterval(this.hintInterval);
                return;
            }
            // Pick a random unrevealed index
            const randomIdxOfUnrevealed = Math.floor(Math.random() * unrevealed.length);
            const randomIndex = unrevealed[randomIdxOfUnrevealed];
            if (randomIndex === undefined)
                return;
            this.maskedWord[randomIndex] = this.word.charAt(randomIndex);
            this.revealedIndexes.push(randomIndex);
            this.hintsRevealed += 1;
            onHintReveal(this.maskedWord);
            // Stop once we have revealed the configured number of hints
            if (this.hintsRevealed >= this.hintsCount && this.hintInterval) {
                clearInterval(this.hintInterval);
                this.hintInterval = null;
            }
        }, 15000); // Reveal a letter every 15 seconds by default
    }
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.hintInterval) {
            clearInterval(this.hintInterval);
            this.hintInterval = null;
        }
    }
    getState() {
        return {
            phase: this.phase,
            round: this.round,
            drawerId: this.drawerId,
            players: this.players,
            maxRounds: this.maxRounds,
            timeRemaining: this.timeRemaining,
            maskedWord: this.maskedWord // Send masked word for late joiners connecting mid-round
        };
    }
}
exports.Game = Game;
//# sourceMappingURL=Game.js.map