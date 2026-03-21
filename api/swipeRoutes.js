/**
 * Swipe Routes for In Flame - GENDER FIX + LOCATION SUPPORT
 *
 * KEY CHANGES (location):
 * - PATCH /update-location → saves lat/lng to Users table
 * - GET /feed → BatchGet now fetches lat/lng alongside isOnline/lastActiveAt
 * - formattedUsers now includes lat/lng fields
 */

import express from 'express';
import {
  docClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  BatchGetCommand,
  UpdateCommand,
} from './db.js';
import { authenticate } from './authenticate.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ════════════════════════════════════════════════════════════════════════════
// PATCH /update-location - Save user's lat/lng
// ════════════════════════════════════════════════════════════════════════════

router.patch('/update-location', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { lat, lng } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'lat and lng must be numbers',
      });
    }

    // Basic sanity check
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates',
      });
    }

    await docClient.send(
      new UpdateCommand({
        TableName: 'Users',
        Key: { userId },
        UpdateExpression: 'SET lat = :lat, lng = :lng, locationUpdatedAt = :ts',
        ExpressionAttributeValues: {
          ':lat': lat,
          ':lng': lng,
          ':ts': new Date().toISOString(),
        },
      }),
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[/update-location] Error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to update location' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /feed
// ════════════════════════════════════════════════════════════════════════════

/**
 * /feed route — with filter params from req.query
 *
 * Query params accepted:
 *   minAge       (default 18)
 *   maxAge       (default 50)
 *   distance     (default 100, used with Haversine post-filter)
 *   showMe       ("Women" | "Men" | "Everyone") — overrides gender prefs
 *   goals        (comma-separated: "serious,casual")
 *   verifiedOnly ("true")
 *   limit        (default 50, max 100)
 *   cursor       (base64 JSON)
 */

/**
 * GET /feed — Full with expandSearch auto-radius
 *
 * expandSearch logic:
 * 25km → 0 results → try 50km → 0 results → try 100km
 * Returns expandedTo in response so frontend can show toast
 */

router.get('/feed', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      minAge = 18,
      maxAge = 50,
      distance = 100,
      showMe,
      goals,
      verifiedOnly,
      expandSearch,
      customLat, // city-based origin (overrides GPS)
      customLng,
      limit = 50,
      cursor,
    } = req.query;

    const userResp = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId },
        ProjectionExpression:
          'gender, datingPreferences, lat, lng, feedFilters',
      }),
    );

    if (!userResp.Item)
      return res.status(404).json({ success: false, error: 'User not found' });

    const saved = userResp.Item.feedFilters || {};

    const parsedMinAge = parseInt(minAge ?? saved.ageMin ?? 18, 10);
    const parsedMaxAge =
      parseInt(maxAge ?? saved.ageMax ?? 50, 10) >= 50
        ? 999
        : parseInt(maxAge ?? saved.ageMax ?? 50, 10);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10), 10), 100);
    const parsedDistance =
      parseInt(distance ?? saved.distance ?? 100, 10) || 100;
    const resolvedShowMe = showMe ?? saved.showMe ?? null;
    const resolvedGoals = goals ?? saved.goals?.join(',') ?? '';
    const resolvedVerified =
      verifiedOnly ?? String(saved.verifiedOnly ?? false);
    const resolvedExpand = expandSearch ?? String(saved.expandSearch ?? true);

    // ✅ City-based origin overrides GPS
    const myLat = customLat ? parseFloat(customLat) : userResp.Item.lat ?? null;
    const myLng = customLng ? parseFloat(customLng) : userResp.Item.lng ?? null;

    const goalsFilter = resolvedGoals
      ? resolvedGoals
          .split(',')
          .map(g => g.trim())
          .filter(Boolean)
      : [];
    const verifiedFilter =
      resolvedVerified === 'true' || resolvedVerified === true;
    const shouldExpand = resolvedExpand === 'true' || resolvedExpand === true;

    if (isNaN(parsedMinAge)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid age range' });
    }

    // ── Gender resolution ──
    let gendersToShow = [];
    if (resolvedShowMe === 'Everyone') gendersToShow = ['Male', 'Female'];
    else if (resolvedShowMe === 'Men') gendersToShow = ['Male'];
    else if (resolvedShowMe === 'Women') gendersToShow = ['Female'];
    else {
      const prefs = userResp.Item.datingPreferences || [];
      if (prefs.includes('Men')) gendersToShow.push('Male');
      if (prefs.includes('Women')) gendersToShow.push('Female');
      if (gendersToShow.length === 0)
        gendersToShow = userResp.Item.gender === 'Male' ? ['Female'] : ['Male'];
    }

    // ── Fetch all swiped ──
    const fetchAllSwiped = async () => {
      const swiped = new Set();
      let lastKey;
      do {
        const resp = await docClient.send(
          new QueryCommand({
            TableName: 'flame-Likes',
            IndexName: 'likerId-timestamp-index',
            KeyConditionExpression: 'likerId = :userId',
            ProjectionExpression: 'likedId',
            ExpressionAttributeValues: { ':userId': userId },
            Limit: 1000,
            ...(lastKey && { ExclusiveStartKey: lastKey }),
          }),
        );
        (resp.Items || []).forEach(i => swiped.add(i.likedId));
        lastKey = resp.LastEvaluatedKey;
      } while (lastKey);
      return swiped;
    };

    // ── Parse cursor ──
    let parsedCursor = {};
    if (cursor) {
      try {
        parsedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
      } catch {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid cursor' });
      }
    }

    // ── Query per gender ──
    const queryForGender = async gender => {
      const items = [];
      let lastKey = parsedCursor[gender] || undefined;
      const target = parsedLimit + 20;
      while (items.length < target) {
        const resp = await docClient.send(
          new QueryCommand({
            TableName: 'Users',
            IndexName: 'gender-age-index',
            KeyConditionExpression:
              'gender = :gender AND ageForSort BETWEEN :minAge AND :maxAge',
            FilterExpression: 'isActive = :active AND userId <> :userId',
            ProjectionExpression:
              'userId, firstName, imageUrls, gender, ageForSort, hometown, goals',
            ExpressionAttributeValues: {
              ':gender': gender,
              ':minAge': parsedMinAge,
              ':maxAge': parsedMaxAge,
              ':active': true,
              ':userId': userId,
            },
            Limit: 100,
            ...(lastKey && { ExclusiveStartKey: lastKey }),
          }),
        );
        items.push(...(resp.Items || []));
        lastKey = resp.LastEvaluatedKey;
        if (!lastKey) break;
      }
      return { items, lastKey };
    };

    const withTimeout = (promise, ms = 5000) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Feed query timed out')), ms),
        ),
      ]);

    const [alreadySwiped, ...genderResults] = await withTimeout(
      Promise.all([fetchAllSwiped(), ...gendersToShow.map(queryForGender)]),
    );

    // ── Merge + dedupe + exclude swiped ──
    const seen = new Set();
    const candidates = genderResults
      .flatMap(r => r.items)
      .filter(u => {
        if (alreadySwiped.has(u.userId) || seen.has(u.userId)) return false;
        seen.add(u.userId);
        return true;
      });

    // ── BatchGet online + location ──
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    let onlineMap = {};

    if (candidates.length > 0) {
      const chunks = [];
      for (let i = 0; i < candidates.length; i += 100)
        chunks.push(candidates.slice(i, i + 100));
      await Promise.all(
        chunks.map(async chunk => {
          try {
            const batchResp = await docClient.send(
              new BatchGetCommand({
                RequestItems: {
                  Users: {
                    Keys: chunk.map(u => ({ userId: u.userId })),
                    ProjectionExpression:
                      'userId, isOnline, lastActiveAt, lat, lng, isVerified',
                  },
                },
              }),
            );
            (batchResp.Responses?.Users || []).forEach(u => {
              onlineMap[u.userId] = {
                isOnline: u.isOnline ?? false,
                lastActiveAt: u.lastActiveAt ?? null,
                lat: u.lat ?? null,
                lng: u.lng ?? null,
                isVerified: u.isVerified ?? false,
              };
            });
          } catch (e) {
            console.warn('[/feed] BatchGet chunk failed:', e.message);
          }
        }),
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // FILTER HELPER — apply all filters except distance
    // (distance applied separately for expand logic)
    // ════════════════════════════════════════════════════════════════════════

    const applyBaseFilters = arr =>
      arr
        .filter(u => {
          const lat = onlineMap[u.userId]?.lastActiveAt;
          return !lat || lat > sevenDaysAgo; // 7-day inactive filter
        })
        .filter(u => !verifiedFilter || onlineMap[u.userId]?.isVerified)
        .filter(u => {
          if (!goalsFilter.length) return true;
          return u.goals && goalsFilter.includes(u.goals);
        });

    const applyDistanceFilter = (arr, radiusKm) =>
      arr.filter(u => {
        if (radiusKm >= 100) return true; // no limit
        if (!myLat || !myLng) return true; // no origin → skip
        const uLat = onlineMap[u.userId]?.lat;
        const uLng = onlineMap[u.userId]?.lng;
        if (!uLat || !uLng) return true; // no user location → include
        return haversineDistance(myLat, myLng, uLat, uLng) <= radiusKm;
      });

    // ── Apply base filters ──
    const baseFiltered = applyBaseFilters(candidates);

    // ════════════════════════════════════════════════════════════════════════
    // AUTO-EXPAND LOGIC
    // Radii tried: original → ×2 → 100km
    // Only expands if expandSearch=true AND distance < 100
    // ════════════════════════════════════════════════════════════════════════

    let filtered = [];
    let expandedTo = null; // null = no expansion happened
    let radiusAttempts = [parsedDistance];

    if (shouldExpand && parsedDistance < 100) {
      // Build expand ladder: [25, 50, 100] or [10, 20, 40, 100] etc.
      let r = parsedDistance;
      while (r < 100) {
        r = Math.min(r * 2, 100);
        radiusAttempts.push(r);
      }
    }

    for (const radius of radiusAttempts) {
      filtered = applyDistanceFilter(baseFiltered, radius);
      if (filtered.length > 0) {
        // Found results at this radius
        if (radius !== parsedDistance) expandedTo = radius; // tell frontend
        break;
      }
      console.log(`[/feed] 0 results at ${radius}km, trying next...`);
    }

    // ── Slice to limit ──
    const users = filtered.slice(0, parsedLimit);

    // ── Next cursor ──
    const cursorMap = {};
    genderResults.forEach((r, idx) => {
      if (r.lastKey) cursorMap[gendersToShow[idx]] = r.lastKey;
    });
    const nextCursor =
      Object.keys(cursorMap).length > 0
        ? Buffer.from(JSON.stringify(cursorMap)).toString('base64')
        : null;

    // ── Format ──
    const formattedUsers = users.map(u => ({
      userId: u.userId,
      name: u.firstName,
      age: u.ageForSort,
      image: u.imageUrls?.[0] || null,
      hometown: u.hometown || null,
      gender: u.gender,
      goals: u.goals || null,
      isOnline: onlineMap[u.userId]?.isOnline ?? false,
      lastActiveAt: onlineMap[u.userId]?.lastActiveAt ?? null,
      lat: onlineMap[u.userId]?.lat ?? null,
      lng: onlineMap[u.userId]?.lng ?? null,
      isVerified: onlineMap[u.userId]?.isVerified ?? false,
    }));

    return res.status(200).json({
      success: true,
      users: formattedUsers,
      nextCursor,
      total: formattedUsers.length,
      expandedTo, // ✅ null = no expand, 50 = expanded to 50km
      originalDistance: parsedDistance,
    });
  } catch (err) {
    console.error('[/feed] Error:', err);
    const isTimeout = err.message === 'Feed query timed out';
    return res.status(isTimeout ? 504 : 500).json({
      success: false,
      error: isTimeout
        ? 'Feed took too long, try again'
        : 'Failed to fetch feed',
    });
  }
});

// ── Haversine ──
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ════════════════════════════════════════════════════════════════════════════
// POST /swipe
// ════════════════════════════════════════════════════════════════════════════

router.post('/swipe', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { likedId, type } = req.body;

    if (!likedId || !type) {
      return res.status(400).json({
        success: false,
        error: 'likedId and type are required',
      });
    }

    if (!['like', 'superlike', 'pass'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'type must be "like", "superlike", or "pass"',
      });
    }

    if (userId === likedId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot swipe on yourself',
      });
    }

    const targetUserResponse = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId: likedId },
        ProjectionExpression: 'userId, isActive',
      }),
    );

    if (!targetUserResponse.Item || !targetUserResponse.Item.isActive) {
      return res.status(400).json({
        success: false,
        error: 'User not found or inactive',
      });
    }

    const timestamp = new Date().toISOString();
    const likeRecord = {
      likerId: userId,
      likedId: likedId,
      type: type,
      timestamp: timestamp,
      isMatched: false,
    };

    await docClient.send(
      new PutCommand({
        TableName: 'flame-Likes',
        Item: likeRecord,
      }),
    );

    if (type !== 'pass') {
      await docClient.send(
        new UpdateCommand({
          TableName: 'Users',
          Key: { userId: likedId },
          UpdateExpression: 'ADD likeCount :inc',
          ExpressionAttributeValues: { ':inc': 1 },
        }),
      );
    }

    let matchDetected = false;
    let matchId = null;

    if (type !== 'pass') {
      const reverseCheckResponse = await docClient.send(
        new QueryCommand({
          TableName: 'flame-Likes',
          IndexName: 'likedId-index',
          KeyConditionExpression: 'likedId = :userId',
          FilterExpression:
            'likerId = :likedId AND #type IN (:like, :superlike)',
          ProjectionExpression: 'likerId, likedId, #type',
          ExpressionAttributeNames: { '#type': 'type' },
          ExpressionAttributeValues: {
            ':userId': userId,
            ':likedId': likedId,
            ':like': 'like',
            ':superlike': 'superlike',
          },
        }),
      );

      if (reverseCheckResponse.Items.length > 0) {
        const [existingMatch1, existingMatch2] = await Promise.all([
          docClient.send(
            new QueryCommand({
              TableName: 'flame-Matches',
              IndexName: 'user1Id-index',
              KeyConditionExpression: 'user1Id = :u1',
              FilterExpression: 'user2Id = :u2',
              ExpressionAttributeValues: { ':u1': userId, ':u2': likedId },
              Limit: 1,
            }),
          ),
          docClient.send(
            new QueryCommand({
              TableName: 'flame-Matches',
              IndexName: 'user1Id-index',
              KeyConditionExpression: 'user1Id = :u1',
              FilterExpression: 'user2Id = :u2',
              ExpressionAttributeValues: { ':u1': likedId, ':u2': userId },
              Limit: 1,
            }),
          ),
        ]);

        const alreadyMatched =
          existingMatch1.Items?.length > 0 || existingMatch2.Items?.length > 0;

        matchDetected = true;

        if (alreadyMatched) {
          matchId =
            existingMatch1.Items?.[0]?.matchId ||
            existingMatch2.Items?.[0]?.matchId;
        } else {
          matchId = uuidv4();
          const now = new Date().toISOString();

          const matchRecord = {
            matchId,
            user1Id: userId,
            user2Id: likedId,
            chatEnabled: true,
            createdAt: now,
            lastMessageAt: now,
            lastMessage: {
              text: '👋 New match!',
              senderId: 'system',
              timestamp: now,
            },
          };

          await docClient.send(
            new PutCommand({
              TableName: 'flame-Matches',
              Item: matchRecord,
              ConditionExpression: 'attribute_not_exists(matchId)',
            }),
          );

          await Promise.all([
            docClient.send(
              new PutCommand({
                TableName: 'flame-Likes',
                Item: { ...likeRecord, isMatched: true },
              }),
            ),
            docClient.send(
              new PutCommand({
                TableName: 'flame-Likes',
                Item: {
                  likerId: likedId,
                  likedId: userId,
                  type: reverseCheckResponse.Items[0].type,
                  timestamp: reverseCheckResponse.Items[0].timestamp,
                  isMatched: true,
                },
              }),
            ),
          ]);
        }
      }
    }

    return res.status(200).json({
      success: true,
      match: matchDetected,
      matchId: matchDetected ? matchId : null,
    });
  } catch (error) {
    console.error('[/swipe] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process swipe',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /matches-legacy
// ════════════════════════════════════════════════════════════════════════════

router.get('/matches-legacy', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 20, cursor } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10), 100);

    const queryParamsUser1 = {
      TableName: 'flame-Matches',
      IndexName: 'user1Id-index',
      KeyConditionExpression: 'user1Id = :userId',
      ProjectionExpression:
        'matchId, user2Id, lastMessage, lastMessageAt, createdAt',
      ExpressionAttributeValues: { ':userId': userId },
      Limit: parsedLimit,
      ScanIndexForward: false,
    };

    if (cursor) {
      try {
        queryParamsUser1.ExclusiveStartKey = JSON.parse(
          Buffer.from(cursor, 'base64').toString(),
        );
      } catch (e) {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid cursor' });
      }
    }

    const [user1Response, user2Response] = await Promise.all([
      docClient.send(new QueryCommand(queryParamsUser1)),
      docClient.send(
        new QueryCommand({
          ...queryParamsUser1,
          IndexName: 'user2Id-index',
          KeyConditionExpression: 'user2Id = :userId',
        }),
      ),
    ]);

    const allMatches = [
      ...user1Response.Items.map(m => ({ ...m, otherUserId: m.user2Id })),
      ...user2Response.Items.map(m => ({ ...m, otherUserId: m.user1Id })),
    ];

    allMatches.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime(),
    );

    const paginatedMatches = allMatches.slice(0, parsedLimit);
    const otherUserIds = paginatedMatches.map(m => m.otherUserId);

    if (otherUserIds.length === 0) {
      return res.status(200).json({
        success: true,
        matches: [],
        nextCursor: null,
        total: 0,
      });
    }

    const userDataResponse = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          Users: {
            Keys: otherUserIds.map(id => ({ userId: id })),
            ProjectionExpression: 'userId, firstName, imageUrls',
          },
        },
      }),
    );

    const userDataMap = {};
    userDataResponse.Responses.Users.forEach(user => {
      userDataMap[user.userId] = user;
    });

    const formattedMatches = paginatedMatches.map(match => ({
      matchId: match.matchId,
      userId: match.otherUserId,
      name: userDataMap[match.otherUserId]?.firstName || 'Unknown',
      image: userDataMap[match.otherUserId]?.imageUrls?.[0],
      lastMessage: match.lastMessage?.text || 'No messages yet',
      lastMessageAt: match.lastMessageAt,
      createdAt: match.createdAt,
    }));

    return res.status(200).json({
      success: true,
      matches: formattedMatches,
      nextCursor: null,
      total: formattedMatches.length,
    });
  } catch (error) {
    console.error('[/matches] Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch matches' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /user-profile
// ════════════════════════════════════════════════════════════════════════════

router.get('/user-profile', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    const userResponse = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId },
        ProjectionExpression:
          'userId, firstName, lastName, ageForSort, imageUrls, gender, hometown, goals, datingPreferences',
      }),
    );

    if (!userResponse.Item) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({ success: true, user: userResponse.Item });
  } catch (error) {
    console.error('[/user-profile] Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch user profile' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /get-user-by-id
// ════════════════════════════════════════════════════════════════════════════

router.post('/get-user-by-id', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: 'userId is required' });
    }

    const response = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId },
        ProjectionExpression:
          'userId, firstName, lastName, fullName, ageForSort, dateOfBirth, imageUrls, gender, hometown, goals, hobbies, jobTitle, #ht, drink, smoke, datingPreferences, isVerified, isPremium, isOnline, lastActiveAt',
        ExpressionAttributeNames: { '#ht': 'height' },
      }),
    );

    if (!response.Item) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({ success: true, user: response.Item });
  } catch (error) {
    console.error('[/get-user-by-id] Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch user' });
  }
});

export default router;
