import express from 'express';
import { docClient, PutCommand, QueryCommand } from './db.js';
import { authenticate } from './authenticate.js';
import {
  validateProfileData,
  calculateAgeFromDob,
  sanitizeImageUrls,
} from './registerHelpers.js';

const router = express.Router();

/**
 * POST /register
 *
 * Called from PreFinalScreen after the user finishes all onboarding steps.
 *
 * Flow:
 *  1. `authenticate` middleware verifies Cognito IdToken → attaches userId + email to req.user
 *  2. Profile data validated and sanitized
 *  3. Age recalculated server-side — client's value discarded
 *  4. Image URLs validated against our S3 bucket only
 *  5. User written to DynamoDB `Users` table
 *     ConditionalExpression prevents any double-registration
 */
router.post('/register', authenticate, async (req, res) => {
  try {
    const raw = req.body;
    const { userId, email } = req.user; // from verified Cognito IdToken — never from body

    // ── 1. Validate ────────────────────────────────────────────────────────────
    const errors = validateProfileData(raw);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // ── 2. Recalculate age server-side ─────────────────────────────────────────
    const age = calculateAgeFromDob(raw.dateOfBirth);

    if (age < 18) {
      return res.status(400).json({
        success: false,
        errors: ['You must be 18 or older to register'],
      });
    }

    if (age > 100) {
      return res.status(400).json({
        success: false,
        errors: ['Invalid date of birth'],
      });
    }

    // ── 3. Sanitize image URLs ──────────────────────────────────────────────────
    const safeImageUrls = sanitizeImageUrls(raw.imageUrls);
    if (safeImageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        errors: ['No valid profile images found'],
      });
    }

    // ── 4. Build the user object ────────────────────────────────────────────────
    const now = new Date().toISOString();

    const newUser = {
      // ── Keys ──
      userId, // PK — Cognito sub
      email: email.toLowerCase().trim(), // GSI: email-index

      // ── Identity ──
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      fullName: `${raw.firstName.trim()} ${raw.lastName.trim()}`,
      gender: raw.gender, // GSI PK: gender-age-index
      nonbinary: raw.nonbinary || '',

      // ── Dating ──
      dateOfBirth: raw.dateOfBirth,
      ageForSort: age, // GSI SK — Number for range queries
      datingPreferences: raw.datingPreferences,
      goals: raw.goals.trim(),

      // ── Lifestyle ──
      drink: raw.drink || '',
      smoke: raw.smoke || '',
      height: raw.height || '',
      hobbies: Array.isArray(raw.hobbies) ? raw.hobbies : [],

      // ── Location & Work ──
      hometown: raw.hometown.trim(), // GSI PK: hometown-age-index
      // Handle the 'jobtittle' typo from the client — accept all spellings
      jobTitle: (raw.jobTitle || raw.jobtittle || raw.jobtitle || '').trim(),

      // ── Media ──
      imageUrls: safeImageUrls,

      // ── Gamification ──
      roses: 1,
      likesRemaining: 25, // refill daily via Lambda/cron later
      likesResetAt: now,

      // ── Status flags ──
      isActive: true,
      isProfileComplete: true,
      isVerified: false, // for future verification badge
      isPremium: false, // for future subscription

      // ── Timestamps ──
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // ── 5. Write to DynamoDB ────────────────────────────────────────────────────
    // ConditionExpression: fails if userId already exists → prevents double-registration
    await docClient.send(
      new PutCommand({
        TableName: 'Users',
        Item: newUser,
        ConditionExpression: 'attribute_not_exists(userId)',
      }),
    );

    console.log(`[register] New user created: ${userId}`);

    return res.status(201).json({
      success: true,
      message: 'Profile registered successfully',
      userId,
    });
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      // User hit register twice — profile already exists
      return res.status(409).json({
        success: false,
        error: 'Profile already registered for this account',
      });
    }

    console.error('[register] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
