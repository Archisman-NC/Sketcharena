import { io } from 'socket.io-client';

const URL = 'http://localhost:3000';

export const socket = io(URL, {
    autoConnect: false,
});

socket.on('connect', () => {
    console.log(`Connected to server with socket ID: ${socket.id}`);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});
