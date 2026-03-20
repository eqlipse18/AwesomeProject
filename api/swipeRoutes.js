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

router.get('/feed', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      minAge = 18,
      maxAge = 60,
      hometown,
      limit = 50,
      cursor,
    } = req.query;

    const parsedMinAge = parseInt(minAge, 10);
    const parsedMaxAge = parseInt(maxAge, 10);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10), 10), 100);

    if (isNaN(parsedMinAge) || isNaN(parsedMaxAge)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid age range' });
    }

    // ── 1. Get logged-in user's gender and preferences ──
    const userResp = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId },
        ProjectionExpression: 'gender, datingPreferences',
      }),
    );

    if (!userResp.Item)
      return res.status(404).json({ success: false, error: 'User not found' });

    const loggedInGender = userResp.Item.gender;
    const prefs = userResp.Item.datingPreferences || [];
    let gendersToShow = [];
    if (prefs.includes('Men')) gendersToShow.push('Male');
    if (prefs.includes('Women')) gendersToShow.push('Female');
    if (gendersToShow.length === 0)
      gendersToShow = loggedInGender === 'Male' ? ['Female'] : ['Male'];

    // ── 2. Fetch ALL swiped users (paginated) ──
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

    // ── 3. Parse per-gender cursor map ──
    let parsedCursor = {};
    if (cursor) {
      try {
        parsedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
      } catch (e) {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid cursor' });
      }
    }

    // ── 4. Query per gender ──
    const queryForGender = async gender => {
      const items = [];
      let lastKey = parsedCursor[gender] || undefined;
      const target = parsedLimit + 20;

      while (items.length < target) {
        const params = {
          TableName: 'Users',
          IndexName: hometown ? 'hometown-age-index' : 'gender-age-index',
          ProjectionExpression:
            'userId, firstName, imageUrls, gender, ageForSort, hometown, goals',
          ExpressionAttributeValues: {
            ':isActiveVal': true,
            ':userId': userId,
            ':gender': gender,
            ':minAge': parsedMinAge,
            ':maxAge': parsedMaxAge,
          },
          Limit: 100,
          ...(lastKey && { ExclusiveStartKey: lastKey }),
        };

        if (hometown) {
          params.KeyConditionExpression =
            'hometown = :hometown AND ageForSort BETWEEN :minAge AND :maxAge';
          params.FilterExpression =
            'isActive = :isActiveVal AND userId <> :userId AND gender = :gender';
          params.ExpressionAttributeValues[':hometown'] = hometown;
        } else {
          params.KeyConditionExpression =
            'gender = :gender AND ageForSort BETWEEN :minAge AND :maxAge';
          params.FilterExpression =
            'isActive = :isActiveVal AND userId <> :userId';
        }

        const resp = await docClient.send(new QueryCommand(params));
        items.push(...(resp.Items || []));
        lastKey = resp.LastEvaluatedKey;
        if (!lastKey) break;
      }

      return { items, lastKey };
    };

    // ── 5. Run with timeout ──
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

    // ── 6. Merge + dedupe + filter swiped ──
    const seen = new Set();
    const filteredUsers = genderResults
      .flatMap(r => r.items)
      .filter(u => {
        if (alreadySwiped.has(u.userId) || seen.has(u.userId)) return false;
        seen.add(u.userId);
        return true;
      });

    // ── 7. Slice to limit ──
    const users = filteredUsers.slice(0, parsedLimit);

    // ── 7b. BatchGet main table — isOnline + lastActiveAt + lat + lng ──
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    let onlineMap = {};
    if (users.length > 0) {
      try {
        const batchResp = await docClient.send(
          new BatchGetCommand({
            RequestItems: {
              Users: {
                Keys: users.map(u => ({ userId: u.userId })),
                // ✅ lat + lng added here
                ProjectionExpression:
                  'userId, isOnline, lastActiveAt, lat, lng',
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
          };
        });
      } catch (e) {
        console.warn('[/feed] BatchGet failed:', e.message);
      }
    }

    // ── 8. Build per-gender next cursor ──
    const cursorMap = {};
    genderResults.forEach((r, idx) => {
      if (r.lastKey) {
        cursorMap[gendersToShow[idx]] = r.lastKey;
      }
    });
    const nextCursor =
      Object.keys(cursorMap).length > 0
        ? Buffer.from(JSON.stringify(cursorMap)).toString('base64')
        : null;

    // ── 9. Format + 7 din inactive filter ──
    const formattedUsers = users
      .filter(u => {
        const lat = onlineMap[u.userId]?.lastActiveAt;
        if (!lat) return true;
        return lat > sevenDaysAgo;
      })
      .map(u => ({
        userId: u.userId,
        name: u.firstName,
        age: u.ageForSort,
        image: u.imageUrls?.[0],
        hometown: u.hometown,
        gender: u.gender,
        goals: u.goals,
        isOnline: onlineMap[u.userId]?.isOnline ?? false,
        lastActiveAt: onlineMap[u.userId]?.lastActiveAt ?? null,
        // ✅ Location fields
        lat: onlineMap[u.userId]?.lat ?? null,
        lng: onlineMap[u.userId]?.lng ?? null,
      }));

    return res.status(200).json({
      success: true,
      users: formattedUsers,
      nextCursor,
      total: formattedUsers.length,
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
