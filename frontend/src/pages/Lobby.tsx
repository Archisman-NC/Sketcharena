import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket/socket";

interface Player {
    id: string;
    name: string;
    score: number;
}

export default function Lobby() {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const [players, setPlayers] = useState<Player[]>([]);
    const [hostId, setHostId] = useState<string>("");

    useEffect(() => {
        // Request current players when mounting
        socket.emit("request_room_data", { roomId });

        const handleRoomData = ({ players, hostId }: { players: Player[], hostId: string }) => {
            setPlayers(players);
            setHostId(hostId);
        };
        const handlePlayerJoined = ({ players, hostId }: { players: Player[], hostId: string }) => {
            setPlayers(players);
            setHostId(hostId);
        };
        const handlePlayerLeft = ({ players, hostId }: { players: Player[], hostId: string }) => {
            setPlayers(players);
            setHostId(hostId);
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
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h2>Lobby</h2>
            <h3>Room ID: <span style={{ fontFamily: "monospace", letterSpacing: "2px" }}>{roomId}</span></h3>

            <div style={{ marginTop: "30px", padding: "20px", border: "1px solid #ccc", display: "inline-block", borderRadius: "8px", minWidth: "300px" }}>
                <h4>Players in Room ({players.length})</h4>
                {players.length === 0 ? (
                    <p>Loading...</p>
                ) : (
                    <ul style={{ listStyleType: "none", padding: 0 }}>
                        {players.map((player) => (
                            <li key={player.id} style={{ padding: "8px", borderBottom: "1px solid #eee", fontSize: "18px" }}>
                                {player.id === hostId ? "👑 " : ""} {player.name} {player.id === socket.id ? "(You)" : ""}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div style={{ marginTop: "30px" }}>
                {isHost ? (
                    <button
                        onClick={handleStartGame}
                        style={{ padding: "12px 24px", fontSize: "16px", cursor: "pointer", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px" }}
                    >
                        Start Game
                    </button>
                ) : (
                    <p>Waiting for host to start the game...</p>
                )}
            </div>
        </div>
    );
}
