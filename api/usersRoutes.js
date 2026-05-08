/**
 * usersRoutes.js
 * Routes: /users/new
 */

import express from 'express';
import { docClient, BatchGetCommand, GetCommand, QueryCommand } from './db.js';
import { authenticate } from './authenticate.js';

const router = express.Router();

// ════════════════════════════════════════════════════════════════════════════
// GET /users/new — Recently joined users (last 7 days)
// ════════════════════════════════════════════════════════════════════════════

router.get('/users/new', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 20 } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10), 50);

    // 1. Get current user gender prefs
    const userResp = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId },
        ProjectionExpression: 'gender, datingPreferences',
      }),
    );

    if (!userResp.Item) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const prefs = userResp.Item.datingPreferences || [];
    let gendersToShow = [];
    if (prefs.includes('Men')) gendersToShow.push('Male');
    if (prefs.includes('Women')) gendersToShow.push('Female');
    if (gendersToShow.length === 0) {
      gendersToShow = userResp.Item.gender === 'Male' ? ['Female'] : ['Male'];
    }

    // 2. Fetch candidate userIds from GSI
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
            ProjectionExpression: 'userId',
            Limit: parsedLimit * 3,
          }),
        ),
      ),
    );

    // 3. Merge + dedupe
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

    // 4. BatchGet full profiles (createdAt lives in main table)
    const batchResp = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          Users: {
            Keys: candidateIds.map(id => ({ userId: id })),
            ProjectionExpression:
              'userId, firstName, imageUrls, ageForSort, hometown, goals, createdAt, lat, lng',
          },
        },
      }),
    );

    const allUsers = batchResp.Responses?.Users || [];

    // 5. Filter last 7 days + sort newest first
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
        lat: u.lat || null,
        lng: u.lng || null,
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
// GET /users/:userId/status
router.get('/:userId/status', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId },
        ProjectionExpression: 'isOnline, lastActiveAt',
      }),
    );
    const user = result.Item;
    if (!user) return res.status(404).json({ success: false });
    res.json({
      success: true,
      isOnline: user.isOnline || false,
      lastActiveAt: user.lastActiveAt || null,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /profile-visitors
router.get('/profile-visitors', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 50 } = req.query;

    // ✅ Premium check add karo
    const subResponse = await docClient.send(
      new GetCommand({
        TableName: 'Subscriptions',
        Key: { userId },
        ProjectionExpression: 'isActive',
      }),
    );
    const isPremium = subResponse.Item?.isActive || false;

    const visitorsResp = await docClient.send(
      new QueryCommand({
        TableName: 'ProfileVisitors',
        KeyConditionExpression: 'visitedId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        Limit: parseInt(limit, 10),
        ScanIndexForward: false,
        ProjectionExpression: 'visitorId, visitedAt',
      }),
    );

    if (!visitorsResp.Items?.length)
      return res.status(200).json({
        success: true,
        visitors: [],
        total: 0,
        blurred: !isPremium, // ← ADD
      });

    const latestVisitMap = {};
    visitorsResp.Items.forEach(item => {
      if (
        !latestVisitMap[item.visitorId] ||
        item.visitedAt > latestVisitMap[item.visitorId].visitedAt
      ) {
        latestVisitMap[item.visitorId] = item;
      }
    });

    const uniqueVisitorIds = Object.keys(latestVisitMap);

    const usersResp = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          Users: {
            Keys: uniqueVisitorIds.map(id => ({ userId: id })),
            ProjectionExpression:
              'userId, firstName, imageUrls, ageForSort, hometown, isOnline, lastActiveAt, goals',
          },
        },
      }),
    );

    const users = usersResp.Responses?.Users || [];

    const sorted = users
      .map(u => ({
        userId: u.userId,
        name: isPremium ? u.firstName : null, // ← premium gate
        age: u.ageForSort || null, // ← sabko visible
        image: u.imageUrls?.[0] || null, // ← blur frontend pe
        hometown: isPremium ? u.hometown : null,
        isOnline: u.isOnline || false, // ← sabko visible
        lastActiveAt: u.lastActiveAt || null, // ← sabko visible
        goals: isPremium ? u.goals : null,
        visitedAt: latestVisitMap[u.userId]?.visitedAt || null,
      }))
      .sort((a, b) => new Date(b.visitedAt) - new Date(a.visitedAt));

    return res.status(200).json({
      success: true,
      visitors: sorted,
      total: sorted.length,
      blurred: !isPremium, // ← ADD
    });
  } catch (error) {
    console.error('[/profile-visitors] Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch visitors' });
  }
});

// ── PATCH /user-profile ────────────────────────────────────────────────────
router.patch('/user-profile', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { firstName, bio, hometown, job, company, education, height } =
      req.body;

    const expressions = [];
    const names = {};
    const values = { ':updatedAt': new Date().toISOString() };

    const addField = (key, val, attrName) => {
      if (val === undefined) return;
      const placeholder = `:${key}`;
      const namePlaceholder = `#${key}`;
      expressions.push(`${namePlaceholder} = ${placeholder}`);
      names[namePlaceholder] = attrName || key;
      values[placeholder] = val;
    };

    addField('firstName', firstName, 'firstName');
    addField('bio', bio, 'bio');
    addField('hometown', hometown, 'hometown');
    addField('job', job, 'job');
    addField('company', company, 'company');
    addField('education', education, 'education');
    addField('height', height, 'height');

    if (expressions.length === 0)
      return res
        .status(400)
        .json({ success: false, error: 'No fields to update' });

    await docClient.send(
      new UpdateCommand({
        TableName: 'Users',
        Key: { userId },
        UpdateExpression: `SET ${expressions.join(
          ', ',
        )}, updatedAt = :updatedAt`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }),
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[PATCH /user-profile]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /auth/signout ─────────────────────────────────────────────────────
router.post('/auth/signout', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    // Update online status to false
    await docClient.send(
      new UpdateCommand({
        TableName: 'Users',
        Key: { userId },
        UpdateExpression: 'SET isOnline = :f, lastActiveAt = :t',
        ExpressionAttributeValues: {
          ':f': false,
          ':t': new Date().toISOString(),
        },
      }),
    );

    // Optional: invalidate token in DB (if you store tokens)

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[POST /auth/signout]', err.message);
    return res.status(200).json({ success: true }); // Always succeed signout
  }
});

// ── GET /users/visitors/count ──────────────────────────────────────────────
router.get('/users/visitors/count', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const resp = await docClient.send(
      new QueryCommand({
        TableName: 'flame-Visitors',
        IndexName: 'visitedId-index',
        KeyConditionExpression: 'visitedId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        Select: 'COUNT',
      }),
    );
    return res.status(200).json({ success: true, count: resp.Count || 0 });
  } catch (err) {
    return res.status(200).json({ success: true, count: 0 });
  }
});

export default router;
