/**
 * filterRoutes.js
 * Routes: GET /filter-preferences | PATCH /filter-preferences
 *
 * Stores per-user feed filter settings in Users table
 * under a `feedFilters` map attribute.
 *
 * feedFilters shape:
 * {
 *   ageMin: 18,
 *   ageMax: 50,
 *   distance: 100,       // km, 100 = no limit
 *   expandSearch: true,
 *   showMe: "Women",     // "Women" | "Men" | "Everyone"
 *   goals: ["serious"],  // [] = no filter
 *   verifiedOnly: false,
 * }
 */

import express from 'express';
import { docClient, GetCommand, UpdateCommand } from './db.js';
import { authenticate } from './authenticate.js';

const router = express.Router();

// ── Defaults ──
const DEFAULT_FILTERS = {
  ageMin: 18,
  ageMax: 50,
  distance: 100,
  expandSearch: true,
  showMe: null,
  goals: [],
  verifiedOnly: false,
  selectedCity: null,
  customLat: null,
  customLng: null,
};

// ════════════════════════════════════════════════════════════════════════════
// GET /filter-preferences
// ════════════════════════════════════════════════════════════════════════════

router.get('/filter-preferences', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    const response = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId },
        ProjectionExpression: 'feedFilters, hometown',
      }),
    );

    if (!response.Item) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const filters = response.Item.feedFilters
      ? { ...DEFAULT_FILTERS, ...response.Item.feedFilters }
      : DEFAULT_FILTERS;

    return res.status(200).json({
      success: true,
      filters,
      city: response.Item.hometown || null,
    });
  } catch (error) {
    console.error('[GET /filter-preferences] Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch filter preferences' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PATCH /filter-preferences
// ════════════════════════════════════════════════════════════════════════════

router.patch('/filter-preferences', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      ageRange,
      distance,
      expandSearch,
      showMe,
      goals,
      selectedCity,
      customLat,
      customLng,
      verifiedOnly,
    } = req.body;

    // ── Validation ──
    if (ageRange !== undefined) {
      if (
        !Array.isArray(ageRange) ||
        ageRange.length !== 2 ||
        ageRange[0] < 18 ||
        ageRange[1] > 50 ||
        ageRange[0] > ageRange[1]
      ) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ageRange. Must be [min, max] between 18-50',
        });
      }
    }
    if (
      distance !== undefined &&
      (typeof distance !== 'number' || distance < 1 || distance > 100)
    ) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid distance. Must be 1-100' });
    }
    if (
      showMe !== undefined &&
      !['Women', 'Men', 'Everyone'].includes(showMe)
    ) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid showMe value' });
    }
    if (goals !== undefined && !Array.isArray(goals)) {
      return res
        .status(400)
        .json({ success: false, error: 'goals must be an array' });
    }

    // ── Build updates map ──
    const updates = {};
    if (ageRange !== undefined) {
      updates.ageMin = ageRange[0];
      updates.ageMax = ageRange[1];
    }
    if (distance !== undefined) updates.distance = distance;
    if (expandSearch !== undefined) updates.expandSearch = expandSearch;
    if (
      showMe !== undefined &&
      showMe !== null &&
      !['Women', 'Men', 'Everyone'].includes(showMe)
    ) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid showMe value' });
    }
    // if (goals !== undefined) updates.goals = goals;
    if (selectedCity !== undefined) updates.selectedCity = selectedCity; // { name, lat, lng } | null
    if (customLat !== undefined) updates.customLat = customLat;
    if (customLng !== undefined) updates.customLng = customLng;
    if (verifiedOnly !== undefined) updates.verifiedOnly = verifiedOnly;

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'No valid fields to update' });
    }

    // ── Step 1: Initialize feedFilters map if not exists ──
    await docClient.send(
      new UpdateCommand({
        TableName: 'Users',
        Key: { userId },
        UpdateExpression:
          'SET feedFilters = if_not_exists(feedFilters, :emptyMap)',
        ExpressionAttributeValues: { ':emptyMap': {} },
      }),
    );

    // ── Step 2: Update nested keys ──
    const setExpressions = Object.keys(updates).map(
      k => `feedFilters.#${k} = :${k}`,
    );
    const exprAttrNames = Object.keys(updates).reduce(
      (acc, k) => ({ ...acc, [`#${k}`]: k }),
      {},
    );
    const exprAttrValues = Object.keys(updates).reduce(
      (acc, k) => ({ ...acc, [`:${k}`]: updates[k] }),
      { ':updatedAt': new Date().toISOString() },
    );

    await docClient.send(
      new UpdateCommand({
        TableName: 'Users',
        Key: { userId },
        UpdateExpression: `SET ${setExpressions.join(
          ', ',
        )}, updatedAt = :updatedAt`,
        ExpressionAttributeNames: exprAttrNames,
        ExpressionAttributeValues: exprAttrValues,
      }),
    );

    const savedFilters = { ...DEFAULT_FILTERS, ...updates };
    console.log(`[PATCH /filter-preferences] Saved for ${userId}:`, updates);

    return res.status(200).json({
      success: true,
      filters: savedFilters,
      message: 'Filter preferences saved',
    });
  } catch (error) {
    console.error('[PATCH /filter-preferences] Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to save filter preferences' });
  }
});

export default router;
