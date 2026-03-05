import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket/socket";
import CanvasBoard from "../components/CanvasBoard";
import ChatBox from "../components/ChatBox";

interface Player {
    id: string;
    name: string;
    score: number;
}

interface GameState {
    phase: string;
    round: number;
    drawerId: string;
    players: Player[];
    maxRounds: number;
}

export default function Game() {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [wordOptions, setWordOptions] = useState<string[]>([]);
    const [hiddenWordLength, setHiddenWordLength] = useState<number | null>(null);
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [roundEndWord, setRoundEndWord] = useState<string | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [leaderboard, setLeaderboard] = useState<Player[]>([]);
    const [winner, setWinner] = useState<Player | null>(null);

    useEffect(() => {
        // If someone directly navigates here without a room, go back home
        if (!roomId) {
            navigate("/");
            return;
        }

        const handleGameState = (state: GameState) => {
            setGameState(state);
        };

        const handleRoundStart = ({ round, drawerId }: { round: number, drawerId: string }) => {
            setGameState(prev => prev ? { ...prev, round, drawerId, phase: 'round_start' } : null);
            setWordOptions([]);
            setHiddenWordLength(null);
            setSelectedWord(null);
            setRoundEndWord(null);
        };

        const handleWordOptions = ({ options }: { options: string[] }) => {
            setWordOptions(options);
        };

        const handleRoundReady = ({ wordLength }: { wordLength: number, drawerId: string }) => {
            setHiddenWordLength(wordLength);
            setGameState(prev => prev ? { ...prev, phase: 'drawing' } : null);
        };

        const handleRoundEnd = ({ word, players }: { word: string, players: Player[] }) => {
            setGameState(prev => prev ? { ...prev, phase: 'round_end', players } : null);
            setRoundEndWord(word);
            setTimeRemaining(null);
        };

        const handleTimerUpdate = ({ timeRemaining }: { timeRemaining: number }) => {
            setTimeRemaining(timeRemaining);
        };

        const handleGameOver = ({ winner, leaderboard }: { winner: Player, leaderboard: Player[] }) => {
            setGameState(prev => prev ? { ...prev, phase: 'game_over', players: leaderboard } : null);
            setLeaderboard(leaderboard);
            setWinner(winner);
            setTimeRemaining(null);
        };

        socket.on("game_state", handleGameState);
        socket.on("round_start", handleRoundStart);
        socket.on("word_options", handleWordOptions);
        socket.on("round_ready", handleRoundReady);
        socket.on("round_end", handleRoundEnd);
        socket.on("timer_update", handleTimerUpdate);
        socket.on("game_over", handleGameOver);

        // Explicitly request the game state in case we missed the broadcast during navigation
        socket.emit("request_game_state", { roomId });

        return () => {
            socket.off("game_state", handleGameState);
            socket.off("round_start", handleRoundStart);
            socket.off("word_options", handleWordOptions);
            socket.off("round_ready", handleRoundReady);
            socket.off("round_end", handleRoundEnd);
            socket.off("timer_update", handleTimerUpdate);
            socket.off("game_over", handleGameOver);
        };
    }, [roomId, navigate]);

    if (!gameState) {
        return <div style={{ textAlign: "center", marginTop: "50px" }}>Loading game state...</div>;
    }

    const currentDrawer = gameState.players.find(p => p.id === gameState.drawerId);

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #ccc", paddingBottom: "10px" }}>
                <h2>Room: {roomId}</h2>
                {timeRemaining !== null && gameState.phase === 'drawing' && (
                    <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: timeRemaining <= 10 ? 'red' : 'inherit' }}>
                        Time Remaining: {timeRemaining}s
                    </div>
                )}
                <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                    Round {gameState.round} / {gameState.maxRounds}
                </div>
            </div>

            <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
                {/* Left Drawer / Players Column */}
                <div style={{ flex: "0 0 250px", border: "1px solid #ccc", borderRadius: "8px", padding: "15px", backgroundColor: "#f9f9f9" }}>
                    <h3>Players</h3>
                    <ul style={{ listStyleType: "none", padding: 0 }}>
                        {gameState.players.map((player) => {
                            const isDrawer = player.id === gameState.drawerId;
                            const isMe = player.id === socket.id;

                            return (
                                <li key={player.id} style={{
                                    padding: "10px",
                                    marginBottom: "8px",
                                    borderRadius: "4px",
                                    backgroundColor: isDrawer ? "#fff3cd" : "white",
                                    border: isDrawer ? "1px solid #ffeeba" : "1px solid #ddd",
                                    fontWeight: isDrawer ? "bold" : "normal"
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>
                                            {isDrawer && "⭐ "}
                                            {player.name}
                                            {isMe && " (You)"}
                                            {isDrawer && " 🎨"}
                                        </span>
                                        <span style={{ fontWeight: "bold", color: "#4CAF50" }}>{player.score} pts</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Right Game Column */}
                <div style={{ flex: "1", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", border: "1px solid #ccc", borderRadius: "8px", padding: "20px" }}>
                    <h2 style={{ marginBottom: "10px" }}>Current Drawer:</h2>
                    <h1 style={{ color: "#4CAF50" }}>{currentDrawer?.name || "Unknown"}</h1>

                    {/* Word Selection Logic */}
                    <div style={{ marginTop: "30px" }}>
                        {gameState.phase === 'round_start' && (
                            <>
                                {socket.id === gameState.drawerId ? (
                                    wordOptions.length > 0 ? (
                                        <div>
                                            <h3>Choose a word to draw:</h3>
                                            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "15px" }}>
                                                {wordOptions.map(option => (
                                                    <button
                                                        key={option}
                                                        onClick={() => {
                                                            setSelectedWord(option);
                                                            socket.emit('word_chosen', { word: option });
                                                        }}
                                                        style={{
                                                            padding: "10px 20px",
                                                            fontSize: "16px",
                                                            cursor: "pointer",
                                                            backgroundColor: "#2196F3",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "4px"
                                                        }}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: "1.2rem", color: "#666" }}>Waiting for word options...</p>
                                    )
                                ) : (
                                    <p style={{ fontSize: "1.2rem", color: "#666" }}>
                                        Waiting for drawer to choose a word...
                                    </p>
                                )}
                            </>
                        )}

                        {gameState.phase === 'drawing' && (
                            <>
                                {socket.id === gameState.drawerId ? (
                                    <h3 style={{ fontSize: "1.5rem" }}>
                                        You are drawing: <span style={{ color: "#e91e63", letterSpacing: "2px" }}>{selectedWord || "????"}</span>
                                    </h3>
                                ) : (
                                    <h3 style={{ fontSize: "1.5rem" }}>
                                        Word: <span style={{ letterSpacing: "8px", fontFamily: "monospace" }}>
                                            {hiddenWordLength ? "_ ".repeat(hiddenWordLength) : "???"}
                                        </span>
                                    </h3>
                                )}

                                <CanvasBoard isDrawer={socket.id === gameState.drawerId} />
                            </>
                        )}

                        {gameState.phase === 'round_end' && (
                            <div style={{ padding: "40px", backgroundColor: "#fff3cd", borderRadius: "8px", border: "1px solid #ffeeba" }}>
                                <h2 style={{ fontSize: "2rem", color: "#856404", marginBottom: "20px" }}>Round Over!</h2>
                                <h3 style={{ fontSize: "1.5rem" }}>
                                    The word was: <span style={{ color: "#e91e63", fontSize: "2rem", fontWeight: "bold" }}>{roundEndWord}</span>
                                </h3>
                                <p style={{ marginTop: "20px", fontSize: "1.2rem", color: "#666" }}>Waiting for next round...</p>
                            </div>
                        )}

                        {gameState.phase === 'game_over' && (
                            <div style={{ padding: "40px", backgroundColor: "#e3f2fd", borderRadius: "8px", border: "1px solid #90caf9" }}>
                                <h2 style={{ fontSize: "2rem", color: "#1565c0", marginBottom: "20px" }}>Game Over!</h2>
                                <h3 style={{ fontSize: "1.5rem" }}>
                                    Winner: <span style={{ color: "#e91e63", fontWeight: "bold" }}>{winner?.name}</span>
                                </h3>

                                <div style={{ marginTop: "30px", textAlign: "left" }}>
                                    <h3>Leaderboard:</h3>
                                    <ol style={{ fontSize: "1.2rem", lineHeight: "1.8" }}>
                                        {leaderboard.map((p) => (
                                            <li key={p.id}>
                                                <strong>{p.name}</strong> — {p.score} points
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Chat Column */}
                <div style={{ flex: "0 0 300px" }}>
                    <ChatBox isDrawer={socket.id === gameState.drawerId} phase={gameState.phase} />
                </div>
            </div>
        </div>
    );
}
