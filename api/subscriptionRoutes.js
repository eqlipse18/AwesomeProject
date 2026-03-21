/**
 * subscriptionRoutes.js
 * Routes: /subscription-status | /subscribe | /superlike | /rewind
 */

import express from 'express';
import { docClient, GetCommand, PutCommand, QueryCommand } from './db.js';
import { authenticate } from './authenticate.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
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
  return Math.floor(
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    ).getTime() / 1000,
  );
};

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
// GET /subscription-status
// ════════════════════════════════════════════════════════════════════════════

router.get('/subscription-status', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

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

    const todayKey = `${userId}#${getTodayString()}`;
    const usageResponse = await docClient.send(
      new GetCommand({
        TableName: 'DailyUsage',
        Key: { 'userId#date': todayKey },
        ProjectionExpression: 'superlikes, rewinds, subscription',
      }),
    );

    const usage = usageResponse.Item || { superlikes: 0, rewinds: 0 };

    let superlikes = 0;
    let rewinds = 0;

    if (subscription.isActive) {
      if (subscription.subscriptionType === 'Plus') {
        superlikes = Math.max(0, 5 - (usage.superlikes || 0));
        rewinds = Math.max(0, 10 - (usage.rewinds || 0));
      } else if (subscription.subscriptionType === 'Ultra') {
        superlikes = 999;
        rewinds = 999;
      }
    }

    return res.status(200).json({
      success: true,
      subscription: {
        isPremium: subscription.isActive,
        type: subscription.subscriptionType,
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
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch subscription status' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /subscribe
// ════════════════════════════════════════════════════════════════════════════

router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { planType } = req.body;

    if (!['Plus', 'Ultra'].includes(planType)) {
      return res
        .status(400)
        .json({
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
    );
    const expiryDate = new Date(planStartDate);
    expiryDate.setDate(expiryDate.getDate() + (planType === 'Plus' ? 15 : 30));

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
      new PutCommand({ TableName: 'Subscriptions', Item: subscription }),
    );

    console.log(`[/subscribe] ${planType} subscription created for ${userId}`);

    return res.status(201).json({
      success: true,
      subscription,
      message: `${planType} plan activated for ${daysRemaining} days`,
    });
  } catch (error) {
    console.error('[/subscribe] Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to create subscription' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /superlike
// ════════════════════════════════════════════════════════════════════════════

router.post('/superlike', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { likedId } = req.body;

    if (!likedId)
      return res
        .status(400)
        .json({ success: false, error: 'likedId is required' });
    if (userId === likedId)
      return res
        .status(400)
        .json({ success: false, error: 'Cannot SUPERLIKE yourself' });

    // 1. Check subscription
    const subResponse = await docClient.send(
      new GetCommand({
        TableName: 'Subscriptions',
        Key: { userId },
        ProjectionExpression: 'isActive, subscriptionType',
      }),
    );

    const subscription = subResponse.Item;
    if (!subscription?.isActive) {
      return res
        .status(403)
        .json({
          success: false,
          error: 'Premium subscription required for SUPERLIKE',
          requiresPremium: true,
        });
    }

    // 2. Check daily limit
    const todayKey = `${userId}#${getTodayString()}`;
    const usageResponse = await docClient.send(
      new GetCommand({
        TableName: 'DailyUsage',
        Key: { 'userId#date': todayKey },
        ProjectionExpression: 'superlikes',
      }),
    );

    const usage = usageResponse.Item || { superlikes: 0 };

    if (subscription.subscriptionType === 'Plus' && usage.superlikes >= 5) {
      return res
        .status(403)
        .json({
          success: false,
          error: 'Daily SUPERLIKE limit reached (5/day)',
          limitReached: true,
        });
    }

    // 3. Record SUPERLIKE
    const timestamp = new Date().toISOString();
    await docClient.send(
      new PutCommand({
        TableName: 'flame-Likes',
        Item: {
          likerId: userId,
          likedId,
          type: 'superlike',
          timestamp,
          isMatched: false,
        },
      }),
    );

    // 4. Check for mutual like
    const reverseCheck = await docClient.send(
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

    if (reverseCheck.Items.length > 0) {
      matchId = uuidv4();
      requestId = uuidv4();
      const now = new Date().toISOString();

      await docClient.send(
        new PutCommand({
          TableName: 'flame-Matches',
          Item: {
            matchId,
            user1Id: userId,
            user2Id: likedId,
            matchType: 'superlike',
            superliker: userId,
            matchRequestId: requestId,
            status: 'pending',
            requesterApproval: { approved: false, approvedAt: null },
            chatEnabled: false,
            createdAt: now,
            lastMessageAt: now,
            lastMessage: {
              text: "⭐ I superliked you! Let's chat?",
              senderId: 'system',
              timestamp: now,
            },
          },
        }),
      );

      await docClient.send(
        new PutCommand({
          TableName: 'MatchRequests',
          Item: {
            requestId,
            createdAt: now,
            superliker: userId,
            superliked: likedId,
            status: 'pending',
            respondedAt: null,
            matchId,
            message: "⭐ I superliked you! Let's chat?",
            expiresAt: null,
            metadata: {
              superliker: { name: 'User', image: 'pending' },
              superliked: { name: 'User', image: 'pending' },
            },
            updatedAt: now,
          },
        }),
      );

      matchCreated = true;
      console.log(
        `[/superlike] Match created: ${matchId} (request: ${requestId})`,
      );
    }

    // 5. Increment daily usage
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
    return res
      .status(500)
      .json({ success: false, error: 'Failed to process SUPERLIKE' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /rewind
// ════════════════════════════════════════════════════════════════════════════

router.post('/rewind', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    const subResponse = await docClient.send(
      new GetCommand({
        TableName: 'Subscriptions',
        Key: { userId },
        ProjectionExpression: 'isActive, subscriptionType',
      }),
    );

    const subscription = subResponse.Item;
    if (!subscription?.isActive) {
      return res
        .status(403)
        .json({
          success: false,
          error: 'Premium subscription required for REWIND',
          requiresPremium: true,
        });
    }

    const todayKey = `${userId}#${getTodayString()}`;
    const usageResponse = await docClient.send(
      new GetCommand({
        TableName: 'DailyUsage',
        Key: { 'userId#date': todayKey },
        ProjectionExpression: 'rewinds, superlikes',
      }),
    );

    const usage = usageResponse.Item || { rewinds: 0, superlikes: 0 };

    if (subscription.subscriptionType === 'Plus' && usage.rewinds >= 10) {
      return res
        .status(403)
        .json({
          success: false,
          error: 'Daily REWIND limit reached (10/day)',
          limitReached: true,
        });
    }

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
    return res
      .status(500)
      .json({ success: false, error: 'Failed to process REWIND' });
  }
});

export default router;
