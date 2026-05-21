/**
 * requestRoutes.js
 * Table: MatchRequest (PK: requestId, SK: createdAt)
 *
 * GSIs available:
 *  receiverId-createdAt-index  → received requests
 *  senderId-createdAt-index    → sent requests
 *  senderId-receiverId-index   → duplicate check
 *  superliked-status-index     → superlike queries (receiverId alias)
 *  superliker-status-index     → superliker queries (senderId alias)
 *
 * Schema uses BOTH field sets for GSI compatibility:
 *  senderId    = superliker  (same person)
 *  receiverId  = superliked  (same person)
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  docClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from './db.js';
import { authenticate } from './authenticate.js';
import { getIO } from './socket.js';
import {
  checkSubscriptionStatus,
  checkFeatureLimit,
  incrementUsage,
} from './subscriptionHelpers.js';

const router = express.Router();
const TABLE = 'MatchRequests'; // exact table name

// ════════════════════════════════════════════════════════════════════════════
// POST /requests/send
// Called from: superlike swipe + UserProfileScreen button
// ════════════════════════════════════════════════════════════════════════════
router.post('/send', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { targetUserId, fromSuperlike = false } = req.body;

    if (!targetUserId)
      return res
        .status(400)
        .json({ success: false, error: 'targetUserId required' });
    if (userId === targetUserId)
      return res
        .status(400)
        .json({ success: false, error: 'Cannot request yourself' });

    // ── 🔒 PREMIUM GATE ───────────────────────────────────────────────────
    const sub = await checkSubscriptionStatus(userId);

    if (!sub.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Flame Plus required to send message requests',
        requiresPremium: true,
      });
    }

    // Plus: 1/day limit check
    if (sub.type === 'Plus') {
      const limit = await checkFeatureLimit(userId, 'messageRequests', sub);
      if (!limit.allowed) {
        return res.status(403).json({
          success: false,
          error: 'Daily message request limit reached (1/day for Plus)',
          limitReached: true,
          remaining: 0,
          upgradeToUltra: true, // ← frontend upsell ke liye
        });
      }
    }
    // Ultra: unlimited — no check
    // ─────────────────────────────────────────────────────────────────────

    // ── Duplicate check ───────────────────────────────────────────────────
    const dupCheck = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'senderId-receiverId-index',
        KeyConditionExpression: 'senderId = :s AND receiverId = :r',
        FilterExpression: '#st = :p',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: {
          ':s': userId,
          ':r': targetUserId,
          ':p': 'pending',
        },
        Limit: 1,
      }),
    );

    if (dupCheck.Items?.length > 0) {
      return res.status(200).json({
        success: true,
        alreadySent: true,
        requestId: dupCheck.Items[0].requestId,
      });
    }

    // ── Fetch sender profile ─────────────────────────────────────────────
    const senderResp = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId },
        ProjectionExpression: 'userId, firstName, imageUrls',
      }),
    );
    const sender = senderResp.Item || {};

    const requestId = uuidv4();
    const now = new Date().toISOString();

    // ── Save request ─────────────────────────────────────────────────────
    // Uses BOTH field sets so all 5 GSIs work
    await docClient.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          requestId,
          createdAt: now,
          updatedAt: now,
          status: 'pending',
          fromSuperlike,

          // senderId/receiverId — for receiverId-createdAt-index, senderId-createdAt-index, senderId-receiverId-index
          senderId: userId,
          receiverId: targetUserId,

          // superliker/superliked — for superliker-status-index, superliked-status-index
          superliker: userId,
          superliked: targetUserId,

          // Denormalized sender info
          senderName: sender.firstName || '',
          senderImage: sender.imageUrls?.[0] || '',
        },
      }),
    );

    if (sub.type === 'Plus') {
      await incrementUsage(userId, 'messageRequests', sub.type);
    }

    // ── Real-time notify receiver ────────────────────────────────────────
    try {
      getIO()
        .to(targetUserId)
        .emit('message_request_received', {
          requestId,
          senderId: userId,
          senderName: sender.firstName || '',
          senderImage: sender.imageUrls?.[0] || '',
          fromSuperlike,
          createdAt: now,
          status: 'pending',
        });
    } catch (e) {
      console.warn('[requests/send] socket emit:', e.message);
    }

    return res.status(201).json({ success: true, requestId });
  } catch (err) {
    console.error('[POST /requests/send]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /requests/received  — User B: incoming pending requests
// ════════════════════════════════════════════════════════════════════════════
router.get('/received', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'receiverId-createdAt-index',
        KeyConditionExpression: 'receiverId = :r',
        FilterExpression: '#st = :p',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':r': userId, ':p': 'pending' },
        ScanIndexForward: false,
      }),
    );

    const requests = result.Items || [];

    // Enrich with live sender profile
    const enriched = await Promise.all(
      requests.map(async r => {
        try {
          const s = await docClient.send(
            new GetCommand({
              TableName: 'Users',
              Key: { userId: r.senderId },
              ProjectionExpression:
                'userId, firstName, imageUrls, isOnline, lastActiveAt, ageForSort, bio',
            }),
          );
          const u = s.Item || {};
          return {
            ...r,
            senderName: u.firstName || r.senderName || '',
            senderImage: u.imageUrls?.[0] || r.senderImage || '',
            senderAge: u.ageForSort || null,
            senderBio: u.bio || '',
            senderIsOnline: u.isOnline || false,
            senderLastActive: u.lastActiveAt || null,
          };
        } catch {
          return r;
        }
      }),
    );

    return res.status(200).json({
      success: true,
      requests: enriched,
      total: enriched.length,
    });
  } catch (err) {
    console.error('[GET /requests/received]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /requests/sent  — User A: requests they sent + status
// ════════════════════════════════════════════════════════════════════════════
router.get('/sent', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'senderId-createdAt-index',
        KeyConditionExpression: 'senderId = :s',
        ExpressionAttributeValues: { ':s': userId },
        ScanIndexForward: false,
      }),
    );

    const requests = result.Items || [];

    // Enrich with receiver profile
    const enriched = await Promise.all(
      requests.map(async r => {
        try {
          const u = await docClient.send(
            new GetCommand({
              TableName: 'Users',
              Key: { userId: r.receiverId },
              ProjectionExpression: 'userId, firstName, imageUrls',
            }),
          );
          const user = u.Item || {};
          return {
            ...r,
            receiverName: user.firstName || '',
            receiverImage: user.imageUrls?.[0] || '',
          };
        } catch {
          return r;
        }
      }),
    );

    return res.status(200).json({ success: true, requests: enriched });
  } catch (err) {
    console.error('[GET /requests/sent]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /requests/accept  — User B accepts
// ════════════════════════════════════════════════════════════════════════════
router.post('/accept', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { requestId, createdAt } = req.body;

    if (!requestId || !createdAt)
      return res
        .status(400)
        .json({ success: false, error: 'requestId and createdAt required' });

    const reqResp = await docClient.send(
      new GetCommand({
        TableName: TABLE,
        Key: { requestId, createdAt },
      }),
    );

    const request = reqResp.Item;
    if (!request)
      return res
        .status(404)
        .json({ success: false, error: 'Request not found' });
    if (request.receiverId !== userId)
      return res.status(403).json({ success: false, error: 'Not authorized' });
    if (request.status !== 'pending')
      return res
        .status(400)
        .json({ success: false, error: 'Already processed' });

    const now = new Date().toISOString();
    const matchId = uuidv4();

    // ── Update request → accepted ────────────────────────────────────────
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { requestId, createdAt },
        UpdateExpression: 'SET #st = :a, updatedAt = :now, matchId = :mid',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: {
          ':a': 'accepted',
          ':now': now,
          ':mid': matchId,
        },
      }),
    );

    // ── Create match ─────────────────────────────────────────────────────
    await docClient.send(
      new PutCommand({
        TableName: 'flame-Matches',
        Item: {
          matchId,
          user1Id: request.senderId,
          user2Id: userId,
          chatEnabled: true,
          createdAt: now,
          lastMessageAt: now,
          lastMessage: {
            text: '👋 New match!',
            senderId: 'system',
            timestamp: now,
          },
          fromRequest: true,
          requestId,
        },
      }),
    );

    // ── Notify sender (User A) ───────────────────────────────────────────
    try {
      getIO().to(request.senderId).emit('message_request_accepted', {
        requestId,
        matchId,
        acceptedBy: userId,
        acceptedAt: now,
      });

      // Also emit new_match so ChatScreen refreshes
      const matchPayload = { matchId, createdAt: now };
      getIO()
        .to(request.senderId)
        .emit(`new_match_${request.senderId}`, matchPayload);
      getIO().to(userId).emit(`new_match_${userId}`, matchPayload);
    } catch (e) {
      console.warn('[requests/accept] socket:', e.message);
    }

    return res.status(200).json({ success: true, matchId });
  } catch (err) {
    console.error('[POST /requests/accept]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /requests/reject  — User B rejects
// ════════════════════════════════════════════════════════════════════════════
router.post('/reject', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { requestId, createdAt } = req.body;

    if (!requestId || !createdAt)
      return res
        .status(400)
        .json({ success: false, error: 'requestId and createdAt required' });

    const reqResp = await docClient.send(
      new GetCommand({
        TableName: TABLE,
        Key: { requestId, createdAt },
      }),
    );

    const request = reqResp.Item;
    if (!request)
      return res
        .status(404)
        .json({ success: false, error: 'Request not found' });
    if (request.receiverId !== userId)
      return res.status(403).json({ success: false, error: 'Not authorized' });

    const now = new Date().toISOString();

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { requestId, createdAt },
        UpdateExpression: 'SET #st = :r, updatedAt = :now',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':r': 'rejected', ':now': now },
      }),
    );

    // Notify sender
    try {
      getIO().to(request.senderId).emit('message_request_rejected', {
        requestId,
        rejectedBy: userId,
      });
    } catch (e) {
      console.warn('[requests/reject] socket:', e.message);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[POST /requests/reject]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
