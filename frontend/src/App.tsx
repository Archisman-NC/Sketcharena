import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import { socket } from "./socket/socket";

function App() {
  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      // emitting ping to test server connection
      socket.emit("ping");
    });

    socket.on("pong", () => {
      console.log("Received pong from server");
    });

    return () => {
      socket.off("connect");
      socket.off("pong");
      socket.disconnect();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:roomId" element={<Lobby />} />
        <Route path="/game/:roomId" element={<Game />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}

export default App;
