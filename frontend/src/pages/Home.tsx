import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket/socket";

export default function Home() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [roomId, setRoomId] = useState("");
    const [rounds, setRounds] = useState<number>(3);
    const [drawTime, setDrawTime] = useState<number>(60);
    const [wordOptionsCount, setWordOptionsCount] = useState<number>(3);
    const [hintsEnabled, setHintsEnabled] = useState<boolean>(true);
    const [hintsCount, setHintsCount] = useState<number>(3);
    const [maxPlayers, setMaxPlayers] = useState<number>(8);
    const [isPublic, setIsPublic] = useState<boolean>(true);

    const handleCreateRoom = () => {
        if (!name.trim()) return alert("Please enter a name");
        localStorage.setItem('sketchArenaName', name);

        socket.once("room_created", ({ roomId }) => {
            navigate(`/lobby/${roomId}`);
        });

        socket.emit("create_room", {
            playerName: name,
            settings: {
                maxRounds: rounds,
                drawTime,
                wordOptionsCount,
                hintsEnabled,
                hintsCount,
                maxPlayers,
                isPublic,
            }
        });
    };

    const handleJoinRoom = () => {
        if (!name.trim() || !roomId.trim()) return alert("Please enter name and room ID");
        localStorage.setItem('sketchArenaName', name);

        socket.emit("join_room", { roomId, playerName: name });
        navigate(`/lobby/${roomId}`);
    };

    const handleJoinRandomPublicRoom = () => {
        if (!name.trim()) return alert("Please enter a name");
        localStorage.setItem('sketchArenaName', name);

        socket.once("joined_room", ({ roomId }) => {
            navigate(`/lobby/${roomId}`);
        });

        socket.emit("join_random_room", { playerName: name });
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fb 0%, #e0e7ff 100%)' }}>
            <div style={{
                backgroundColor: 'white',
                padding: '40px',
                borderRadius: 'var(--border-radius)',
                boxShadow: 'var(--shadow-lg)',
                width: '100%',
                maxWidth: '450px',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: '2.8rem',
                    marginBottom: '30px',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #ec4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>SketchArena</h1>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <input
                        type="text"
                        placeholder="Choose a Nickname"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ width: '100%', fontSize: '1.1rem', boxSizing: 'border-box' }}
                    />

                    <button onClick={handleCreateRoom} style={{ width: '100%', fontSize: '1.2rem', padding: '14px' }}>
                        Create New Room
                    </button>

                    <div style={{ marginTop: '4px', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280', backgroundColor: '#f9fafb', padding: '14px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Room Settings (Host)</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                                <input
                                    type="checkbox"
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                    style={{ width: '14px', height: '14px', boxShadow: 'none' }}
                                />
                                <span>Public Room</span>
                            </label>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span>Rounds</span>
                                <input
                                    type="number"
                                    min={2}
                                    max={10}
                                    value={rounds}
                                    onChange={(e) => setRounds(Math.min(10, Math.max(2, Number(e.target.value) || 2)))}
                                />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span>Draw Time (s)</span>
                                <input
                                    type="number"
                                    min={15}
                                    max={240}
                                    value={drawTime}
                                    onChange={(e) => setDrawTime(Math.min(240, Math.max(15, Number(e.target.value) || 60)))}
                                />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span>Word Options</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={wordOptionsCount}
                                    onChange={(e) => setWordOptionsCount(Math.min(5, Math.max(1, Number(e.target.value) || 3)))}
                                />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span>Max Players</span>
                                <input
                                    type="number"
                                    min={2}
                                    max={20}
                                    value={maxPlayers}
                                    onChange={(e) => setMaxPlayers(Math.min(20, Math.max(2, Number(e.target.value) || 8)))}
                                />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span>Hints (0–5)</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={5}
                                    value={hintsCount}
                                    onChange={(e) => setHintsCount(Math.min(5, Math.max(0, Number(e.target.value) || 0)))}
                                />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: '6px' }}>
                                <input
                                    type="checkbox"
                                    checked={hintsEnabled}
                                    onChange={(e) => setHintsEnabled(e.target.checked)}
                                    style={{ width: '16px', height: '16px', boxShadow: 'none' }}
                                />
                                <span>Enable Hints</span>
                            </label>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                        <span style={{ margin: '0 15px', color: '#6b7280', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '1px' }}>OR JOIN EXISTING</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                            onClick={handleJoinRandomPublicRoom}
                            style={{ width: '100%', fontSize: '1rem', padding: '10px', backgroundColor: '#e0e7ff', color: '#111827' }}
                        >
                            Quick Join Public Room
                        </button>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                placeholder="Room Code"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                style={{ flex: 1, textTransform: "uppercase", fontSize: '1.1rem', letterSpacing: '2px', textAlign: 'center' }}
                                maxLength={6}
                            />
                            <button
                                onClick={handleJoinRoom}
                                style={{ backgroundColor: 'var(--secondary-color)', fontSize: '1.1rem', padding: '0 25px' }}
                            >
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
