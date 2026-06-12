const { Server } = require('socket.io');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('subscribe', (datasetId) => {
      socket.join(datasetId);
      console.log(`Socket ${socket.id} subscribed to dataset: ${datasetId}`);
    });

    socket.on('unsubscribe', (datasetId) => {
      socket.leave(datasetId);
      console.log(`Socket ${socket.id} unsubscribed from dataset: ${datasetId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

module.exports = {
  initSocket,
  getIO,
};
