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
  UpdateCommand,
} from './db.js';
import { authenticate } from './authenticate.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

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

    // ── 4. Query per gender — loop until enough results ──
    const queryForGender = async gender => {
      const items = [];
      let lastKey = parsedCursor[gender] || undefined;
      const target = parsedLimit + 20; // buffer for swiped filtering

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
          Limit: 100, // scan 100 items per page from dynamo
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

        if (!lastKey) break; // exhausted all data for this gender
      }

      return { items, lastKey };
    };

    // ── 5. Run with timeout (5s max) ──
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

    // ── 9. Format response ──
    const formattedUsers = users.map(u => ({
      userId: u.userId,
      name: u.firstName,
      age: u.ageForSort,
      image: u.imageUrls?.[0],
      hometown: u.hometown,
      gender: u.gender,
      goals: u.goals,
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

    // ─────────────────────────────────────────────
    // ── 3b. INCREMENT likeCount on target user ──  ← YE NAI LINE HAI
    // ─────────────────────────────────────────────
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

// router.post('/swipe-batch', authenticate, async (req, res) => {
//   try {
//     const { userId } = req.user;
//     const { swipes } = req.body;

//     if (!Array.isArray(swipes) || swipes.length === 0) {
//       return res
//         .status(400)
//         .json({ success: false, error: 'Swipes array is required' });
//     }

//     // ── 1. Dedupe within batch itself ──
//     const seen = new Set();
//     const validSwipes = swipes.filter(({ likedId, type }) => {
//       if (!likedId || !['like', 'superlike', 'pass'].includes(type))
//         return false;
//       if (likedId === userId) return false;
//       if (seen.has(likedId)) return false;
//       seen.add(likedId);
//       return true;
//     });

//     if (validSwipes.length === 0) {
//       return res.status(400).json({ success: false, error: 'No valid swipes' });
//     }

//     const timestamp = new Date().toISOString();

//     // ── 2. Write all swipes in parallel ──
//     await Promise.all(
//       validSwipes.map(({ likedId, type }) =>
//         docClient.send(
//           new PutCommand({
//             TableName: 'flame-Likes',
//             Item: {
//               likerId: userId,
//               likedId,
//               type,
//               timestamp,
//               isMatched: false,
//             },
//           }),
//         ),
//       ),
//     );

//     // ── 3. Check mutual matches in parallel (likes/superlikes only) ──
//     const likeSwipes = validSwipes.filter(s => s.type !== 'pass');

//     const reverseChecks = await Promise.all(
//       likeSwipes.map(({ likedId }) =>
//         docClient
//           .send(
//             new QueryCommand({
//               TableName: 'flame-Likes',
//               IndexName: 'likedId-index',
//               KeyConditionExpression: 'likedId = :userId',
//               FilterExpression:
//                 'likerId = :likedId AND #type IN (:like, :superlike)',
//               ProjectionExpression: 'likerId, likedId, #type, #ts',
//               ExpressionAttributeNames: { '#type': 'type', '#ts': 'timestamp' },
//               ExpressionAttributeValues: {
//                 ':userId': userId,
//                 ':likedId': likedId,
//                 ':like': 'like',
//                 ':superlike': 'superlike',
//               },
//             }),
//           )
//           .then(resp => ({ likedId, reverseItem: resp.Items?.[0] || null })),
//       ),
//     );

//     // ── 4. Create matches in parallel + ConditionExpression to prevent duplicates ──
//     const matchResults = await Promise.all(
//       reverseChecks
//         .filter(({ reverseItem }) => reverseItem !== null)
//         .map(async ({ likedId, reverseItem }) => {
//           const matchId = uuidv4();
//           const now = new Date().toISOString();
//           const swipe = validSwipes.find(s => s.likedId === likedId);

//           try {
//             await docClient.send(
//               new PutCommand({
//                 TableName: 'flame-Matches',
//                 Item: {
//                   matchId,
//                   user1Id: userId,
//                   user2Id: likedId,
//                   chatEnabled: true,
//                   createdAt: now,
//                   lastMessageAt: now,
//                   lastMessage: {
//                     text: '👋 New match!',
//                     senderId: 'system',
//                     timestamp: now,
//                   },
//                 },
//                 // ✅ prevent duplicate match if race condition
//                 ConditionExpression: 'attribute_not_exists(matchId)',
//               }),
//             );

//             // ✅ Update both likes as matched in parallel
//             await Promise.all([
//               docClient.send(
//                 new PutCommand({
//                   TableName: 'flame-Likes',
//                   Item: {
//                     likerId: userId,
//                     likedId,
//                     type: swipe.type,
//                     timestamp,
//                     isMatched: true,
//                   },
//                 }),
//               ),
//               docClient.send(
//                 new PutCommand({
//                   TableName: 'flame-Likes',
//                   Item: {
//                     likerId: likedId,
//                     likedId: userId,
//                     type: reverseItem.type,
//                     timestamp: reverseItem.timestamp,
//                     isMatched: true,
//                   },
//                 }),
//               ),
//             ]);

//             return { likedId, matchId };
//           } catch (e) {
//             if (e.name === 'ConditionalCheckFailedException') {
//               // match already exists, not an error
//               return { likedId, matchId: null };
//             }
//             throw e;
//           }
//         }),
//     );

//     const results = validSwipes.map(({ likedId }) => {
//       const match = matchResults.find(m => m?.likedId === likedId);
//       return { likedId, matchId: match?.matchId || null };
//     });

//     return res.status(200).json({ success: true, results });
//   } catch (error) {
//     console.error('[/swipe-batch] Error:', error);
//     return res
//       .status(500)
//       .json({ success: false, error: 'Failed to process swipe batch' });
//   }
// });
// ════════════════════════════════════════════════════════════════════════════
// GET /matches - Get current user's confirmed matches
// ════════════════════════════════════════════════════════════════════════════

router.get('/matches', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 20, cursor } = req.query;

    const parsedLimit = Math.min(parseInt(limit, 10), 100);

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
