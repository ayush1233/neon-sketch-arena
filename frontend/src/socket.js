import { io } from 'socket.io-client';

// Determine the backend URL based on environment
// In production, if served by the same backend, it will just use '/' (which connects to the same host)
const backendUrl = import.meta.env.VITE_BACKEND_URL 
  ? import.meta.env.VITE_BACKEND_URL 
  : (import.meta.env.PROD ? '/' : 'http://localhost:3001');

// single socket instance shared across the app
const socket = io(backendUrl, { autoConnect: false });

export default socket;
