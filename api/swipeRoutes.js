/**
 * Swipe Routes for In Flame - GENDER FIX
 *
 * KEY FIX:
 * - Now reads logged-in user's datingPreferences
 * - Shows ONLY genders user prefers
 * - Ignores query parameter gender filter
 */

import express from 'express';
import {
  docClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  BatchGetCommand,
} from './db.js';
import { authenticate } from './authenticate.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ════════════════════════════════════════════════════════════════════════════
// GET /feed - Fetch paginated discover feed (FIXED GENDER FILTERING)
// ════════════════════════════════════════════════════════════════════════════

router.get('/feed', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      minAge = 18,
      maxAge = 60,
      hometown,
      limit = 10,
      cursor,
    } = req.query;

    // ── 1. Validation ──
    const parsedMinAge = parseInt(minAge, 10);
    const parsedMaxAge = parseInt(maxAge, 10);
    const parsedLimit = Math.min(parseInt(limit, 10), 50);

    if (isNaN(parsedMinAge) || isNaN(parsedMaxAge)) {
      return res.status(400).json({
        success: false,
        error: 'minAge and maxAge must be valid numbers',
      });
    }

    if (parsedMinAge < 18 || parsedMaxAge > 100) {
      return res.status(400).json({
        success: false,
        error: 'Age range must be between 18 and 100',
      });
    }

    // ── 2. CRITICAL: Fetch logged-in user's DATING PREFERENCES ──
    const loggedInUserResponse = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId },
        ProjectionExpression: 'gender, datingPreferences',
      }),
    );

    if (!loggedInUserResponse.Item) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const loggedInUserGender = loggedInUserResponse.Item.gender; // "Male" or "Female"
    const datingPreferences = loggedInUserResponse.Item.datingPreferences || []; // ["Men"] or ["Women"]

    // ── 3. Determine what genders to show ──
    let gendersToShow = [];

    if (datingPreferences.includes('Men')) {
      gendersToShow.push('Male');
    }
    if (datingPreferences.includes('Women')) {
      gendersToShow.push('Female');
    }

    // Fallback: if no preferences set, show opposite gender
    if (gendersToShow.length === 0) {
      gendersToShow = loggedInUserGender === 'Male' ? ['Female'] : ['Male'];
    }

    console.log(
      `[/feed] User ${userId} (${loggedInUserGender}) wants: ${datingPreferences.join(
        ', ',
      )} → Showing: ${gendersToShow.join(', ')}`,
    );

    // ── 4. Fetch already-swiped users ──
    const likedUsersResponse = await docClient.send(
      new QueryCommand({
        TableName: 'flame-Likes',
        IndexName: 'likerId-timestamp-index',
        KeyConditionExpression: 'likerId = :userId',
        ProjectionExpression: 'likedId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      }),
    );

    const alreadySwiped = new Set(
      likedUsersResponse.Items.map(item => item.likedId),
    );

    // ── 5. Build query based on location ──
    let allResults = [];

    // Query for EACH gender preference
    for (const gender of gendersToShow) {
      let queryParams;

      if (hometown) {
        queryParams = {
          TableName: 'Users',
          IndexName: 'hometown-age-index',
          KeyConditionExpression:
            'hometown = :hometown AND ageForSort BETWEEN :minAge AND :maxAge',
          FilterExpression:
            'isActive = :isActiveVal AND #gender = :genderVal AND userId <> :userId',
          ProjectionExpression:
            'userId, firstName, imageUrls, gender, ageForSort, hometown, goals, datingPreferences',
          ExpressionAttributeNames: {
            '#gender': 'gender',
          },
          ExpressionAttributeValues: {
            ':hometown': hometown,
            ':minAge': parsedMinAge,
            ':maxAge': parsedMaxAge,
            ':isActiveVal': true,
            ':genderVal': gender,
            ':userId': userId,
          },
          Limit: parsedLimit + 20,
        };
      } else {
        queryParams = {
          TableName: 'Users',
          IndexName: 'gender-age-index',
          KeyConditionExpression:
            'gender = :genderVal AND ageForSort BETWEEN :minAge AND :maxAge',
          FilterExpression: 'isActive = :isActiveVal AND userId <> :userId',
          ProjectionExpression:
            'userId, firstName, imageUrls, gender, ageForSort, hometown, goals, datingPreferences',
          ExpressionAttributeValues: {
            ':genderVal': gender,
            ':minAge': parsedMinAge,
            ':maxAge': parsedMaxAge,
            ':isActiveVal': true,
            ':userId': userId,
          },
          Limit: parsedLimit + 20,
        };
      }

      // Add cursor if this is the first gender being queried
      if (cursor && gender === gendersToShow[0]) {
        try {
          const decodedCursor = JSON.parse(
            Buffer.from(cursor, 'base64').toString(),
          );
          queryParams.ExclusiveStartKey = decodedCursor;
        } catch (e) {
          return res.status(400).json({
            success: false,
            error: 'Invalid cursor',
          });
        }
      }

      const response = await docClient.send(new QueryCommand(queryParams));
      allResults = allResults.concat(response.Items || []);
    }

    // ── 6. Filter out already-swiped users ──
    let filteredUsers = allResults.filter(
      user => !alreadySwiped.has(user.userId),
    );

    // ── 7. Slice to requested limit and generate next cursor ──
    const hasMore = filteredUsers.length > parsedLimit;
    const users = filteredUsers.slice(0, parsedLimit);

    let nextCursor = null;
    if (hasMore && users.length > 0) {
      // Use last user's sort key as cursor
      const lastUser = users[users.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({
          gender: lastUser.gender,
          ageForSort: lastUser.ageForSort,
        }),
      ).toString('base64');
    }

    // ── 8. Format response ──
    const formattedUsers = users.map(user => ({
      userId: user.userId,
      name: user.firstName,
      age: user.ageForSort,
      image: user.imageUrls?.[0],
      hometown: user.hometown,
      gender: user.gender,
      goals: user.goals,
    }));

    return res.status(200).json({
      success: true,
      users: formattedUsers,
      nextCursor,
      total: formattedUsers.length,
    });
  } catch (error) {
    console.error('[/feed] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch feed',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /swipe - Record a swipe and detect mutual matches
// ════════════════════════════════════════════════════════════════════════════

router.post('/swipe', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { likedId, type } = req.body;

    // ── 1. Validation ──
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

    // ── 2. Check if target user exists and is active ──
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

    // ── 3. Record swipe in Likes table ──
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

    // ── 4. Check for mutual match ──
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
          ExpressionAttributeNames: {
            '#type': 'type',
          },
          ExpressionAttributeValues: {
            ':userId': userId,
            ':likedId': likedId,
            ':like': 'like',
            ':superlike': 'superlike',
          },
        }),
      );

      if (reverseCheckResponse.Items.length > 0) {
        // Mutual like detected!
        matchDetected = true;
        matchId = uuidv4();
        const now = new Date().toISOString();

        const matchRecord = {
          matchId: matchId,
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
          }),
        );

        await Promise.all([
          docClient.send(
            new PutCommand({
              TableName: 'flame-Likes',
              Item: {
                ...likeRecord,
                isMatched: true,
              },
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

        console.log(
          `[/swipe] Match created: ${matchId} between ${userId} and ${likedId}`,
        );
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
// GET /matches - Get current user's confirmed matches
// ════════════════════════════════════════════════════════════════════════════

router.get('/matches', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 20, cursor } = req.query;

    const parsedLimit = Math.min(parseInt(limit, 10), 50);

    // ── 1. Query both user1Id-index and user2Id-index ──
    const queryParamsUser1 = {
      TableName: 'flame-Matches',
      IndexName: 'user1Id-index',
      KeyConditionExpression: 'user1Id = :userId',
      ProjectionExpression:
        'matchId, user2Id, lastMessage, lastMessageAt, createdAt',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      Limit: parsedLimit,
      ScanIndexForward: false,
    };

    if (cursor) {
      try {
        const decodedCursor = JSON.parse(
          Buffer.from(cursor, 'base64').toString(),
        );
        queryParamsUser1.ExclusiveStartKey = decodedCursor;
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid cursor',
        });
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

    // ── 2. Merge results and sort by lastMessageAt ──
    const allMatches = [
      ...user1Response.Items.map(m => ({
        ...m,
        otherUserId: m.user2Id,
      })),
      ...user2Response.Items.map(m => ({
        ...m,
        otherUserId: m.user1Id,
      })),
    ];

    allMatches.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime(),
    );

    const paginatedMatches = allMatches.slice(0, parsedLimit);

    // ── 3. Batch fetch other user's data ──
    const otherUserIds = paginatedMatches.map(m => m.otherUserId);

    // If no matches, return empty array
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

    // ── 4. Format response ──
    const formattedMatches = paginatedMatches.map(match => ({
      matchId: match.matchId,
      userId: match.otherUserId,
      name: userDataMap[match.otherUserId]?.firstName || 'Unknown',
      image: userDataMap[match.otherUserId]?.imageUrls?.[0],
      lastMessage: match.lastMessage?.text || 'No messages yet',
      lastMessageAt: match.lastMessageAt,
      createdAt: match.createdAt,
    }));

    // ── 5. Generate next cursor ──
    let nextCursor = null;
    if (paginatedMatches.length > parsedLimit) {
      const lastMatch = paginatedMatches[parsedLimit - 1];
      nextCursor = Buffer.from(
        JSON.stringify({
          matchId: lastMatch.matchId,
          user1Id: lastMatch.user1Id,
          user2Id: lastMatch.user2Id,
          lastMessageAt: lastMatch.lastMessageAt,
        }),
      ).toString('base64');
    }

    return res.status(200).json({
      success: true,
      matches: formattedMatches,
      nextCursor,
      total: formattedMatches.length,
    });
  } catch (error) {
    console.error('[/matches] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch matches',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /user-profile - Get logged-in user's profile data
// ════════════════════════════════════════════════════════════════════════════

router.get('/user-profile', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    // Fetch user from Users table
    const userResponse = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId },
        ProjectionExpression:
          'userId, firstName, lastName, ageForSort, imageUrls, gender, hometown, goals, datingPreferences',
      }),
    );

    if (!userResponse.Item) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: userResponse.Item,
    });
  } catch (error) {
    console.error('[/user-profile] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /get-user-by-id - Get user profile by userId
// ════════════════════════════════════════════════════════════════════════════

router.post('/get-user-by-id', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    console.log('[/get-user-by-id] Fetching user:', userId);

    const response = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId },
        ProjectionExpression:
          'userId, firstName, lastName, ageForSort, imageUrls, gender, hometown, goals',
      }),
    );

    if (!response.Item) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: response.Item,
    });
  } catch (error) {
    console.error('[/get-user-by-id] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
    });
  }
});

export default router;
