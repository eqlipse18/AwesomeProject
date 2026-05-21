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

// ════════════════════════════════════════════════════════════════════════════
// 1. Check if user has active subscription
// ════════════════════════════════════════════════════════════════════════════

// ── Plan limits ─────────────────────────────────────────────────────────────
export const PLAN_LIMITS = {
  free: {
    superlikes: 0,
    rewinds: 0,
    messageRequests: 0,
    boostDays: 0,
  },
  Plus: {
    superlikes: 5, // per day
    rewinds: 999, // unlimited
    messageRequests: 1, // per day
    boostDays: 15, // 1 boost every 15 days
  },
  Ultra: {
    superlikes: 999, // unlimited
    rewinds: 999, // unlimited
    messageRequests: 999, // unlimited
    boostDays: 0, // fulltime boost
  },
};

export const checkSubscriptionStatus = async userId => {
  try {
    const resp = await docClient.send(
      new GetCommand({
        TableName: 'Subscriptions',
        Key: { userId },
        ProjectionExpression: 'userId, subscriptionType, expiryDate, isActive',
      }),
    );

    const sub = resp.Item;
    if (!sub) return { isActive: false, type: null };

    // Auto-expire check
    if (new Date(sub.expiryDate) < new Date()) {
      await docClient.send(
        new UpdateCommand({
          TableName: 'Subscriptions',
          Key: { userId },
          UpdateExpression: 'SET isActive = :f, updatedAt = :t',
          ExpressionAttributeValues: {
            ':f': false,
            ':t': new Date().toISOString(),
          },
        }),
      );
      return { isActive: false, type: sub.subscriptionType };
    }

    return { isActive: sub.isActive, type: sub.subscriptionType };
  } catch (e) {
    console.error('[checkSubscriptionStatus]', e.message);
    return { isActive: false, type: null };
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
  return Math.floor(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() /
      1000,
  );
};

// ── Get today's daily usage ──────────────────────────────────────────────────
export const getDailyUsage = async userId => {
  try {
    const resp = await docClient.send(
      new GetCommand({
        TableName: 'DailyUsage',
        Key: { 'userId#date': `${userId}#${getTodayString()}` },
      }),
    );
    return resp.Item || { superlikes: 0, rewinds: 0, messageRequests: 0 };
  } catch (e) {
    return { superlikes: 0, rewinds: 0, messageRequests: 0 };
  }
};
// ════════════════════════════════════════════════════════════════════════════
// 3. Increment feature usage
// ════════════════════════════════════════════════════════════════════════════

// ── Increment usage ──────────────────────────────────────────────────────────
export const incrementUsage = async (userId, feature, planType) => {
  const todayKey = `${userId}#${getTodayString()}`;
  const usage = await getDailyUsage(userId);

  const updated = {
    'userId#date': todayKey,
    userId,
    date: getTodayString(),
    superlikes: usage.superlikes || 0,
    rewinds: usage.rewinds || 0,
    messageRequests: usage.messageRequests || 0,
    subscription: planType,
    expiresAt: getTomorrowMidnightUnix(),
    createdAt: usage.createdAt || new Date().toISOString(),
  };
  updated[feature] = (usage[feature] || 0) + 1;

  await docClient.send(
    new PutCommand({ TableName: 'DailyUsage', Item: updated }),
  );
  return updated[feature];
};

// ════════════════════════════════════════════════════════════════════════════
// 4. Check feature limit
// ════════════════════════════════════════════════════════════════════════════

export const checkFeatureLimit = async (userId, feature, sub) => {
  if (!sub.isActive)
    return { allowed: false, remaining: 0, reason: 'No subscription' };

  const limits = PLAN_LIMITS[sub.type] || PLAN_LIMITS.free;
  const limit = limits[feature] ?? 0;

  if (limit === 999) return { allowed: true, remaining: 999 };

  const usage = await getDailyUsage(userId);
  const used = usage[feature] || 0;
  const remaining = Math.max(0, limit - used);

  return { allowed: used < limit, used, remaining, limit };
};

// ── Update Users table cache ─────────────────────────────────────────────────
export const updateUserSubscriptionCache = async (userId, sub) => {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: 'Users',
        Key: { userId },
        UpdateExpression:
          'SET isPremium = :p, subscriptionType = :t, updatedAt = :u',
        ExpressionAttributeValues: {
          ':p': sub.isActive,
          ':t': sub.type || null,
          ':u': new Date().toISOString(),
        },
      }),
    );
  } catch (e) {
    console.warn('[updateUserSubscriptionCache]', e.message);
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
