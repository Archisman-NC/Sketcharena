import { useNavigate } from "react-router-dom";

export default function Home() {
    const navigate = useNavigate();

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>SketchArena</h1>
            <button onClick={() => navigate("/lobby")}>Create Room</button>
            <br /><br />
            <button onClick={() => navigate("/lobby")}>Join Room</button>
        </div>
    );
}
