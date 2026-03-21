/**
 * likesRoutes.js
 * Routes: /likes/sent | /likes/received | /send-message-request
 *         /match-requests/pending | /match-request/accept | /match-request/reject
 */

import express from 'express';
import {
  docClient,
  BatchGetCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from './db.js';
import { authenticate } from './authenticate.js';

const router = express.Router();

// ════════════════════════════════════════════════════════════════════════════
// HELPER
// ════════════════════════════════════════════════════════════════════════════

const getTomorrowMidnightUnix = () => {
  const now = new Date();
  return Math.floor(
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    ).getTime() / 1000,
  );
};

// ════════════════════════════════════════════════════════════════════════════
// GET /likes/sent
// ════════════════════════════════════════════════════════════════════════════

router.get('/likes/sent', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 20, cursor } = req.query;

    const response = await docClient.send(
      new QueryCommand({
        TableName: 'flame-Likes',
        IndexName: 'likerId-timestamp-index',
        KeyConditionExpression: 'likerId = :userId',
        ProjectionExpression: 'likedId, #timestamp',
        ExpressionAttributeNames: { '#timestamp': 'timestamp' },
        ExpressionAttributeValues: { ':userId': userId },
        Limit: parseInt(limit, 10),
        ScanIndexForward: false,
        ...(cursor && {
          ExclusiveStartKey: JSON.parse(
            Buffer.from(cursor, 'base64').toString(),
          ),
        }),
      }),
    );

    const userIds = response.Items.map(item => ({ userId: item.likedId }));

    if (userIds.length === 0) {
      return res.status(200).json({ success: true, likes: [], total: 0 });
    }

    const usersResponse = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          Users: {
            Keys: userIds,
            ProjectionExpression:
              'userId, firstName, imageUrls, ageForSort, hometown, isOnline, lastActiveAt, isVerified, goals',
          },
        },
      }),
    );

    const users = usersResponse.Responses?.Users || [];

    return res.status(200).json({
      success: true,
      likes: users.map(u => ({
        userId: u.userId,
        name: u.firstName,
        age: u.ageForSort,
        image: u.imageUrls?.[0] || null,
        hometown: u.hometown || null,
        isOnline: u.isOnline || false,
        lastActiveAt: u.lastActiveAt || null,
        isVerified: u.isVerified || false,
        goals: u.goals || null,
      })),
      total: users.length,
    });
  } catch (error) {
    console.error('[/likes/sent] Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch sent likes' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /likes/received
// ════════════════════════════════════════════════════════════════════════════

router.get('/likes/received', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    const subResponse = await docClient.send(
      new GetCommand({
        TableName: 'Subscriptions',
        Key: { userId },
        ProjectionExpression: 'isActive',
      }),
    );

    const isPremium = subResponse.Item?.isActive || false;

    const response = await docClient.send(
      new QueryCommand({
        TableName: 'flame-Likes',
        IndexName: 'likedId-index',
        KeyConditionExpression: 'likedId = :userId',
        FilterExpression: '#type IN (:like, :superlike)',
        ProjectionExpression: 'likerId, #type, #timestamp',
        ExpressionAttributeNames: {
          '#type': 'type',
          '#timestamp': 'timestamp',
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':like': 'like',
          ':superlike': 'superlike',
        },
        ScanIndexForward: false,
      }),
    );

    if (response.Items.length === 0) {
      return res
        .status(200)
        .json({ success: true, likes: [], total: 0, blurred: !isPremium });
    }

    const userIds = response.Items.map(item => ({ userId: item.likerId }));

    const usersResponse = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          Users: {
            Keys: userIds,
            ProjectionExpression:
              'userId, firstName, imageUrls, ageForSort, hometown, isOnline, lastActiveAt, isVerified, goals',
          },
        },
      }),
    );

    const users = usersResponse.Responses?.Users || [];

    return res.status(200).json({
      success: true,
      likes: users.map(u => ({
        userId: u.userId,
        name: isPremium ? u.firstName : null,
        age: isPremium ? u.ageForSort : null,
        image: u.imageUrls?.[0] || null, // always send — frontend blurs
        hometown: isPremium ? u.hometown : null,
        isOnline: isPremium ? u.isOnline || false : null,
        lastActiveAt: isPremium ? u.lastActiveAt || null : null,
        joinedAt: u.createdAt || null,
        lat: isPremium ? u.lat || null : null,
        lng: isPremium ? u.lng || null : null,
      })),
      total: users.length,
      blurred: !isPremium,
    });
  } catch (error) {
    console.error('[/likes/received] Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch received likes' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /send-message-request
// ════════════════════════════════════════════════════════════════════════════

router.post('/send-message-request', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { recipientId, message } = req.body;

    if (!recipientId || !message) {
      return res
        .status(400)
        .json({
          success: false,
          error: 'recipientId and message are required',
        });
    }

    const subResponse = await docClient.send(
      new GetCommand({
        TableName: 'Subscriptions',
        Key: { userId },
        ProjectionExpression: 'isActive',
      }),
    );

    if (!subResponse.Item?.isActive) {
      return res
        .status(403)
        .json({
          success: false,
          error: 'Premium subscription required to send messages',
          requiresPremium: true,
        });
    }

    const { v4: uuidv4 } = await import('uuid');
    const requestId = uuidv4();
    const now = new Date().toISOString();

    await docClient.send(
      new PutCommand({
        TableName: 'MessageRequests',
        Item: {
          requestId,
          createdAt: now,
          senderId: userId,
          recipientId,
          message,
          status: 'pending',
          respondedAt: null,
          expiresAt: getTomorrowMidnightUnix(),
        },
      }),
    );

    return res
      .status(201)
      .json({ success: true, message: 'Message request sent', requestId });
  } catch (error) {
    console.error('[/send-message-request] Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to send message request' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /match-requests/pending
// ════════════════════════════════════════════════════════════════════════════

router.get('/match-requests/pending', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    const response = await docClient.send(
      new QueryCommand({
        TableName: 'MatchRequests',
        IndexName: 'superliked-status-index',
        KeyConditionExpression: 'superliked = :userId',
        FilterExpression: '#status = :status',
        ProjectionExpression:
          'requestId, superliker, createdAt, metadata, matchId',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':userId': userId, ':status': 'pending' },
        ScanIndexForward: false,
      }),
    );

    return res.status(200).json({
      success: true,
      requests: response.Items || [],
      total: response.Items?.length || 0,
    });
  } catch (error) {
    console.error('[/match-requests/pending] Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch pending requests' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /match-request/accept
// ════════════════════════════════════════════════════════════════════════════

router.post('/match-request/accept', authenticate, async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId)
      return res
        .status(400)
        .json({ success: false, error: 'requestId is required' });

    const now = new Date().toISOString();

    // Fetch request first to get matchId + createdAt
    const reqResponse = await docClient.send(
      new GetCommand({
        TableName: 'MatchRequests',
        Key: { requestId },
        ProjectionExpression: 'matchId, superliker, createdAt',
      }),
    );

    if (!reqResponse.Item) {
      return res
        .status(404)
        .json({ success: false, error: 'Match request not found' });
    }

    const { matchId, createdAt } = reqResponse.Item;

    // Update request status
    await docClient.send(
      new UpdateCommand({
        TableName: 'MatchRequests',
        Key: { requestId, createdAt },
        UpdateExpression:
          'SET #status = :status, respondedAt = :now, expiresAt = :expiresAt',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'accepted',
          ':now': now,
          ':expiresAt': null,
        },
      }),
    );

    // Activate match
    await docClient.send(
      new UpdateCommand({
        TableName: 'flame-Matches',
        Key: { matchId },
        UpdateExpression:
          'SET #status = :status, chatEnabled = :chatEnabled, requesterApproval.approved = :approved, requesterApproval.approvedAt = :now',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'active',
          ':chatEnabled': true,
          ':approved': true,
          ':now': now,
        },
      }),
    );

    return res
      .status(200)
      .json({
        success: true,
        message: 'SUPERLIKE accepted, match is now active',
        matchId,
      });
  } catch (error) {
    console.error('[/match-request/accept] Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to accept request' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /match-request/reject
// ════════════════════════════════════════════════════════════════════════════

router.post('/match-request/reject', authenticate, async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId)
      return res
        .status(400)
        .json({ success: false, error: 'requestId is required' });

    const now = new Date().toISOString();

    // Fetch request to get matchId + createdAt
    const reqResponse = await docClient.send(
      new GetCommand({
        TableName: 'MatchRequests',
        Key: { requestId },
        ProjectionExpression: 'matchId, createdAt',
      }),
    );

    if (!reqResponse.Item) {
      return res
        .status(404)
        .json({ success: false, error: 'Match request not found' });
    }

    const { matchId, createdAt } = reqResponse.Item;

    // Update request
    await docClient.send(
      new UpdateCommand({
        TableName: 'MatchRequests',
        Key: { requestId, createdAt },
        UpdateExpression:
          'SET #status = :status, respondedAt = :now, expiresAt = :expiresAt',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'rejected',
          ':now': now,
          ':expiresAt': getTomorrowMidnightUnix(),
        },
      }),
    );

    // Reject match
    if (matchId) {
      await docClient.send(
        new UpdateCommand({
          TableName: 'flame-Matches',
          Key: { matchId },
          UpdateExpression: 'SET #status = :status, chatEnabled = :chatEnabled',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':status': 'rejected',
            ':chatEnabled': false,
          },
        }),
      );
    }

    return res
      .status(200)
      .json({
        success: true,
        message: 'SUPERLIKE rejected. Will disappear in 24 hours.',
      });
  } catch (error) {
    console.error('[/match-request/reject] Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to reject request' });
  }
});

export default router;
