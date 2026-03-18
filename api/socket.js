// api/socket.js
import { Server } from 'socket.io';

let io = null;

export const initSocket = httpServer => {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', socket => {
    console.log('[Socket] Connected:', socket.id);

    socket.on('join_room', ({ matchId }) => {
      socket.join(matchId);
      console.log(`[Socket] ${socket.id} joined room: ${matchId}`);
    });

    socket.on('leave_room', ({ matchId }) => {
      socket.leave(matchId);
    });

    socket.on('typing', ({ matchId, userId }) => {
      socket.to(matchId).emit('user_typing', { userId });
    });

    socket.on('stop_typing', ({ matchId, userId }) => {
      socket.to(matchId).emit('user_stop_typing', { userId });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
