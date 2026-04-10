/**
 * Chat Routes - In Flame
 *
 * GET  /matches              → Match list with last message
 * GET  /messages/:matchId    → Paginated messages
 * POST /messages             → Send text message
 * POST /messages/media       → Send image/video (S3 presigned)
 * PUT  /messages/read        → Mark messages as read
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  docClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  BatchGetCommand,
} from './db.js';
import { s3Client } from './db.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { authenticate } from './authenticate.js';
import { getIO } from './socket.js';

const router = express.Router();

// ════════════════════════════════════════════════════════════════════════════
// GET /matches — Match list with last message + other user info
// ════════════════════════════════════════════════════════════════════════════

router.get('/matches', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 20 } = req.query;
    const parsedLimit = Math.min(parseInt(limit), 50);

    // ── 1. Query both user1Id + user2Id GSIs ──
    const [user1Resp, user2Resp] = await Promise.all([
      docClient.send(
        new QueryCommand({
          TableName: 'flame-Matches',
          IndexName: 'user1Id-index',
          KeyConditionExpression: 'user1Id = :userId',
          ExpressionAttributeValues: { ':userId': userId },
          ScanIndexForward: false,
        }),
      ),
      docClient.send(
        new QueryCommand({
          TableName: 'flame-Matches',
          IndexName: 'user2Id-index',
          KeyConditionExpression: 'user2Id = :userId',
          ExpressionAttributeValues: { ':userId': userId },
          ScanIndexForward: false,
        }),
      ),
    ]);

    // ── 2. Merge + dedupe by matchId + sort ──
    const seen = new Set();
    const allMatches = [
      ...(user1Resp.Items || []).map(m => ({ ...m, otherUserId: m.user2Id })),
      ...(user2Resp.Items || []).map(m => ({ ...m, otherUserId: m.user1Id })),
    ]
      .filter(m => {
        // ✅ Same matchId duplicate hatao
        if (seen.has(m.matchId)) return false;
        seen.add(m.matchId);
        return true;
      })
      .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
      .slice(0, parsedLimit);

    if (allMatches.length === 0) {
      return res.status(200).json({ success: true, matches: [] });
    }

    // ── 3. Batch fetch other users ──
    const otherUserIds = [
      ...new Set(allMatches.map(m => m.otherUserId).filter(Boolean)),
    ];
    const batchResp = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          Users: {
            Keys: otherUserIds.map(id => ({ userId: id })),
            ProjectionExpression: 'userId, firstName, imageUrls',
          },
        },
      }),
    );

    if (otherUserIds.length === 0) {
      return res.status(200).json({ success: true, matches: [] });
    }

    const userMap = {};
    (batchResp.Responses?.Users || []).forEach(u => {
      userMap[u.userId] = u;
    });

    // ── 4. Fetch unread counts ──
    const unreadCounts = await Promise.all(
      allMatches.map(async match => {
        try {
          const resp = await docClient.send(
            new QueryCommand({
              TableName: 'flame-Messages',
              IndexName: 'matchId-createdAt-index',
              KeyConditionExpression: 'matchId = :matchId',
              FilterExpression: 'senderId <> :userId AND #s <> :read',
              ExpressionAttributeNames: { '#s': 'status' },
              ExpressionAttributeValues: {
                ':matchId': match.matchId,
                ':userId': userId,
                ':read': 'read',
              },
              Select: 'COUNT',
            }),
          );
          return { matchId: match.matchId, count: resp.Count || 0 };
        } catch {
          return { matchId: match.matchId, count: 0 };
        }
      }),
    );

    const unreadMap = {};
    unreadCounts.forEach(u => {
      unreadMap[u.matchId] = u.count;
    });

    // ── 5. Format ──
    const formatted = allMatches.map(m => ({
      matchId: m.matchId,
      userId: m.otherUserId,
      name: userMap[m.otherUserId]?.firstName || 'User',
      image: userMap[m.otherUserId]?.imageUrls?.[0] || null,
      lastMessage: m.lastMessage?.text || '👋 New match!',
      lastMessageAt: m.lastMessageAt,
      unreadCount: unreadMap[m.matchId] || 0,
      createdAt: m.createdAt,
    }));

    return res.status(200).json({ success: true, matches: formatted });
  } catch (err) {
    console.error('[/matches] Error:', err.message);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch matches' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /messages/:matchId — Paginated messages
// ════════════════════════════════════════════════════════════════════════════

router.get('/messages/:matchId', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { matchId } = req.params;
    const { limit = 30, cursor } = req.query;
    const parsedLimit = Math.min(parseInt(limit), 100);

    const params = {
      TableName: 'flame-Messages',
      IndexName: 'matchId-createdAt-index',
      KeyConditionExpression: 'matchId = :matchId',
      ExpressionAttributeValues: { ':matchId': matchId },
      Limit: parsedLimit,
      ScanIndexForward: false, // Latest first
    };

    if (cursor) {
      try {
        params.ExclusiveStartKey = JSON.parse(
          Buffer.from(cursor, 'base64').toString(),
        );
      } catch {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid cursor' });
      }
    }

    const resp = await docClient.send(new QueryCommand(params));
    const messages = (resp.Items || []).reverse().map(msg => {
      // Flat replyTo fields → nested object
      if (msg.replyToId) {
        msg.replyTo = {
          messageId: msg.replyToId,
          senderId: msg.replyToSenderId || '',
          senderName: msg.replyToSenderName || '',
          type: msg.replyToType || 'text',
          content: msg.replyToContent || '',
        };
      }
      return msg;
    });

    const nextCursor = resp.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(resp.LastEvaluatedKey)).toString('base64')
      : null;

    return res.status(200).json({
      success: true,
      messages,
      nextCursor,
    });
  } catch (err) {
    console.error('[/messages/:matchId] Error:', err.message);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch messages' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /messages — Send text message
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// POST /messages — Send text message (replyTo denormalized add kiya)
// ════════════════════════════════════════════════════════════════════════════

router.post('/messages', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { matchId, content, type = 'text', replyTo } = req.body;

    if (!matchId || !content) {
      return res
        .status(400)
        .json({ success: false, error: 'matchId and content required' });
    }

    const matchResp = await docClient.send(
      new GetCommand({
        TableName: 'flame-Matches',
        Key: { matchId },
      }),
    );
    if (!matchResp.Item)
      return res.status(404).json({ success: false, error: 'Match not found' });
    const match = matchResp.Item;
    if (match.user1Id !== userId && match.user2Id !== userId)
      return res.status(403).json({ success: false, error: 'Not authorized' });

    const messageId = uuidv4();
    const now = new Date().toISOString();

    const message = {
      messageId,
      matchId,
      senderId: userId,
      type,
      content,
      status: 'sent',
      createdAt: now,
    };
    if (type === 'audio') {
      if (req.body.audioDuration) message.duration = req.body.audioDuration;
      if (req.body.audioWaveform) message.waveform = req.body.audioWaveform;
    }

    // ── Denormalize replyTo so it survives DB round-trip ──
    if (replyTo?.messageId) {
      message.replyToId = replyTo.messageId;
      message.replyToSenderId = replyTo.senderId || '';
      message.replyToSenderName = replyTo.senderName || '';
      message.replyToType = replyTo.type || 'text';
      message.replyToContent =
        replyTo.type === 'image'
          ? '📷 Photo'
          : replyTo.type === 'video'
          ? '🎥 Video'
          : (replyTo.content || '').slice(0, 120);
    }

    await docClient.send(
      new PutCommand({ TableName: 'flame-Messages', Item: message }),
    );

    const displayText =
      type === 'image' ? '📷 Photo' : type === 'video' ? '🎥 Video' : content;
    await docClient.send(
      new UpdateCommand({
        TableName: 'flame-Matches',
        Key: { matchId },
        UpdateExpression: 'SET lastMessage = :msg, lastMessageAt = :now',
        ExpressionAttributeValues: {
          ':msg': { text: displayText, senderId: userId, timestamp: now },
          ':now': now,
        },
      }),
    );

    // Reconstruct nested replyTo for socket + response
    const formatted = { ...message };
    if (message.replyToId) {
      formatted.replyTo = {
        messageId: message.replyToId,
        senderId: message.replyToSenderId,
        senderName: message.replyToSenderName,
        type: message.replyToType,
        content: message.replyToContent,
      };
      // keep flat fields too (FE uses both)
    }

    getIO().to(matchId).emit('new_message', formatted);
    return res.status(200).json({ success: true, message: formatted });
  } catch (err) {
    console.error('[POST /messages] Error:', err.message);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to send message' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /messages/media — Get S3 presigned URL for image/video
// ════════════════════════════════════════════════════════════════════════════

router.post('/messages/media', authenticate, async (req, res) => {
  try {
    const { matchId, fileType, mediaType = 'image' } = req.body;

    if (!matchId || !fileType) {
      return res
        .status(400)
        .json({ success: false, error: 'matchId and fileType required' });
    }

    const ext = fileType.split('/')[1] || 'jpg';
    const key = `chats/${matchId}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: 'flameapp-user-images',
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 120 });
    const publicUrl = `https://flameapp-user-images.s3.ap-south-1.amazonaws.com/${key}`;

    return res
      .status(200)
      .json({ success: true, uploadUrl, publicUrl, mediaType });
  } catch (err) {
    console.error('[/messages/media] Error:', err.message);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to generate upload URL' });
  }
});
// POST /messages/audio — presigned URL for voice
router.post('/messages/audio', authenticate, async (req, res) => {
  try {
    const { matchId, duration, waveform, fileType = 'audio/m4a' } = req.body;
    if (!matchId)
      return res
        .status(400)
        .json({ success: false, error: 'matchId required' });

    const ext = fileType.includes('mp4') ? 'mp4' : 'm4a';
    const key = `chats/${matchId}/audio_${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: 'flameapp-user-images',
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 120 });
    const publicUrl = `https://flameapp-user-images.s3.ap-south-1.amazonaws.com/${key}`;

    return res.status(200).json({ success: true, uploadUrl, publicUrl });
  } catch (err) {
    console.error('[POST /messages/audio]', err.message);
    return res.status(500).json({ success: false, error: 'Failed' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUT /messages/read — Mark all messages in matchId as read
// ════════════════════════════════════════════════════════════════════════════

router.put('/messages/read', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { matchId } = req.body;

    if (!matchId) {
      return res
        .status(400)
        .json({ success: false, error: 'matchId required' });
    }

    // Fetch unread messages from other user
    const resp = await docClient.send(
      new QueryCommand({
        TableName: 'flame-Messages',
        IndexName: 'matchId-createdAt-index',
        KeyConditionExpression: 'matchId = :matchId',
        FilterExpression: 'senderId <> :userId AND #s <> :read',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':matchId': matchId,
          ':userId': userId,
          ':read': 'read',
        },
      }),
    );

    // Update each message status
    // PUT /messages/read mein fix karo
    await Promise.all(
      (resp.Items || []).map(msg =>
        docClient.send(
          new UpdateCommand({
            TableName: 'flame-Messages',
            Key: {
              matchId: msg.matchId,
              messageId: msg.messageId, // ✅ Sort key bhi chahiye
            },
            UpdateExpression: 'SET #s = :read',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':read': 'read' },
          }),
        ),
      ),
    );

    // Emit read receipt
    getIO().to(matchId).emit('messages_read', { matchId, readBy: userId });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[PUT /messages/read] Error:', err.message);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to mark as read' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PATCH /messages/react — Add/toggle emoji reaction
// ════════════════════════════════════════════════════════════════════════════

router.patch('/messages/react', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { messageId, matchId, emoji } = req.body;

    if (!messageId || !matchId) {
      return res
        .status(400)
        .json({ success: false, error: 'messageId and matchId required' });
    }

    // Fetch current reactions
    const msgResp = await docClient.send(
      new GetCommand({
        TableName: 'flame-Messages',
        Key: { matchId, messageId },
        ProjectionExpression: 'reactions',
      }),
    );

    if (!msgResp.Item) {
      return res
        .status(404)
        .json({ success: false, error: 'Message not found' });
    }

    const current = msgResp.Item.reactions || {};
    const updated = { ...current };

    // Toggle: same emoji = remove, different = set
    if (!emoji || current[userId] === emoji) {
      delete updated[userId];
    } else {
      updated[userId] = emoji;
    }

    await docClient.send(
      new UpdateCommand({
        TableName: 'flame-Messages',
        Key: { matchId, messageId },
        UpdateExpression: 'SET reactions = :rx',
        ExpressionAttributeValues: { ':rx': updated },
      }),
    );

    // Broadcast to room
    getIO()
      .to(matchId)
      .emit('message_reacted', { messageId, matchId, reactions: updated });

    return res.status(200).json({ success: true, reactions: updated });
  } catch (err) {
    console.error('[PATCH /messages/react] Error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to react' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE /messages/:messageId — deletedAt emit fix
// ════════════════════════════════════════════════════════════════════════════

router.delete('/messages/:messageId', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { messageId } = req.params;
    const { matchId } = req.body;

    if (!matchId)
      return res
        .status(400)
        .json({ success: false, error: 'matchId required' });

    const msgResp = await docClient.send(
      new GetCommand({
        TableName: 'flame-Messages',
        Key: { matchId, messageId },
      }),
    );
    if (!msgResp.Item)
      return res
        .status(404)
        .json({ success: false, error: 'Message not found' });
    if (msgResp.Item.senderId !== userId)
      return res.status(403).json({ success: false, error: 'Not authorized' });

    const now = new Date().toISOString();

    await docClient.send(
      new UpdateCommand({
        TableName: 'flame-Messages',
        Key: { matchId, messageId },
        UpdateExpression:
          'SET #type = :deleted, content = :placeholder, deletedAt = :now',
        ExpressionAttributeNames: { '#type': 'type' },
        ExpressionAttributeValues: {
          ':deleted': 'deleted',
          ':placeholder': 'This message was deleted',
          ':now': now,
        },
      }),
    );

    // ── deletedAt bhi emit karo (FE timestamp dikhayega) ──
    getIO()
      .to(matchId)
      .emit('message_deleted', { messageId, matchId, deletedAt: now });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[DELETE /messages/:messageId]', err.message);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to delete message' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PATCH /messages/edit — originalContent emit fix
// ════════════════════════════════════════════════════════════════════════════

router.patch('/messages/edit', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { messageId, matchId, content } = req.body;

    if (!messageId || !matchId || !content?.trim())
      return res.status(400).json({
        success: false,
        error: 'messageId, matchId, content required',
      });

    const msgResp = await docClient.send(
      new GetCommand({
        TableName: 'flame-Messages',
        Key: { matchId, messageId },
      }),
    );
    if (!msgResp.Item)
      return res
        .status(404)
        .json({ success: false, error: 'Message not found' });
    if (msgResp.Item.senderId !== userId)
      return res.status(403).json({ success: false, error: 'Not authorized' });

    const now = new Date().toISOString();
    // if_not_exists → first originalContent preserved always
    const originalContent =
      msgResp.Item.originalContent || msgResp.Item.content;

    await docClient.send(
      new UpdateCommand({
        TableName: 'flame-Messages',
        Key: { matchId, messageId },
        UpdateExpression:
          'SET content = :content, isEdited = :edited, editedAt = :now, originalContent = if_not_exists(originalContent, :orig)',
        ExpressionAttributeValues: {
          ':content': content.trim(),
          ':edited': true,
          ':now': now,
          ':orig': msgResp.Item.content,
        },
      }),
    );

    // ── originalContent bhi emit karo ──
    getIO().to(matchId).emit('message_edited', {
      messageId,
      matchId,
      content: content.trim(),
      isEdited: true,
      editedAt: now,
      originalContent, // ← yahi missing tha
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[PATCH /messages/edit]', err.message);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to edit message' });
  }
});

export default router;
