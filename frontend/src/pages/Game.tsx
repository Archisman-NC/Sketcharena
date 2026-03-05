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
    const [winner, setWinner] = useState<Player | null>(null);
    const [maskedWord, setMaskedWord] = useState<string[]>([]);

    useEffect(() => {
        // If someone directly navigates here without a room, go back home
        if (!roomId) {
            navigate("/");
            return;
        }

        const handleGameState = (state: GameState & { maskedWord?: string[] }) => {
            setGameState(state);
            if (state.maskedWord) setMaskedWord(state.maskedWord);
        };

        const handleRoundStart = ({ round, drawerId }: { round: number, drawerId: string }) => {
            setGameState(prev => prev ? { ...prev, round, drawerId, phase: 'round_start' } : null);
            setWordOptions([]);
            setHiddenWordLength(null);
            setSelectedWord(null);
            setRoundEndWord(null);
            setMaskedWord([]);
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
            setWinner(winner);
            setTimeRemaining(null);
        };

        const handleHintUpdate = ({ maskedWord }: { maskedWord: string[] }) => {
            setMaskedWord(maskedWord);
        };

        socket.on("game_state", handleGameState);
        socket.on("round_start", handleRoundStart);
        socket.on("word_options", handleWordOptions);
        socket.on("round_ready", handleRoundReady);
        socket.on("round_end", handleRoundEnd);
        socket.on("timer_update", handleTimerUpdate);
        socket.on("game_over", handleGameOver);
        socket.on("hint_update", handleHintUpdate);

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
            socket.off("hint_update", handleHintUpdate);
        };
    }, [roomId, navigate]);

    if (!gameState) {
        return <div style={{ textAlign: "center", marginTop: "50px" }}>Loading game state...</div>;
    }

    const currentDrawer = gameState.players.find(p => p.id === gameState.drawerId);

    return (
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px", display: "flex", flexDirection: "column", minHeight: '100vh' }}>
            {/* Top Bar Header */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                backgroundColor: 'white',
                padding: "15px 25px",
                borderRadius: "var(--border-radius)",
                boxShadow: "var(--shadow-sm)",
                marginBottom: "20px",
                columnGap: "16px"
            }}>
                <div style={{ fontSize: "1rem", fontWeight: 600, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '999px', backgroundColor: '#22c55e', boxShadow: '0 0 0 4px rgba(34,197,94,0.25)' }} />
                    <span>Room</span>
                    <span style={{ fontFamily: "monospace", padding: '4px 10px', borderRadius: 999, backgroundColor: '#eef2ff', color: 'var(--primary-color)', fontWeight: 700 }}>
                        {roomId}
                    </span>
                </div>

                <div style={{ textAlign: "center" }}>
                    <div style={{
                        fontSize: "0.9rem",
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: '#9ca3af',
                        marginBottom: 4
                    }}>
                        {gameState.phase === 'drawing' ? 'Guess the word' : 'Round status'}
                    </div>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 14px',
                        borderRadius: 999,
                        backgroundColor: '#f3f4f6',
                        fontWeight: 600,
                        color: timeRemaining !== null && timeRemaining <= 10 ? '#ef4444' : '#111827',
                    }}>
                        <span role="img" aria-label="timer">⏱</span>
                        <span>{timeRemaining !== null ? `${timeRemaining}s` : '--'}</span>
                    </div>
                </div>

                <div style={{ justifySelf: 'flex-end' }}>
                    <div style={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: '#4b5563',
                        backgroundColor: '#f3f4f6',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                    }}>
                        <span>Round</span>
                        <span style={{ fontWeight: 800 }}>{gameState.round}</span>
                        <span style={{ color: '#9ca3af' }}>/</span>
                        <span>{gameState.maxRounds}</span>
                    </div>
                </div>
            </div>

            {/* Layout Grid container */}
            <div className="game-grid" style={{
                display: "grid",
                gridTemplateColumns: "minmax(200px, 280px) minmax(500px, 1fr) minmax(250px, 320px)",
                gap: "20px",
                alignItems: "start"
            }}>

                {/* Left Column: Players */}
                <div style={{
                    backgroundColor: "white",
                    borderRadius: "var(--border-radius)",
                    padding: "20px",
                    boxShadow: "var(--shadow-sm)",
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px', color: '#1f2937', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Leaderboard</span>
                        <span style={{ fontSize: '0.9rem', backgroundColor: 'var(--primary-color)', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>{gameState.players.length}</span>
                    </h3>
                    <ul style={{ listStyleType: "none", padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[...gameState.players].sort((a, b) => b.score - a.score).map((player, index) => {
                            const isDrawer = player.id === gameState.drawerId;
                            const isMe = player.id === socket.id;

                            return (
                                <li key={player.id} style={{
                                    padding: "12px",
                                    borderRadius: "8px",
                                    backgroundColor: isDrawer ? "#e0e7ff" : (index % 2 === 0 ? "#f9fafb" : "white"),
                                    border: isDrawer ? "1px solid var(--primary-color)" : "1px solid #f3f4f6",
                                    fontWeight: isDrawer ? 600 : 500,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    transition: 'all 0.2s ease'
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center' }}>
                                        <span style={{ color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: '#9ca3af', fontSize: '0.9rem', width: '16px', fontWeight: 600 }}>#{index + 1}</span>
                                            {player.name} {isMe && <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)' }}>(You)</span>}
                                        </span>
                                        <span style={{ fontWeight: 700, color: "var(--secondary-color)" }}>{player.score}</span>
                                    </div>
                                    {isDrawer && <div style={{ fontSize: '0.8rem', color: 'var(--primary-color)', marginLeft: '24px', fontStyle: 'italic' }}>🖌 Drawing now...</div>}
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Center Column: Game Area */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: '20px'
                }}>

                    {/* Active Target Banner */}
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "var(--border-radius)",
                        padding: "15px 20px",
                        boxShadow: "var(--shadow-sm)",
                        textAlign: 'center',
                        minHeight: '80px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        {gameState.phase === 'round_start' && (
                            <>
                                {socket.id === gameState.drawerId ? (
                                    wordOptions.length > 0 ? (
                                        <div style={{ width: '100%' }}>
                                            <h3 style={{ color: '#374151', marginBottom: '15px' }}>Choose a word to draw:</h3>
                                            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                                                {wordOptions.map(option => (
                                                    <button key={option} onClick={() => {
                                                        setSelectedWord(option);
                                                        socket.emit('word_chosen', { word: option });
                                                    }} style={{ padding: "10px 24px", fontSize: "1.1rem" }}>
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="loader-container"><p style={{ color: '#6b7280', fontSize: '1.2rem', fontStyle: 'italic' }}>Waiting for word options...</p></div>
                                    )
                                ) : (
                                    <div className="loader-container">
                                        <span style={{ color: '#6b7280', fontSize: '1.2rem', fontStyle: 'italic' }}>Waiting for {currentDrawer?.name || "drawer"} to choose a word...</span>
                                    </div>
                                )}
                            </>
                        )}

                        {gameState.phase === 'drawing' && (
                            <>
                                {socket.id === gameState.drawerId ? (
                                    <h3 style={{ fontSize: "1.4rem", color: '#374151', margin: 0 }}>
                                        You are drawing: <span style={{ color: "var(--primary-color)", letterSpacing: "2px", fontWeight: 800, fontSize: '1.8rem', marginLeft: '10px' }}>{selectedWord || "????"}</span>
                                    </h3>
                                ) : (
                                    <h3 style={{ fontSize: "1.4rem", color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center' }}>
                                        WORD <span style={{ letterSpacing: "10px", fontFamily: "monospace", color: '#1f2937', fontSize: '2rem', fontWeight: 800 }}>
                                            {maskedWord.length > 0 ? maskedWord.map(char => char === ' ' ? '\u00A0' : char).join(' ') : (hiddenWordLength ? "_ ".repeat(hiddenWordLength) : "???")}
                                        </span>
                                    </h3>
                                )}
                            </>
                        )}

                        {(gameState.phase === 'lobby' || gameState.phase === 'round_end') && (
                            <h3 style={{ color: '#6b7280', margin: 0, fontStyle: 'italic' }}>Waiting for next round...</h3>
                        )}
                    </div>

                    {/* Canvas/Status Box */}
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "var(--border-radius)",
                        padding: "20px",
                        boxShadow: "var(--shadow-lg)",
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '520px',
                        overflow: 'hidden'
                    }}>
                        {gameState.phase === 'drawing' ? (
                            <CanvasBoard isDrawer={socket.id === gameState.drawerId} />
                        ) : gameState.phase === 'round_end' ? (
                            <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-in' }}>
                                <h2 style={{ fontSize: "2.5rem", color: "var(--primary-color)", margin: "0 0 20px 0" }}>Round Over!</h2>
                                <h3 style={{ fontSize: "1.5rem", color: '#4b5563', margin: 0 }}>
                                    The word was: <div style={{ color: "var(--secondary-color)", fontSize: "3rem", fontWeight: 800, marginTop: '10px', textTransform: 'uppercase', letterSpacing: '2px' }}>{roundEndWord}</div>
                                </h3>
                            </div>
                        ) : (
                            <div style={{ color: '#9ca3af', fontSize: '1.5rem' }}>Game is starting...</div>
                        )}
                    </div>
                </div>

                {/* Right Chat Column */}
                <div style={{ height: 'calc(100vh - 130px)', minHeight: '600px' }}>
                    <ChatBox isDrawer={socket.id === gameState.drawerId} phase={gameState.phase} />
                </div>
            </div>

            {/* Full-screen game over overlay */}
            {gameState.phase === 'game_over' && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    padding: 20,
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: 720,
                        background: 'radial-gradient(circle at top, #f9fafb, #e5e7eb)',
                        borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(15,23,42,0.7)',
                        padding: '32px 32px 28px',
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>🏆</div>
                            <h1 style={{ fontSize: '2.5rem', marginBottom: 4, color: '#111827' }}>Game Over</h1>
                            <p style={{ color: '#6b7280', margin: 0 }}>Great job! Here&apos;s how everyone placed.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 24 }}>
                            {[...gameState.players].sort((a, b) => b.score - a.score).slice(0, 3).map((player, index) => {
                                const placeLabel = index === 0 ? '1st' : index === 1 ? '2nd' : '3rd';
                                const placeColor = index === 0 ? '#facc15' : index === 1 ? '#e5e7eb' : '#fed7aa';
                                return (
                                    <div key={player.id} style={{
                                        padding: '12px 14px',
                                        borderRadius: 18,
                                        backgroundColor: 'white',
                                        boxShadow: 'var(--shadow-md)',
                                        border: index === 0 ? '2px solid rgba(250, 204, 21, 0.7)' : '1px solid rgba(148,163,184,0.5)',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '999px',
                                            margin: '0 auto 6px',
                                            backgroundColor: placeColor,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 800,
                                            fontSize: '0.85rem'
                                        }}>
                                            {placeLabel}
                                        </div>
                                        <div style={{ fontWeight: 700, color: '#111827', marginBottom: 2 }}>{player.name}</div>
                                        <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>{player.score} pts</div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 12,
                        }}>
                            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                                Winner:&nbsp;
                                <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{winner?.name}</span>
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={() => window.location.reload()}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: 999,
                                        backgroundColor: '#e5e7eb',
                                        color: '#111827',
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    Stay Here
                                </button>
                                <button
                                    onClick={() => {
                                        // Navigate everyone back to the lobby for another round
                                        navigate(`/lobby/${roomId}`);
                                    }}
                                    style={{
                                        padding: '10px 22px',
                                        borderRadius: 999,
                                        backgroundColor: 'var(--secondary-color)',
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    Return to Lobby
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .loader-container { display: flex; align-items: center; justify-content: center; height: 100%; width: 100%; }
                @media (max-width: 1024px) {
                    .game-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
