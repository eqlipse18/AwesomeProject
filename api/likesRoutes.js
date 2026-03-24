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
    const { limit = 50, cursor } = req.query;

    // Step 1: GSI — keys only (likerId-timestamp-index projects only keys)
    const gsiResp = await docClient.send(
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

    const likedIds = gsiResp.Items.map(i => i.likedId);
    const timestampMap = {};
    gsiResp.Items.forEach(i => {
      timestampMap[i.likedId] = i.timestamp;
    });

    if (likedIds.length === 0)
      return res.status(200).json({ success: true, likes: [], total: 0 });

    // Step 2: Main table BatchGet — type + isMatched (primary key: likerId + likedId)
    const [likesBatch, usersBatch] = await Promise.all([
      docClient.send(
        new BatchGetCommand({
          RequestItems: {
            'flame-Likes': {
              Keys: likedIds.map(id => ({ likerId: userId, likedId: id })),
              ProjectionExpression: 'likedId, #type, isMatched',
              ExpressionAttributeNames: { '#type': 'type' },
            },
          },
        }),
      ),
      docClient.send(
        new BatchGetCommand({
          RequestItems: {
            Users: {
              Keys: likedIds.map(id => ({ userId: id })),
              ProjectionExpression:
                'userId, firstName, imageUrls, ageForSort, hometown, isOnline, lastActiveAt, isVerified, goals,lat,lng',
            },
          },
        }),
      ),
    ]);

    const likeMetaMap = {};
    (likesBatch.Responses?.['flame-Likes'] || []).forEach(item => {
      likeMetaMap[item.likedId] = {
        type: item.type || 'like',
        isMatched: item.isMatched || false,
      };
    });

    const users = usersBatch.Responses?.Users || [];

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
        type: likeMetaMap[u.userId]?.type || 'like',
        isMatched: likeMetaMap[u.userId]?.isMatched || false,
        likedAt: timestampMap[u.userId] || null,
        lat: u.lat || null,
        lng: u.lng || null,
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

    // GSI projects: likedId, timestamp, type, likerId ✅
    const likesResp = await docClient.send(
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

    if (likesResp.Items.length === 0)
      return res
        .status(200)
        .json({ success: true, likes: [], total: 0, blurred: !isPremium });

    const likerIds = likesResp.Items.map(i => i.likerId);

    // GSI meta map
    const gsiMetaMap = {};
    likesResp.Items.forEach(item => {
      gsiMetaMap[item.likerId] = {
        type: item.type || 'like',
        likedAt: item.timestamp || null,
      };
    });

    // Main table BatchGet — isMatched fetch karo
    const [likesBatch, usersBatch] = await Promise.all([
      docClient.send(
        new BatchGetCommand({
          RequestItems: {
            'flame-Likes': {
              Keys: likerIds.map(id => ({ likerId: id, likedId: userId })),
              ProjectionExpression: 'likerId, isMatched',
            },
          },
        }),
      ),
      docClient.send(
        new BatchGetCommand({
          RequestItems: {
            Users: {
              Keys: likerIds.map(id => ({ userId: id })),
              ProjectionExpression:
                'userId, firstName, imageUrls, ageForSort, hometown, isOnline, lastActiveAt, isVerified, goals,lat,lng',
            },
          },
        }),
      ),
    ]);

    const isMatchedMap = {};
    (likesBatch.Responses?.['flame-Likes'] || []).forEach(item => {
      isMatchedMap[item.likerId] = item.isMatched || false;
    });

    const users = usersBatch.Responses?.Users || [];

    return res.status(200).json({
      success: true,
      likes: users.map(u => ({
        userId: u.userId,
        name: isPremium ? u.firstName : null,
        age: isPremium ? u.ageForSort : null,
        image: u.imageUrls?.[0] || null,
        hometown: isPremium ? u.hometown : null,
        isOnline: isPremium ? u.isOnline || false : null,
        lastActiveAt: isPremium ? u.lastActiveAt || null : null,
        isVerified: isPremium ? u.isVerified || false : false,
        goals: isPremium ? u.goals || null : null,
        type: gsiMetaMap[u.userId]?.type || 'like',
        isMatched: isMatchedMap[u.userId] || false,
        likedAt: gsiMetaMap[u.userId]?.likedAt || null,
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
router.get('/likes/stats', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    const [receivedResp, sentResp, userResp] = await Promise.all([
      // Total received likes
      docClient.send(
        new QueryCommand({
          TableName: 'flame-Likes',
          IndexName: 'likedId-index',
          KeyConditionExpression: 'likedId = :userId',
          FilterExpression: '#type IN (:like, :superlike)',
          Select: 'COUNT',
          ExpressionAttributeNames: { '#type': 'type' },
          ExpressionAttributeValues: {
            ':userId': userId,
            ':like': 'like',
            ':superlike': 'superlike',
          },
        }),
      ),
      // Total sent likes
      docClient.send(
        new QueryCommand({
          TableName: 'flame-Likes',
          IndexName: 'likerId-timestamp-index',
          KeyConditionExpression: 'likerId = :userId',
          Select: 'COUNT',
          ExpressionAttributeValues: { ':userId': userId },
        }),
      ),
      // Profile views + likeCount from Users table
      docClient.send(
        new GetCommand({
          TableName: 'Users',
          Key: { userId },
          ProjectionExpression: 'likeCount, profileViews',
        }),
      ),
    ]);

    // Superlikes received count
    const superlikesResp = await docClient.send(
      new QueryCommand({
        TableName: 'flame-Likes',
        IndexName: 'likedId-index',
        KeyConditionExpression: 'likedId = :userId',
        FilterExpression: '#type = :superlike',
        Select: 'COUNT',
        ExpressionAttributeNames: { '#type': 'type' },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':superlike': 'superlike',
        },
      }),
    );

    return res.status(200).json({
      success: true,
      stats: {
        totalReceived: receivedResp.Count || 0,
        totalSent: sentResp.Count || 0,
        superlikesReceived: superlikesResp.Count || 0,
        profileViews: userResp.Item?.profileViews || 0,
      },
    });
  } catch (error) {
    console.error('[/likes/stats] Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch stats' });
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
      return res.status(400).json({
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
      return res.status(403).json({
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

    return res.status(200).json({
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

    return res.status(200).json({
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
