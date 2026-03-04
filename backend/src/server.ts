import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket] A client connected: ${socket.id}`);

  socket.on('ping', () => {
    console.log(`[Socket] Received ping from ${socket.id}, sending pong`);
    socket.emit('pong');
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
