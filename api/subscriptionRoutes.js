/**
 * Premium Subscription Routes
 *
 * Features:
 * - Subscription management (Plus/Ultra)
 * - Daily usage tracking with midnight reset
 * - SUPERLIKE match requests
 * - Premium feature gates
 */

import express from 'express';
import {
  BatchGetCommand,
  docClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from './db.js';
import { authenticate } from './authenticate.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ════════════════════════════════════════════════════════════════════════════
// HELPER: Get Today's Date String (for DailyUsage key)
// ════════════════════════════════════════════════════════════════════════════

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(now.getDate()).padStart(2, '0')}`;
};

const getTodayMidnight = () => {
  const now = new Date();
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  return Math.floor(midnight.getTime() / 1000); // Unix timestamp
};

const getTomorrowMidnightUnix = () => {
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.floor(tomorrow.getTime() / 1000); // Unix timestamp for TTL
};

// ════════════════════════════════════════════════════════════════════════════
// 1. GET /subscription-status - Get current user's subscription
// ════════════════════════════════════════════════════════════════════════════

router.get('/subscription-status', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    // Fetch subscription
    const subResponse = await docClient.send(
      new GetCommand({
        TableName: 'Subscriptions',
        Key: { userId },
        ProjectionExpression:
          'userId, subscriptionType, expiryDate, isActive, daysRemaining',
      }),
    );

    const subscription = subResponse.Item || {
      userId,
      subscriptionType: null,
      isActive: false,
      daysRemaining: 0,
    };

    // Fetch today's usage
    const todayKey = `${userId}#${getTodayString()}`;
    const usageResponse = await docClient.send(
      new GetCommand({
        TableName: 'DailyUsage',
        Key: { 'userId#date': todayKey },
        ProjectionExpression: 'superlikes, rewinds, subscription',
      }),
    );

    const usage = usageResponse.Item || {
      superlikes: 0,
      rewinds: 0,
    };

    // Calculate remaining (depends on subscription type)
    let superlikes = 0;
    let rewinds = 0;

    if (subscription.isActive) {
      if (subscription.subscriptionType === 'Plus') {
        superlikes = Math.max(0, 5 - (usage.superlikes || 0));
        rewinds = Math.max(0, 10 - (usage.rewinds || 0));
      } else if (subscription.subscriptionType === 'Ultra') {
        superlikes = 999; // Unlimited
        rewinds = 999; // Unlimited
      }
    }

    return res.status(200).json({
      success: true,
      subscription: {
        isPremium: subscription.isActive,
        type: subscription.subscriptionType, // "Plus" | "Ultra" | null
        daysRemaining: subscription.daysRemaining || 0,
        expiryDate: subscription.expiryDate || null,
      },
      usage: {
        superlikes: {
          used: usage.superlikes || 0,
          remaining: superlikes,
          limit: subscription.subscriptionType === 'Plus' ? 5 : 999,
        },
        rewinds: {
          used: usage.rewinds || 0,
          remaining: rewinds,
          limit: subscription.subscriptionType === 'Plus' ? 10 : 999,
        },
      },
    });
  } catch (error) {
    console.error('[/subscription-status] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription status',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 2. POST /subscribe - Create subscription (Plus/Ultra)
// ════════════════════════════════════════════════════════════════════════════

router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { planType } = req.body; // "Plus" | "Ultra"

    if (!['Plus', 'Ultra'].includes(planType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid planType. Must be "Plus" or "Ultra"',
      });
    }

    const now = new Date();
    const planStartDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    ); // Today midnight

    let expiryDate;
    if (planType === 'Plus') {
      // 15 days from today
      expiryDate = new Date(planStartDate);
      expiryDate.setDate(expiryDate.getDate() + 15);
    } else {
      // 30 days from today
      expiryDate = new Date(planStartDate);
      expiryDate.setDate(expiryDate.getDate() + 30);
    }

    const daysRemaining = Math.ceil(
      (expiryDate - planStartDate) / (1000 * 60 * 60 * 24),
    );

    const subscription = {
      userId,
      subscriptionType: planType,
      planStartDate: planStartDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      isActive: true,
      purchaseDate: now.toISOString(),
      purchaseId: uuidv4(),
      autoRenew: true,
      daysRemaining,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: 'Subscriptions',
        Item: subscription,
      }),
    );

    console.log(`[/subscribe] ${planType} subscription created for ${userId}`);

    return res.status(201).json({
      success: true,
      subscription,
      message: `${planType} plan activated for ${daysRemaining} days`,
    });
  } catch (error) {
    console.error('[/subscribe] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create subscription',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 3. POST /superlike - Send SUPERLIKE (with daily limit check)
// ════════════════════════════════════════════════════════════════════════════

router.post('/superlike', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { likedId } = req.body;

    if (!likedId) {
      return res.status(400).json({
        success: false,
        error: 'likedId is required',
      });
    }

    if (userId === likedId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot SUPERLIKE yourself',
      });
    }

    // ── 1. Check subscription ──
    const subResponse = await docClient.send(
      new GetCommand({
        TableName: 'Subscriptions',
        Key: { userId },
        ProjectionExpression: 'isActive, subscriptionType',
      }),
    );

    const subscription = subResponse.Item;
    if (!subscription?.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Premium subscription required for SUPERLIKE',
        requiresPremium: true,
      });
    }

    // ── 2. Check daily limit ──
    const todayKey = `${userId}#${getTodayString()}`;
    const usageResponse = await docClient.send(
      new GetCommand({
        TableName: 'DailyUsage',
        Key: { 'userId#date': todayKey },
        ProjectionExpression: 'superlikes',
      }),
    );

    const usage = usageResponse.Item || { superlikes: 0 };

    // For Plus: max 5 SUPERLIKEs/day. For Ultra: unlimited
    if (subscription.subscriptionType === 'Plus' && usage.superlikes >= 5) {
      return res.status(403).json({
        success: false,
        error: 'Daily SUPERLIKE limit reached (5/day)',
        limitReached: true,
      });
    }

    // ── 3. Record swipe as SUPERLIKE ──
    const timestamp = new Date().toISOString();
    const likeRecord = {
      likerId: userId,
      likedId: likedId,
      type: 'superlike',
      timestamp: timestamp,
      isMatched: false,
    };

    await docClient.send(
      new PutCommand({
        TableName: 'flame-Likes',
        Item: likeRecord,
      }),
    );

    // ── 4. Check for mutual like (instant match) ──
    const reverseCheckResponse = await docClient.send(
      new QueryCommand({
        TableName: 'flame-Likes',
        IndexName: 'likedId-index',
        KeyConditionExpression: 'likedId = :userId',
        FilterExpression: 'likerId = :likedId AND #type IN (:like, :superlike)',
        ProjectionExpression: 'likerId, likedId, #type, #timestamp',
        ExpressionAttributeNames: {
          '#type': 'type',
          '#timestamp': 'timestamp',
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':likedId': likedId,
          ':like': 'like',
          ':superlike': 'superlike',
        },
      }),
    );

    let matchCreated = false;
    let matchId = null;
    let requestId = null;

    if (reverseCheckResponse.Items.length > 0) {
      // Instant match! Create match and request
      matchId = uuidv4();
      requestId = uuidv4();
      const now = new Date().toISOString();

      // Create match
      const matchRecord = {
        matchId: matchId,
        user1Id: userId, // SUPERLIKE sender
        user2Id: likedId,
        matchType: 'superlike',
        superliker: userId,
        matchRequestId: requestId,
        status: 'pending', // Awaiting user2's approval
        requesterApproval: {
          approved: false,
          approvedAt: null,
        },
        chatEnabled: false, // Only enabled after approval
        createdAt: now,
        lastMessageAt: now,
        lastMessage: {
          text: "⭐ I superliked you! Let's chat?",
          senderId: 'system',
          timestamp: now,
        },
      };

      await docClient.send(
        new PutCommand({
          TableName: 'flame-Matches',
          Item: matchRecord,
        }),
      );

      // Create match request
      const matchRequest = {
        requestId: requestId,
        createdAt: now,
        superliker: userId,
        superliked: likedId,
        status: 'pending',
        respondedAt: null,
        matchId: matchId,
        message: "⭐ I superliked you! Let's chat?",
        expiresAt: null,
        metadata: {
          superliker: {
            name: 'User',
            image: 'pending', // Fetch in frontend
          },
          superliked: {
            name: 'User',
            image: 'pending',
          },
        },
        createdAt: now,
        updatedAt: now,
      };

      await docClient.send(
        new PutCommand({
          TableName: 'MatchRequests',
          Item: matchRequest,
        }),
      );

      matchCreated = true;
      console.log(
        `[/superlike] Instant match created: ${matchId} (request: ${requestId})`,
      );
    }

    // ── 5. Increment daily usage ──
    await docClient.send(
      new PutCommand({
        TableName: 'DailyUsage',
        Item: {
          'userId#date': todayKey,
          userId,
          date: getTodayString(),
          superlikes: (usage.superlikes || 0) + 1,
          rewinds: usage.rewinds || 0,
          subscription: subscription.subscriptionType,
          lastReset: new Date(getTodayMidnight() * 1000).toISOString(),
          expiresAt: getTomorrowMidnightUnix(),
          createdAt: usageResponse.Item?.createdAt || new Date().toISOString(),
        },
      }),
    );

    return res.status(200).json({
      success: true,
      match: matchCreated,
      matchId: matchCreated ? matchId : null,
      requestId: matchCreated ? requestId : null,
      usage: {
        superlikes: {
          used: (usage.superlikes || 0) + 1,
          remaining:
            subscription.subscriptionType === 'Plus'
              ? Math.max(0, 5 - ((usage.superlikes || 0) + 1))
              : 999,
        },
      },
    });
  } catch (error) {
    console.error('[/superlike] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process SUPERLIKE',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 4. POST /rewind - Rewind last swipe (with daily limit check)
// ════════════════════════════════════════════════════════════════════════════

router.post('/rewind', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    // ── 1. Check subscription ──
    const subResponse = await docClient.send(
      new GetCommand({
        TableName: 'Subscriptions',
        Key: { userId },
        ProjectionExpression: 'isActive, subscriptionType',
      }),
    );

    const subscription = subResponse.Item;
    if (!subscription?.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Premium subscription required for REWIND',
        requiresPremium: true,
      });
    }

    // ── 2. Check daily limit (Plus: 10/day, Ultra: unlimited) ──
    const todayKey = `${userId}#${getTodayString()}`;
    const usageResponse = await docClient.send(
      new GetCommand({
        TableName: 'DailyUsage',
        Key: { 'userId#date': todayKey },
        ProjectionExpression: 'rewinds',
      }),
    );

    const usage = usageResponse.Item || { rewinds: 0 };

    if (subscription.subscriptionType === 'Plus' && usage.rewinds >= 10) {
      return res.status(403).json({
        success: false,
        error: 'Daily REWIND limit reached (10/day)',
        limitReached: true,
      });
    }

    // ── 3. Increment daily usage ──
    await docClient.send(
      new PutCommand({
        TableName: 'DailyUsage',
        Item: {
          'userId#date': todayKey,
          userId,
          date: getTodayString(),
          superlikes: usage.superlikes || 0,
          rewinds: (usage.rewinds || 0) + 1,
          subscription: subscription.subscriptionType,
          lastReset: new Date(getTodayMidnight() * 1000).toISOString(),
          expiresAt: getTomorrowMidnightUnix(),
          createdAt: usageResponse.Item?.createdAt || new Date().toISOString(),
        },
      }),
    );

    // ── 4. Rewind is handled on frontend (just track usage) ──
    return res.status(200).json({
      success: true,
      message: 'Card rewinded',
      usage: {
        rewinds: {
          used: (usage.rewinds || 0) + 1,
          remaining:
            subscription.subscriptionType === 'Plus'
              ? Math.max(0, 10 - ((usage.rewinds || 0) + 1))
              : 999,
        },
      },
    });
  } catch (error) {
    console.error('[/rewind] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process REWIND',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 5. POST /send-message-request - Send message to non-matched user (PAID)
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

    // ── 1. Check subscription ──
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

    // ── 2. Create message request ──
    const requestId = uuidv4();
    const now = new Date().toISOString();

    const messageRequest = {
      requestId,
      createdAt: now,
      senderId: userId,
      recipientId,
      message,
      status: 'pending', // Awaiting response
      respondedAt: null,
      expiresAt: getTomorrowMidnightUnix(), // Auto-delete if not responded
    };

    await docClient.send(
      new PutCommand({
        TableName: 'MessageRequests', // New table (optional)
        Item: messageRequest,
      }),
    );

    return res.status(201).json({
      success: true,
      message: 'Message request sent',
      requestId,
    });
  } catch (error) {
    console.error('[/send-message-request] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send message request',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 6. GET /likes/sent - Get profiles I liked
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
        ExpressionAttributeNames: {
          '#timestamp': 'timestamp',
        },
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        Limit: parseInt(limit, 10),
        ScanIndexForward: false, // Most recent first
        ...(cursor && {
          ExclusiveStartKey: JSON.parse(
            Buffer.from(cursor, 'base64').toString(),
          ),
        }),
      }),
    );

    // Batch fetch user profiles
    const userIds = response.Items.map(item => ({ userId: item.likedId }));

    // If no liked users, return empty array
    if (userIds.length === 0) {
      return res.status(200).json({
        success: true,
        likes: [],
        total: 0,
      });
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

    const users = usersResponse.Responses.Users || [];

    return res.status(200).json({
      success: true,
      likes: users.map(user => ({
        userId: user.userId,
        name: user.firstName,
        age: user.ageForSort,
        image: user.imageUrls?.[0],
        hometown: user.hometown,
      })),
      total: users.length,
    });
  } catch (error) {
    console.error('[/likes/sent] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sent likes',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 7. GET /likes/received - Get profiles that liked me (free: blur, premium: show)
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

    // ✅ Premium aur free dono ke liye likes fetch karo
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
      return res.status(200).json({
        success: true,
        likes: [],
        total: 0,
        blurred: !isPremium,
      });
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
      likes: users.map(user => ({
        userId: user.userId,
        name: user.firstName,
        age: user.ageForSort,
        // ✅ Free users ke liye image null — frontend blur karega
        image: isPremium ? user.imageUrls?.[0] : null,
        hometown: isPremium ? user.hometown : null,
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
// GET /users/new - Recently joined users (last 7 days) with NEW badge
// ════════════════════════════════════════════════════════════════════════════

router.get('/users/new', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 20 } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10), 50);

    // ── 1. Get current user gender prefs ──
    const userResp = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId },
        ProjectionExpression: 'gender, datingPreferences',
      }),
    );

    if (!userResp.Item)
      return res.status(404).json({ success: false, error: 'User not found' });

    const prefs = userResp.Item.datingPreferences || [];
    let gendersToShow = [];
    if (prefs.includes('Men')) gendersToShow.push('Male');
    if (prefs.includes('Women')) gendersToShow.push('Female');
    if (gendersToShow.length === 0) {
      gendersToShow = userResp.Item.gender === 'Male' ? ['Female'] : ['Male'];
    }

    // ── 2. GSI se sirf userId fetch karo — createdAt GSI mein nahi hai ──
    const results = await Promise.all(
      gendersToShow.map(gender =>
        docClient.send(
          new QueryCommand({
            TableName: 'Users',
            IndexName: 'gender-age-index',
            KeyConditionExpression: 'gender = :gender',
            FilterExpression: 'isActive = :active AND userId <> :userId',
            ExpressionAttributeValues: {
              ':gender': gender,
              ':active': true,
              ':userId': userId,
            },
            ProjectionExpression: 'userId', // ✅ sirf userId
            Limit: parsedLimit * 3, // extra fetch — baad mein filter karenge
          }),
        ),
      ),
    );

    // ── 3. Merge + dedupe userIds ──
    const seen = new Set();
    const candidateIds = results
      .flatMap(r => r.Items || [])
      .map(u => u.userId)
      .filter(id => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

    if (candidateIds.length === 0) {
      return res.status(200).json({ success: true, users: [], total: 0 });
    }

    // ── 4. BatchGet main table — createdAt yahan milega ──
    const batchResp = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          Users: {
            Keys: candidateIds.map(id => ({ userId: id })),
            ProjectionExpression:
              'userId, firstName, imageUrls, ageForSort, hometown, goals, createdAt',
          },
        },
      }),
    );

    const allUsers = batchResp.Responses?.Users || [];

    // ── 5. Filter last 7 days + sort by createdAt ──
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const newUsers = allUsers
      .filter(u => u.createdAt && u.createdAt > sevenDaysAgo)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parsedLimit);

    return res.status(200).json({
      success: true,
      users: newUsers.map(u => ({
        userId: u.userId,
        name: u.firstName,
        age: u.ageForSort,
        image: u.imageUrls?.[0] || null,
        hometown: u.hometown || null,
        goals: u.goals || null,
        isNew: true,
        joinedAt: u.createdAt,
      })),
      total: newUsers.length,
    });
  } catch (err) {
    console.error('[/users/new] Error:', err.message);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch new users' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 8. GET /match-requests/pending - Get pending SUPERLIKE requests
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
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':status': 'pending',
        },
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
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch pending requests',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 9. POST /match-request/accept - Accept SUPERLIKE request
// ════════════════════════════════════════════════════════════════════════════

router.post('/match-request/accept', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'requestId is required',
      });
    }

    const now = new Date().toISOString();

    // ── 1. Update match request to accepted ──
    await docClient.send(
      new UpdateCommand({
        TableName: 'MatchRequests',
        Key: { requestId, createdAt: '' }, // Need createdAt from query
        UpdateExpression:
          'SET #status = :status, respondedAt = :now, expiresAt = :expiresAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'accepted',
          ':now': now,
          ':expiresAt': null, // Don't auto-delete
        },
      }),
    );

    // ── 2. Get match and update to active ──
    const reqResponse = await docClient.send(
      new GetCommand({
        TableName: 'MatchRequests',
        Key: { requestId },
        ProjectionExpression: 'matchId, superliker',
      }),
    );

    const matchId = reqResponse.Item.matchId;
    const superliker = reqResponse.Item.superliker;

    await docClient.send(
      new UpdateCommand({
        TableName: 'flame-Matches',
        Key: { matchId },
        UpdateExpression:
          'SET #status = :status, chatEnabled = :chatEnabled, requesterApproval.approved = :approved, requesterApproval.approvedAt = :now',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
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
    return res.status(500).json({
      success: false,
      error: 'Failed to accept request',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 10. POST /match-request/reject - Reject SUPERLIKE request (auto-delete after 24h)
// ════════════════════════════════════════════════════════════════════════════

router.post('/match-request/reject', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'requestId is required',
      });
    }

    const now = new Date().toISOString();

    // ── 1. Update match request to rejected ──
    await docClient.send(
      new UpdateCommand({
        TableName: 'MatchRequests',
        Key: { requestId, createdAt: '' },
        UpdateExpression:
          'SET #status = :status, respondedAt = :now, expiresAt = :expiresAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'rejected',
          ':now': now,
          ':expiresAt': getTomorrowMidnightUnix(), // Auto-delete in 24h
        },
      }),
    );

    // ── 2. Update match to rejected ──
    const reqResponse = await docClient.send(
      new GetCommand({
        TableName: 'MatchRequests',
        Key: { requestId },
        ProjectionExpression: 'matchId',
      }),
    );

    if (reqResponse.Item?.matchId) {
      await docClient.send(
        new UpdateCommand({
          TableName: 'flame-Matches',
          Key: { matchId: reqResponse.Item.matchId },
          UpdateExpression: 'SET #status = :status, chatEnabled = :chatEnabled',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
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
    return res.status(500).json({
      success: false,
      error: 'Failed to reject request',
    });
  }
});

export default router;
