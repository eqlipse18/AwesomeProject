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

const router = express.Router();
const DAILY_LIMIT = 20;

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

const shuffleArray = arr => {
  const s = [...arr];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
};

// ── BatchGet from main Users table (supports likeCount + all fields) ──
const batchFetchProfiles = async userIds => {
  if (!userIds.length) return [];
  const chunks = [];
  for (let i = 0; i < userIds.length; i += 100) {
    chunks.push(userIds.slice(i, i + 100));
  }
  const results = [];
  for (const chunk of chunks) {
    const resp = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          Users: {
            Keys: chunk.map(id => ({ userId: id })),
            ProjectionExpression:
              'userId, firstName, imageUrls, ageForSort, hometown, goals, gender, isActive, likeCount',
          },
        },
      }),
    );
    results.push(...(resp.Responses?.Users || []));
  }
  return results.filter(u => u.isActive !== false);
};

// ════════════════════════════════════════════════════════════════════════════
// GET /daily-feed
// ════════════════════════════════════════════════════════════════════════════

router.get('/daily-feed', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const todayStr = getTodayString();

    // ── 1. Cache check ──
    const cacheResp = await docClient.send(
      new GetCommand({ TableName: 'flame-DailyFeed', Key: { userId } }),
    );

    if (cacheResp.Item && cacheResp.Item.generatedAt?.startsWith(todayStr)) {
      const seenIds = new Set(cacheResp.Item.seenProfileIds || []);
      const unseenCount = (cacheResp.Item.profiles || []).filter(
        p => !seenIds.has(p.userId),
      ).length;
      return res.status(200).json({
        success: true,
        profiles: cacheResp.Item.profiles,
        unseenCount,
        cached: true,
      });
    }

    // ── 2. Already-swiped users ──
    const fetchAllSwiped = async () => {
      try {
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
      } catch (e) {
        console.warn('[/daily-feed] fetchAllSwiped failed:', e.message);
        return new Set();
      }
    };

    // ── 3a. Superliker IDs ──
    const fetchSuperlikers = async () => {
      try {
        const resp = await docClient.send(
          new QueryCommand({
            TableName: 'flame-Likes',
            IndexName: 'likedId-index',
            KeyConditionExpression: 'likedId = :userId',
            FilterExpression: '#type = :superlike',
            ExpressionAttributeNames: { '#type': 'type' },
            ExpressionAttributeValues: {
              ':userId': userId,
              ':superlike': 'superlike',
            },
            ProjectionExpression: 'likerId',
          }),
        );
        return (resp.Items || []).map(i => i.likerId);
      } catch (e) {
        console.warn('[/daily-feed] fetchSuperlikers failed:', e.message);
        return [];
      }
    };

    // ── 3b. Active booster IDs ──
    const fetchBoosters = async () => {
      try {
        const now = new Date().toISOString();
        const resp = await docClient.send(
          new QueryCommand({
            TableName: 'flame-Boosts',
            IndexName: 'status-activatedAt-index',
            KeyConditionExpression: '#status = :active',
            FilterExpression: 'expiresAt > :now AND boosterId <> :userId',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':active': 'active',
              ':now': now,
              ':userId': userId,
            },
            ProjectionExpression: 'boosterId',
          }),
        );
        return (resp.Items || []).map(i => i.boosterId);
      } catch (e) {
        console.warn('[/daily-feed] fetchBoosters failed:', e.message);
        return [];
      }
    };

    const [alreadySwiped, superlikerIds, boosterIds] = await Promise.all([
      fetchAllSwiped(),
      fetchSuperlikers(),
      fetchBoosters(),
    ]);

    // ── 4. Priority pool (superlike + boost, deduped) ──
    const priorityMap = new Map();
    superlikerIds.forEach(id => {
      if (id !== userId && !alreadySwiped.has(id))
        priorityMap.set(id, 'superlike');
    });
    boosterIds.forEach(id => {
      if (id !== userId && !alreadySwiped.has(id) && !priorityMap.has(id))
        priorityMap.set(id, 'boost');
    });

    const priorityIds = [...priorityMap.keys()];

    // ── 5. Fetch priority profiles via BatchGet (main table — has all fields) ──
    const priorityUsers = await batchFetchProfiles(priorityIds);
    const priorityProfiles = priorityUsers.map(u => ({
      userId: u.userId,
      name: u.firstName,
      age: u.ageForSort,
      image: u.imageUrls?.[0] || null,
      imageUrls: u.imageUrls || [],
      hometown: u.hometown || null,
      goals: u.goals || null,
      gender: u.gender,
      tag: priorityMap.get(u.userId),
    }));

    // ── 6. Top liked fallback ──
    let finalProfiles = [...priorityProfiles];
    const remaining = DAILY_LIMIT - finalProfiles.length;

    if (remaining > 0) {
      try {
        const priorityIdSet = new Set([...priorityIds, userId]);

        // Get current user gender prefs
        const userResp = await docClient.send(
          new GetCommand({
            TableName: 'Users',
            Key: { userId },
            ProjectionExpression: 'gender, datingPreferences',
          }),
        );

        const prefs = userResp.Item?.datingPreferences || [];
        let gendersToShow = [];
        if (prefs.includes('Men')) gendersToShow.push('Male');
        if (prefs.includes('Women')) gendersToShow.push('Female');
        if (gendersToShow.length === 0) {
          gendersToShow =
            userResp.Item?.gender === 'Male' ? ['Female'] : ['Male'];
        }

        // ✅ FIX: GSI se sirf userId fetch karo — likeCount GSI mein project nahi hai
        const gsiResults = await Promise.all(
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
                ProjectionExpression: 'userId', // ✅ sirf userId — GSI projection issue fix
                Limit: 150,
              }),
            ),
          ),
        );

        // Candidate userIds — exclude already seen + priority
        const candidateIds = gsiResults
          .flatMap(r => r.Items || [])
          .map(u => u.userId)
          .filter(id => !alreadySwiped.has(id) && !priorityIdSet.has(id));

        // ✅ BatchGet main table — yahan likeCount milega
        const candidateUsers = await batchFetchProfiles(candidateIds);

        const topLikedUsers = candidateUsers
          .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
          .slice(0, remaining);

        const topLikedProfiles = topLikedUsers.map(u => ({
          userId: u.userId,
          name: u.firstName,
          age: u.ageForSort,
          image: u.imageUrls?.[0] || null,
          imageUrls: u.imageUrls || [],
          hometown: u.hometown || null,
          goals: u.goals || null,
          gender: u.gender,
          // ✅ likeCount >= 5 toh 'top_liked' badge, warna 'discover' (plain, no special badge)
          tag: (u.likeCount || 0) >= 5 ? 'top_liked' : 'discover',
        }));
        // Threshold 5 abhi ke liye theek hai — jaise users badhenge aur likes badhenge,
        //  automatically zyada profiles top_liked mein ayenge. Baad mein 10 ya 20 kar sakte ho.

        finalProfiles = [...finalProfiles, ...topLikedProfiles];
      } catch (e) {
        console.warn('[/daily-feed] Top liked fallback failed:', e.message);
      }
    }

    // ── 7. Order: superlike → boost → top_liked (shuffled within groups) ──
    const superlikeGroup = shuffleArray(
      finalProfiles.filter(p => p.tag === 'superlike'),
    );
    const boostGroup = shuffleArray(
      finalProfiles.filter(p => p.tag === 'boost'),
    );
    const topLikedGroup = shuffleArray(
      finalProfiles.filter(p => p.tag === 'top_liked'),
    );
    const orderedProfiles = [
      ...superlikeGroup,
      ...boostGroup,
      ...topLikedGroup,
    ];

    // ── 8. Cache ──
    await docClient.send(
      new PutCommand({
        TableName: 'flame-DailyFeed',
        Item: {
          userId,
          profiles: orderedProfiles,
          seenProfileIds: [],
          generatedAt: new Date().toISOString(),
          expiresAt: getTomorrowMidnightUnix(),
        },
      }),
    );

    return res.status(200).json({
      success: true,
      profiles: orderedProfiles,
      unseenCount: orderedProfiles.length,
      cached: false,
    });
  } catch (err) {
    console.error('[/daily-feed] Error:', err.message, err.stack);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch daily feed' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /daily-feed/seen
// ════════════════════════════════════════════════════════════════════════════

router.post('/daily-feed/seen', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { seenUserId } = req.body;

    if (!seenUserId) {
      return res
        .status(400)
        .json({ success: false, error: 'seenUserId is required' });
    }

    const cacheResp = await docClient.send(
      new GetCommand({ TableName: 'flame-DailyFeed', Key: { userId } }),
    );

    if (!cacheResp.Item) {
      return res
        .status(404)
        .json({ success: false, error: 'Daily feed not found' });
    }

    const seenSet = new Set(cacheResp.Item.seenProfileIds || []);
    if (seenSet.has(seenUserId)) {
      const unseenCount = (cacheResp.Item.profiles || []).filter(
        p => !seenSet.has(p.userId),
      ).length;
      return res.status(200).json({ success: true, unseenCount });
    }

    seenSet.add(seenUserId);
    const seenProfileIds = [...seenSet];

    await docClient.send(
      new UpdateCommand({
        TableName: 'flame-DailyFeed',
        Key: { userId },
        UpdateExpression: 'SET seenProfileIds = :seenIds',
        ExpressionAttributeValues: { ':seenIds': seenProfileIds },
      }),
    );

    const unseenCount = (cacheResp.Item.profiles || []).filter(
      p => !seenSet.has(p.userId),
    ).length;

    return res.status(200).json({ success: true, unseenCount });
  } catch (err) {
    console.error('[/daily-feed/seen] Error:', err.message);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to mark as seen' });
  }
});

export default router;

// DELETE /daily-feed/cache - TESTING ONLY, production mein remove karna
// router.delete('/daily-feed/cache', authenticate, async (req, res) => {
//   try {
//     const { userId } = req.user;
//     await docClient.send(
//       new DeleteCommand({
//         TableName: 'flame-DailyFeed',
//         Key: { userId },
//       }),
//     );
//     return res.status(200).json({ success: true, message: 'Cache cleared' });
//   } catch (err) {
//     return res.status(500).json({ success: false });
//   }
// });
// DeleteCommand import bhi add karna db.js se. Ye testing mein bahut kaam aayega — har baar naye users ke baad fresh feed generate ho jayega bina midnight wait kiye. 🔥
// Aage kya karna hai bhai — boost activate/deactivate route, ya kuch aur?
