import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket/socket";

export default function Home() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [roomId, setRoomId] = useState("");

    const handleCreateRoom = () => {
        if (!name.trim()) return alert("Please enter a name");

        socket.once("room_created", ({ roomId }) => {
            navigate(`/lobby/${roomId}`);
        });

        socket.emit("create_room", { playerName: name });
    };

    const handleJoinRoom = () => {
        if (!name.trim() || !roomId.trim()) return alert("Please enter name and room ID");

        socket.emit("join_room", { roomId, playerName: name });
        navigate(`/lobby/${roomId}`);
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>SketchArena</h1>
            <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: "8px", margin: "5px" }}
            />
            <br /><br />
            <button onClick={handleCreateRoom} style={{ padding: "10px 20px" }}>Create Room</button>
            <br /><br />
            <hr style={{ width: "200px" }} />
            <br />
            <input
                type="text"
                placeholder="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                style={{ padding: "8px", margin: "5px", textTransform: "uppercase" }}
            />
            <br /><br />
            <button onClick={handleJoinRoom} style={{ padding: "10px 20px" }}>Join Room</button>
        </div>
    );
}
