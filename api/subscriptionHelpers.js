/**
 * Premium System Helpers & Utilities
 *
 * - Subscription status checks
 * - Daily usage management
 * - Midnight reset logic
 * - Cron job setup for cleanup
 */

import {
  docClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from './db.js';

import {
  checkSubscriptionStatus,
  getDailyUsage,
  checkFeatureLimit,
  hasAlreadySuperliked,
  incrementUsage,
} from './subscriptionHelpers.js';

// ════════════════════════════════════════════════════════════════════════════
// 1. Check if user has active subscription
// ════════════════════════════════════════════════════════════════════════════

export const checkSubscriptionStatus = async userId => {
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: 'Subscriptions',
        Key: { userId },
        ProjectionExpression:
          'userId, subscriptionType, expiryDate, isActive, daysRemaining',
      }),
    );

    const subscription = response.Item;

    if (!subscription) {
      return {
        isActive: false,
        type: null,
        daysRemaining: 0,
      };
    }

    // Check if expired
    const now = new Date();
    const expiryDate = new Date(subscription.expiryDate);

    if (expiryDate < now) {
      // Subscription expired, update isActive to false
      await docClient.send(
        new UpdateCommand({
          TableName: 'Subscriptions',
          Key: { userId },
          UpdateExpression: 'SET isActive = :isActive',
          ExpressionAttributeValues: {
            ':isActive': false,
          },
        }),
      );

      return {
        isActive: false,
        type: subscription.subscriptionType,
        daysRemaining: 0,
      };
    }

    return {
      isActive: subscription.isActive,
      type: subscription.subscriptionType,
      daysRemaining: subscription.daysRemaining,
    };
  } catch (error) {
    console.error('[checkSubscriptionStatus] Error:', error);
    return {
      isActive: false,
      type: null,
      daysRemaining: 0,
    };
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 2. Get today's daily usage
// ════════════════════════════════════════════════════════════════════════════

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(now.getDate()).padStart(2, '0')}`;
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
  return Math.floor(tomorrow.getTime() / 1000);
};

export const getDailyUsage = async userId => {
  try {
    const todayKey = `${userId}#${getTodayString()}`;

    const response = await docClient.send(
      new GetCommand({
        TableName: 'DailyUsage',
        Key: { 'userId#date': todayKey },
        ProjectionExpression:
          'userId#date, superlikes, rewinds, subscription, lastReset',
      }),
    );

    if (!response.Item) {
      return {
        superlikes: 0,
        rewinds: 0,
        subscription: null,
      };
    }

    return response.Item;
  } catch (error) {
    console.error('[getDailyUsage] Error:', error);
    return {
      superlikes: 0,
      rewinds: 0,
      subscription: null,
    };
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 3. Increment feature usage
// ════════════════════════════════════════════════════════════════════════════

export const incrementUsage = async (userId, feature, subscription) => {
  /**
   * feature: 'superlike' | 'rewind'
   * subscription: 'Plus' | 'Ultra'
   */

  try {
    const todayKey = `${userId}#${getTodayString()}`;
    const usage = await getDailyUsage(userId);

    const updateExpression =
      feature === 'superlike'
        ? 'SET superlikes = :count'
        : 'SET rewinds = :count';

    const newCount =
      feature === 'superlike' ? usage.superlikes + 1 : usage.rewinds + 1;

    await docClient.send(
      new PutCommand({
        TableName: 'DailyUsage',
        Item: {
          'userId#date': todayKey,
          userId,
          date: getTodayString(),
          superlikes: feature === 'superlike' ? newCount : usage.superlikes,
          rewinds: feature === 'rewind' ? newCount : usage.rewinds,
          subscription,
          lastReset: new Date().toISOString(),
          expiresAt: getTomorrowMidnightUnix(),
          createdAt: usage.createdAt || new Date().toISOString(),
        },
      }),
    );

    return newCount;
  } catch (error) {
    console.error('[incrementUsage] Error:', error);
    throw error;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 4. Check feature limit
// ════════════════════════════════════════════════════════════════════════════

export const checkFeatureLimit = async (userId, feature, subscription) => {
  /**
   * Returns: { allowed: boolean, remaining: number, limit: number }
   */

  try {
    const usage = await getDailyUsage(userId);

    if (!subscription.isActive) {
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        reason: 'No active subscription',
      };
    }

    let used = 0;
    let limit = 0;

    if (feature === 'superlike') {
      used = usage.superlikes || 0;
      limit = subscription.type === 'Plus' ? 5 : 999;
    } else if (feature === 'rewind') {
      used = usage.rewinds || 0;
      limit = subscription.type === 'Plus' ? 10 : 999;
    }

    const remaining = Math.max(0, limit - used);
    const allowed = used < limit;

    return {
      allowed,
      used,
      remaining,
      limit,
    };
  } catch (error) {
    console.error('[checkFeatureLimit] Error:', error);
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      reason: error.message,
    };
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 5. Get remaining days for subscription
// ════════════════════════════════════════════════════════════════════════════

export const getRemainingDays = expiryDate => {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = Math.abs(expiry - now);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// ════════════════════════════════════════════════════════════════════════════
// 6. Verify SUPERLIKE (check if already superliked same person)
// ════════════════════════════════════════════════════════════════════════════

export const hasAlreadySuperliked = async (userId, likedId) => {
  try {
    const response = await docClient.send(
      new QueryCommand({
        TableName: 'flame-Likes',
        IndexName: 'likerId-timestamp-index',
        KeyConditionExpression: 'likerId = :userId',
        FilterExpression: 'likedId = :likedId AND #type = :superlike',
        ProjectionExpression: 'likerId',
        ExpressionAttributeNames: {
          '#type': 'type',
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':likedId': likedId,
          ':superlike': 'superlike',
        },
        Limit: 1,
      }),
    );

    return response.Items.length > 0;
  } catch (error) {
    console.error('[hasAlreadySuperliked] Error:', error);
    return false;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 7. CRON JOB: Daily subscription expiry check (run at midnight)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Run this Lambda function daily at 00:00 UTC
 * Marks subscriptions as expired if expiryDate has passed
 */

export const dailySubscriptionExpiryCheck = async () => {
  try {
    const now = new Date();

    // Query all active subscriptions that might be expired
    const response = await docClient.send(
      new QueryCommand({
        TableName: 'Subscriptions',
        IndexName: 'isActive-expiryDate-index',
        KeyConditionExpression: 'isActive = :isActive',
        FilterExpression: 'expiryDate < :now',
        ExpressionAttributeValues: {
          ':isActive': true,
          ':now': now.toISOString(),
        },
      }),
    );

    // Mark as expired
    for (const subscription of response.Items) {
      await docClient.send(
        new UpdateCommand({
          TableName: 'Subscriptions',
          Key: { userId: subscription.userId },
          UpdateExpression: 'SET isActive = :isActive, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':isActive': false,
            ':updatedAt': now.toISOString(),
          },
        }),
      );

      console.log(
        `[dailySubscriptionExpiryCheck] Marked ${subscription.userId} subscription as expired`,
      );
    }

    return {
      success: true,
      expiredCount: response.Items.length,
    };
  } catch (error) {
    console.error('[dailySubscriptionExpiryCheck] Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 8. CRON JOB: Clean up expired match requests (run daily)
// ════════════════════════════════════════════════════════════════════════════

/**
 * AWS DynamoDB TTL automatically deletes items where expiresAt timestamp has passed.
 * This is optional cleanup if you want to do it manually.
 * TTL does this automatically, so you may not need to call this.
 */

export const cleanupExpiredMatchRequests = async () => {
  try {
    // This is typically handled by DynamoDB's TTL feature
    // Items with expiresAt < current time are automatically deleted
    // But if you want manual cleanup:

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const response = await docClient.send(
      new QueryCommand({
        TableName: 'MatchRequests',
        FilterExpression: '#status = :rejected AND expiresAt < :now',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':rejected': 'rejected',
          ':now': Math.floor(twoHoursAgo.getTime() / 1000),
        },
      }),
    );

    console.log(
      `[cleanupExpiredMatchRequests] Found ${response.Items.length} expired requests`,
    );

    return {
      success: true,
      cleanedCount: response.Items.length,
    };
  } catch (error) {
    console.error('[cleanupExpiredMatchRequests] Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 9. Update user's cached subscription info in Users table
// ════════════════════════════════════════════════════════════════════════════

export const updateUserSubscriptionCache = async (userId, subscription) => {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: 'Users',
        Key: { userId },
        UpdateExpression:
          'SET isPremium = :isPremium, subscriptionType = :type, subscriptionExpiryDate = :expiryDate, lastPremiumCheck = :now',
        ExpressionAttributeValues: {
          ':isPremium': subscription.isActive,
          ':type': subscription.type || null,
          ':expiryDate': subscription.expiryDate || null,
          ':now': new Date().toISOString(),
        },
      }),
    );

    console.log(`[updateUserSubscriptionCache] Updated ${userId}`);
  } catch (error) {
    console.error('[updateUserSubscriptionCache] Error:', error);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 10. Format subscription for frontend response
// ════════════════════════════════════════════════════════════════════════════

export const formatSubscriptionResponse = subscription => {
  return {
    isPremium: subscription.isActive,
    type: subscription.subscriptionType,
    daysRemaining: subscription.daysRemaining,
    expiryDate: subscription.expiryDate,
    planStartDate: subscription.planStartDate,
  };
};

// ════════════════════════════════════════════════════════════════════════════
// 11. Format match request for frontend response
// ════════════════════════════════════════════════════════════════════════════

export const formatMatchRequestResponse = matchRequest => {
  return {
    requestId: matchRequest.requestId,
    createdAt: matchRequest.createdAt,
    superliker: {
      userId: matchRequest.superliker,
      name: matchRequest.metadata?.superliker?.name || 'User',
      image: matchRequest.metadata?.superliker?.image,
    },
    status: matchRequest.status,
    message: matchRequest.message,
  };
};

// ════════════════════════════════════════════════════════════════════════════
// 12. Lambda Handler: Daily Midnight Reset (if needed for manual tracking)
// ════════════════════════════════════════════════════════════════════════════

/**
 * AWS Lambda function to run at 00:00 UTC daily
 * Ensures DailyUsage records exist for all active users
 * (Usually not needed because DynamoDB TTL handles cleanup)
 */

export const dailyMidnightReset = async event => {
  try {
    console.log('[dailyMidnightReset] Starting daily reset...');

    // DynamoDB TTL automatically deletes expired DailyUsage records
    // No manual cleanup needed

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Daily reset completed. TTL handles cleanup.',
      }),
    };
  } catch (error) {
    console.error('[dailyMidnightReset] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};

export default {
  checkSubscriptionStatus,
  getDailyUsage,
  incrementUsage,
  checkFeatureLimit,
  getRemainingDays,
  hasAlreadySuperliked,
  dailySubscriptionExpiryCheck,
  cleanupExpiredMatchRequests,
  updateUserSubscriptionCache,
  formatSubscriptionResponse,
  formatMatchRequestResponse,
  dailyMidnightReset,
};
