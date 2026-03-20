/**
 * Nearby Routes - In Flame
 *
 * GET /nearby
 * - Fetches users within a given radius (km)
 * - Sorted by distance (closest first)
 * - Excludes already-swiped users
 * - Respects gender preferences
 * - Offset-based pagination (distance sort = no cursor possible)
 */

import express from 'express';
import { docClient, QueryCommand, GetCommand, BatchGetCommand } from './db.js';
import { authenticate } from './authenticate.js';

const router = express.Router();

// ── Haversine (same as frontend utils — server-side calc) ──
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ════════════════════════════════════════════════════════════════════════════
// GET /nearby
// ════════════════════════════════════════════════════════════════════════════

router.get('/nearby', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      radius = 25, // km
      limit = 20,
      offset = 0,
    } = req.query;

    const parsedRadius = Math.min(Math.max(parseInt(radius, 10), 1), 200);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10), 5), 50);
    const parsedOffset = Math.max(parseInt(offset, 10), 0);

    // ── 1. Get logged-in user: lat/lng + gender prefs ──
    const myResp = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId },
        ProjectionExpression: 'gender, datingPreferences, lat, lng',
      }),
    );

    if (!myResp.Item) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const myLat = myResp.Item.lat;
    const myLng = myResp.Item.lng;

    // No location saved yet
    if (myLat == null || myLng == null) {
      return res.status(200).json({
        success: true,
        users: [],
        total: 0,
        noLocation: true,
        message: 'Enable location to see nearby profiles',
      });
    }

    // ── 2. Gender prefs ──
    const prefs = myResp.Item.datingPreferences || [];
    let gendersToShow = [];
    if (prefs.includes('Men')) gendersToShow.push('Male');
    if (prefs.includes('Women')) gendersToShow.push('Female');
    if (gendersToShow.length === 0) {
      gendersToShow = myResp.Item.gender === 'Male' ? ['Female'] : ['Male'];
    }

    // ── 3. Fetch already-swiped users ──
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

    // ── 4. Fetch candidate userIds from GSI (no lat/lng here) ──
    const fetchCandidateIds = async () => {
      const ids = new Set();
      for (const gender of gendersToShow) {
        let lastKey;
        // Fetch up to 300 candidates per gender — enough to filter by radius
        let fetched = 0;
        do {
          const resp = await docClient.send(
            new QueryCommand({
              TableName: 'Users',
              IndexName: 'gender-age-index',
              KeyConditionExpression: 'gender = :gender',
              FilterExpression: 'isActive = :active AND userId <> :userId',
              ProjectionExpression: 'userId',
              ExpressionAttributeValues: {
                ':gender': gender,
                ':active': true,
                ':userId': userId,
              },
              Limit: 150,
              ...(lastKey && { ExclusiveStartKey: lastKey }),
            }),
          );
          (resp.Items || []).forEach(u => ids.add(u.userId));
          fetched += resp.Items?.length || 0;
          lastKey = resp.LastEvaluatedKey;
          if (fetched >= 300) break;
        } while (lastKey);
      }
      return [...ids];
    };

    // Run in parallel
    const [alreadySwiped, candidateIds] = await Promise.all([
      fetchAllSwiped(),
      fetchCandidateIds(),
    ]);

    // Filter swiped
    const unseenIds = candidateIds.filter(id => !alreadySwiped.has(id));

    if (unseenIds.length === 0) {
      return res.status(200).json({
        success: true,
        users: [],
        total: 0,
        hasMore: false,
      });
    }

    // ── 5. BatchGet full profile + lat/lng (in chunks of 100) ──
    const allProfiles = [];
    for (let i = 0; i < unseenIds.length; i += 100) {
      const chunk = unseenIds.slice(i, i + 100);
      try {
        const batchResp = await docClient.send(
          new BatchGetCommand({
            RequestItems: {
              Users: {
                Keys: chunk.map(id => ({ userId: id })),
                ProjectionExpression:
                  'userId, firstName, imageUrls, ageForSort, hometown, goals, gender, lat, lng, isOnline, lastActiveAt',
              },
            },
          }),
        );
        allProfiles.push(...(batchResp.Responses?.Users || []));
      } catch (e) {
        console.warn('[/nearby] BatchGet chunk failed:', e.message);
      }
    }

    // ── 6. Filter by radius + calculate distance ──
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const usersWithDistance = allProfiles
      .filter(u => {
        // Must have coords to appear in nearby
        if (u.lat == null || u.lng == null) return false;
        // 7 day inactive filter
        if (u.lastActiveAt && u.lastActiveAt < sevenDaysAgo) return false;
        return true;
      })
      .map(u => {
        const distanceKm = haversineDistance(myLat, myLng, u.lat, u.lng);
        return { ...u, distanceKm };
      })
      .filter(u => u.distanceKm <= parsedRadius)
      // ── Sort by distance (closest first) ──
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const total = usersWithDistance.length;

    // ── 7. Offset pagination ──
    const paginated = usersWithDistance.slice(
      parsedOffset,
      parsedOffset + parsedLimit,
    );

    const hasMore = parsedOffset + parsedLimit < total;

    // ── 8. Format response ──
    const formatted = paginated.map(u => ({
      userId: u.userId,
      name: u.firstName,
      age: u.ageForSort,
      image: u.imageUrls?.[0] || null,
      hometown: u.hometown || null,
      goals: u.goals || null,
      gender: u.gender,
      isOnline: u.isOnline ?? false,
      lastActiveAt: u.lastActiveAt ?? null,
      lat: u.lat,
      lng: u.lng,
      distanceKm: Math.round(u.distanceKm * 10) / 10, // 1 decimal
    }));

    return res.status(200).json({
      success: true,
      users: formatted,
      total,
      hasMore,
      nextOffset: hasMore ? parsedOffset + parsedLimit : null,
      radius: parsedRadius,
    });
  } catch (err) {
    console.error('[/nearby] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch nearby users',
    });
  }
});

export default router;
