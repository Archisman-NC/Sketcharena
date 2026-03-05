import { io } from 'socket.io-client';

// Prefer environment-based backend URL for deployment, with a sensible localhost fallback.
const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const socket = io(URL, {
    autoConnect: false,
});

socket.on('connect', () => {
    console.log(`Connected to server with socket ID: ${socket.id}`);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});
