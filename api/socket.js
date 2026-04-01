import { Server } from 'socket.io';
import { docClient, UpdateCommand, QueryCommand } from './db.js'; // ✅ QueryCommand add

let io = null;
const onlineUsers = new Map();

export const initSocket = httpServer => {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', socket => {
    console.log('[Socket] Connected:', socket.id);

    socket.on('user_online', async ({ userId }) => {
      if (!userId) return;
      socket.userId = userId;
      onlineUsers.set(userId, socket.id);
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
      io.emit('online_status_changed', { userId, isOnline: true });
    });

    socket.on('user_activity', async ({ userId }) => {
      if (!userId) return;
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: 'Users',
            Key: { userId },
            UpdateExpression: 'SET lastActiveAt = :now',
            ExpressionAttributeValues: { ':now': new Date().toISOString() },
          }),
        );
      } catch (e) {
        console.error('[Socket] user_activity update failed:', e.message);
      }
    });

    // ✅ join_room — now async + delivers unread messages
    socket.on('join_room', async ({ matchId, userId: roomUserId }) => {
      socket.join(matchId);
      console.log(`[Socket] ${socket.id} joined room: ${matchId}`);

      if (!roomUserId || !matchId) return;

      try {
        // Fetch all 'sent' messages NOT from this user
        const resp = await docClient.send(
          new QueryCommand({
            TableName: 'flame-Messages',
            IndexName: 'matchId-createdAt-index',
            KeyConditionExpression: 'matchId = :matchId',
            FilterExpression: 'senderId <> :uid AND #s = :sent',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: {
              ':matchId': matchId,
              ':uid': roomUserId,
              ':sent': 'sent',
            },
            ProjectionExpression: 'matchId, messageId',
          }),
        );

        if (!resp.Items?.length) return;

        // Batch update to 'delivered'
        await Promise.all(
          resp.Items.map(msg =>
            docClient.send(
              new UpdateCommand({
                TableName: 'flame-Messages',
                Key: { matchId: msg.matchId, messageId: msg.messageId },
                UpdateExpression: 'SET #s = :delivered',
                ExpressionAttributeNames: { '#s': 'status' },
                ExpressionAttributeValues: { ':delivered': 'delivered' },
              }),
            ),
          ),
        );

        // Emit to room so sender updates their UI
        io.to(matchId).emit('messages_delivered', {
          matchId,
          deliveredTo: roomUserId,
          messageIds: resp.Items.map(m => m.messageId),
        });
      } catch (e) {
        console.warn('[Socket] delivered update failed:', e.message);
      }
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

    socket.on('disconnect', async () => {
      const userId = socket.userId;
      if (!userId) return;
      onlineUsers.delete(userId);
      const now = new Date().toISOString();
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: 'Users',
            Key: { userId },
            UpdateExpression: 'SET isOnline = :offline, lastActiveAt = :now',
            ExpressionAttributeValues: { ':offline': false, ':now': now },
          }),
        );
      } catch (e) {
        console.error('[Socket] disconnect DB update failed:', e.message);
      }
      io.emit('online_status_changed', {
        userId,
        isOnline: false,
        lastActiveAt: now,
      });
    });

    socket.on('user_offline', async ({ userId }) => {
      if (!userId) return;
      onlineUsers.delete(userId);
      const now = new Date().toISOString();
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: 'Users',
            Key: { userId },
            UpdateExpression: 'SET isOnline = :offline, lastActiveAt = :now',
            ExpressionAttributeValues: { ':offline': false, ':now': now },
          }),
        );
      } catch (e) {
        console.error('[Socket] user_offline DB update failed:', e.message);
      }
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
export const isUserOnline = userId => onlineUsers.has(userId);
