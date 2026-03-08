import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket/socket";

interface Player {
    id: string;
    name: string;
    score: number;
}

interface RoomSettings {
    maxRounds: number;
    drawTime: number;
    wordOptionsCount: number;
    hintsEnabled: boolean;
    maxPlayers: number;
    hintsCount?: number;
}

export default function Lobby() {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const [players, setPlayers] = useState<Player[]>([]);
    const [hostId, setHostId] = useState<string>("");
    const [settings, setSettings] = useState<RoomSettings | null>(null);

    useEffect(() => {
        // Emit rejoin_room to ensure socket is tracking us in the backend room list
        const storedName = localStorage.getItem('sketchArenaName') || 'Player';
        socket.emit("rejoin_room", { roomId, playerName: storedName });

        // Request current players when mounting
        socket.emit("request_room_data", { roomId });

        const handleRoomData = ({ players, hostId, settings }: { players: Player[], hostId: string, settings?: RoomSettings }) => {
            setPlayers(players);
            setHostId(hostId);
            if (settings) setSettings(settings);
        };
        const handlePlayerJoined = ({ players, hostId, settings }: { players: Player[], hostId: string, settings?: RoomSettings }) => {
            setPlayers(players);
            setHostId(hostId);
            if (settings) setSettings(settings);
        };
        const handlePlayerLeft = ({ players, hostId, settings }: { players: Player[], hostId: string, settings?: RoomSettings }) => {
            setPlayers(players);
            setHostId(hostId);
            if (settings) setSettings(settings);
        };
        const handleGameStarted = () => {
            navigate(`/game/${roomId}`);
        };

        socket.on("room_data", handleRoomData);
        socket.on("player_joined", handlePlayerJoined);
        socket.on("player_left", handlePlayerLeft);
        socket.on("game_started", handleGameStarted);

        return () => {
            socket.off("room_data", handleRoomData);
            socket.off("player_joined", handlePlayerJoined);
            socket.off("player_left", handlePlayerLeft);
            socket.off("game_started", handleGameStarted);
        };
    }, [roomId, navigate]);

    const handleStartGame = () => {
        socket.emit("start_game", { roomId });
    };

    const isHost = socket.id === hostId;

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fb 0%, #e0e7ff 100%)', padding: '20px' }}>
            <div style={{
                backgroundColor: 'white',
                padding: '40px',
                borderRadius: 'var(--border-radius)',
                boxShadow: 'var(--shadow-lg)',
                width: '100%',
                maxWidth: '600px',
                textAlign: 'center'
            }}>
                <h2 style={{ fontSize: '2.2rem', marginBottom: '10px', color: '#1f2937', fontWeight: 800 }}>Game Lobby</h2>
                <h3 style={{ color: '#6b7280', marginBottom: '30px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    Room Code: <span style={{ fontFamily: "monospace", letterSpacing: "3px", color: 'var(--primary-color)', fontWeight: 800, background: '#e0e7ff', padding: '6px 16px', borderRadius: '8px', fontSize: '1.2rem' }}>{roomId}</span>
                </h3>

                <div style={{ backgroundColor: '#f9fafb', padding: "24px", border: "1px solid #e5e7eb", borderRadius: "12px", textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.1rem' }}>
                        <span>Connected Players</span>
                        <span style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            {players.length} / {settings?.maxPlayers ?? 8}
                        </span>
                    </h4>

                    {players.length === 0 ? (
                        <p style={{ color: '#6b7280', textAlign: 'center', margin: '30px 0', fontStyle: 'italic' }}>Loading players...</p>
                    ) : (
                        <ul style={{ listStyleType: "none", padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {players.map((player) => (
                                <li key={player.id} style={{
                                    padding: "14px 18px",
                                    backgroundColor: 'white',
                                    border: player.id === socket.id ? "2px solid var(--primary-color)" : "1px solid #e5e7eb",
                                    borderRadius: "8px",
                                    fontSize: "1.05rem",
                                    fontWeight: player.id === socket.id ? 700 : 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    {player.id === hostId && <span title="Host" style={{ fontSize: '1.2rem' }}>👑</span>}
                                    <span style={{ flex: 1, color: '#1f2937' }}>{player.name}</span>
                                    {player.id === socket.id && <span style={{ color: 'var(--primary-color)', fontSize: '0.9rem', backgroundColor: '#e0e7ff', padding: '2px 8px', borderRadius: '4px' }}>You</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {settings && (
                    <div style={{ marginTop: '18px', textAlign: 'left', fontSize: '0.9rem', color: '#4b5563', backgroundColor: '#f9fafb', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Room Settings</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px' }}>
                            <span>Rounds: <strong>{settings.maxRounds}</strong></span>
                            <span>Draw Time: <strong>{settings.drawTime}s</strong></span>
                            <span>Word Options: <strong>{settings.wordOptionsCount}</strong></span>
                            <span>Hints: <strong>{settings.hintsEnabled ? (settings.hintsCount ?? 3) : 0}</strong></span>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: "35px" }}>
                    {isHost ? (
                        <button
                            onClick={handleStartGame}
                            style={{
                                width: '100%',
                                padding: "16px",
                                fontSize: "1.2rem",
                                backgroundColor: "var(--secondary-color)",
                                borderRadius: '12px'
                            }}
                        >
                            Start Game
                        </button>
                    ) : (
                        <div style={{
                            color: '#4b5563',
                            padding: '16px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '12px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}>
                            <span className="loader" style={{ width: '16px', height: '16px', border: '2px solid #9ca3af', borderBottomColor: 'transparent', borderRadius: '50%', display: 'inline-block', boxSizing: 'border-box', animation: 'rotation 1s linear infinite' }}></span>
                            Waiting for host to start...
                        </div>
                    )}
                </div>
            </div>

            <style>
                {`
                @keyframes rotation {
                    0% { transform: rotate(0deg) }
                    100% { transform: rotate(360deg) }
                }
                `}
            </style>
        </div>
    );
}
