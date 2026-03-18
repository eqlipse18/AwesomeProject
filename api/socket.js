import { Server } from 'socket.io';
import { docClient, UpdateCommand } from './db.js';

let io = null;

// ── Online users in-memory map ──
const onlineUsers = new Map(); // userId → socketId

export const initSocket = httpServer => {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', socket => {
    console.log('[Socket] Connected:', socket.id);

    // ── User comes online ──
    socket.on('user_online', async ({ userId }) => {
      if (!userId) return;

      socket.userId = userId;
      onlineUsers.set(userId, socket.id);

      console.log(`[Socket] User online: ${userId}`);

      // ✅ Update DB
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: 'Users',
            Key: { userId },
            UpdateExpression: 'SET isOnline = :online, lastActiveAt = :now',
            ExpressionAttributeValues: {
              ':online': true,
              ':now': new Date().toISOString(),
            },
          }),
        );
      } catch (e) {
        console.error('[Socket] user_online DB update failed:', e.message);
      }

      // ✅ Broadcast to everyone
      io.emit('online_status_changed', { userId, isOnline: true });
    });

    // ── User activity ping (every 60s) ──
    socket.on('user_activity', async ({ userId }) => {
      if (!userId) return;
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: 'Users',
            Key: { userId },
            UpdateExpression: 'SET lastActiveAt = :now',
            ExpressionAttributeValues: {
              ':now': new Date().toISOString(),
            },
          }),
        );
      } catch (e) {
        console.error('[Socket] user_activity update failed:', e.message);
      }
    });

    // ── Room join/leave ──
    socket.on('join_room', ({ matchId }) => {
      socket.join(matchId);
      console.log(`[Socket] ${socket.id} joined room: ${matchId}`);
    });

    socket.on('leave_room', ({ matchId }) => {
      socket.leave(matchId);
    });

    // ── Typing ──
    socket.on('typing', ({ matchId, userId }) => {
      socket.to(matchId).emit('user_typing', { userId });
    });

    socket.on('stop_typing', ({ matchId, userId }) => {
      socket.to(matchId).emit('user_stop_typing', { userId });
    });

    // ── Disconnect ──
    socket.on('disconnect', async () => {
      const userId = socket.userId;
      console.log(`[Socket] Disconnected: ${socket.id}, userId: ${userId}`);

      if (!userId) return;

      onlineUsers.delete(userId);

      const now = new Date().toISOString();

      // ✅ Update DB — offline
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: 'Users',
            Key: { userId },
            UpdateExpression: 'SET isOnline = :offline, lastActiveAt = :now',
            ExpressionAttributeValues: {
              ':offline': false,
              ':now': now,
            },
          }),
        );
      } catch (e) {
        console.error('[Socket] disconnect DB update failed:', e.message);
      }

      // ✅ Broadcast offline
      io.emit('online_status_changed', {
        userId,
        isOnline: false,
        lastActiveAt: now,
      });
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// ✅ Check if user is online
export const isUserOnline = userId => onlineUsers.has(userId);
