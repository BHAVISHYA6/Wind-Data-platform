import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

let socket = null;

/**
 * Returns the shared Socket.IO instance, creating it on first call.
 * Uses autoConnect: false so the socket only opens a connection when
 * .connect() is explicitly called (called automatically by socket.io-client
 * when you emit or listen the first time).
 */
export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
};

/**
 * Disconnects and destroys the shared socket instance.
 * Call this when the application unmounts or the user logs out.
 * Safe to call even if the socket was never created.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
