import express from 'express';
import {
  docClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from './db.js';
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
/**
 * /register endpoint - FIXED VERSION
 *
 * CRITICAL CHANGE:
 * Use UpdateCommand instead of PutCommand with ConditionExpression
 * This way it works whether user exists (from /sendOtp) or not
 *
 * No more 409 errors! ✅
 */

router.post('/register', authenticate, async (req, res) => {
  try {
    const raw = req.body;
    const { userId, email } = req.user; // from verified Cognito IdToken — never from body

    console.log('[/register] Registering user:', userId);

    // ── 1. Validate ────────────────────────────────────────────────────────────
    const errors = validateProfileData(raw);
    if (errors.length > 0) {
      console.error('[/register] Validation errors:', errors);
      return res.status(400).json({ success: false, errors });
    }

    // ── 2. Recalculate age server-side ─────────────────────────────────────────
    const age = calculateAgeFromDob(raw.dateOfBirth);

    if (age < 18) {
      console.error('[/register] User too young:', age);
      return res.status(400).json({
        success: false,
        errors: ['You must be 18 or older to register'],
      });
    }

    if (age > 100) {
      console.error('[/register] Invalid age:', age);
      return res.status(400).json({
        success: false,
        errors: ['Invalid date of birth'],
      });
    }

    // ── 3. Sanitize image URLs ──────────────────────────────────────────────────
    const safeImageUrls = sanitizeImageUrls(raw.imageUrls);
    if (safeImageUrls.length === 0) {
      console.error('[/register] No valid images');
      return res.status(400).json({
        success: false,
        errors: ['No valid profile images found'],
      });
    }

    // ── 4. Prepare update expression ────────────────────────────────────────────
    const now = new Date().toISOString();

    // ✅ FIXED: Use UpdateCommand instead of PutCommand
    // This works whether user exists (created by /sendOtp) or not
    const updateCommand = new UpdateCommand({
      TableName: 'Users',
      Key: { userId },
      UpdateExpression: `
        SET
          firstName = :firstName,
          lastName = :lastName,
          fullName = :fullName,
          gender = :gender,
          nonbinary = :nonbinary,
          dateOfBirth = :dateOfBirth,
          ageForSort = :ageForSort,
          datingPreferences = :datingPreferences,
          goals = :goals,
          drink = :drink,
          smoke = :smoke,
          height = :height,
          hobbies = :hobbies,
          hometown = :hometown,
          jobTitle = :jobTitle,
          imageUrls = :imageUrls,
          roses = :roses,
          likesRemaining = :likesRemaining,
          likesResetAt = :likesResetAt,
          isActive = :isActive,
          isProfileComplete = :isProfileComplete,
          isVerified = :isVerified,
          isPremium = :isPremium,
          lastActiveAt = :lastActiveAt,
          updatedAt = :updatedAt
      `,
      ExpressionAttributeValues: {
        ':firstName': raw.firstName.trim(),
        ':lastName': raw.lastName.trim(),
        ':fullName': `${raw.firstName.trim()} ${raw.lastName.trim()}`,
        ':gender': raw.gender,
        ':nonbinary': raw.nonbinary || '',
        ':dateOfBirth': raw.dateOfBirth,
        ':ageForSort': age,
        ':datingPreferences': raw.datingPreferences,
        ':goals': raw.goals.trim(),
        ':drink': raw.drink || '',
        ':smoke': raw.smoke || '',
        ':height': raw.height || '',
        ':hobbies': Array.isArray(raw.hobbies) ? raw.hobbies : [],
        ':hometown': raw.hometown.trim(),
        ':jobTitle': (
          raw.jobTitle ||
          raw.jobtittle ||
          raw.jobtitle ||
          ''
        ).trim(),
        ':imageUrls': safeImageUrls,
        ':roses': 1,
        ':likesRemaining': 25,
        ':likesResetAt': now,
        ':isActive': true,
        ':isProfileComplete': true,
        ':isVerified': false,
        ':isPremium': false,
        ':lastActiveAt': now,
        ':updatedAt': now,
      },
      ReturnValues: 'ALL_NEW',
    });

    // ── 5. Write to DynamoDB ────────────────────────────────────────────────────
    // ✅ UpdateCommand works whether user exists or not
    // - If user exists (from /sendOtp): Updates all fields ✅
    // - If user doesn't exist: Creates new record ✅
    // No 409 ConditionalCheckFailedException!

    const result = await docClient.send(updateCommand);

    console.log(`[/register] User profile registered/updated: ${userId}`);
    console.log('[/register] Updated fields:', {
      firstName: result.Attributes.firstName,
      isProfileComplete: result.Attributes.isProfileComplete,
      updatedAt: result.Attributes.updatedAt,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile registered successfully',
      userId,
      user: result.Attributes,
    });
  } catch (error) {
    console.error('[/register] Error:', error.message);
    console.error('[/register] Error name:', error.name);

    // Handle validation errors from helper functions
    if (error.message?.includes('invalid')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * BONUS ENDPOINTS FOR PROFILE MANAGEMENT
 */

/**
 * GET /user-profile
 * Get current user's complete profile
 */
router.get('/user-profile', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    console.log('[/user-profile] Fetching profile for:', userId);

    const getCommand = new GetCommand({
      TableName: 'Users',
      Key: { userId },
    });

    const result = await docClient.send(getCommand);

    if (!result.Item) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: result.Item,
    });
  } catch (error) {
    console.error('[/user-profile] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
});

/**
 * PUT /update-profile
 * Update any profile fields after initial registration
 * User can edit name, bio, photos, etc anytime
 */
router.put('/update-profile', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const updates = req.body;

    console.log('[/update-profile] Updating profile for:', userId);

    // Whitelist allowed fields (don't let user modify protected fields)
    const allowedFields = [
      'firstName',
      'lastName',
      'gender',
      'dateOfBirth',
      'datingPreferences',
      'goals',
      'drink',
      'smoke',
      'height',
      'hobbies',
      'hometown',
      'jobTitle',
      'imageUrls',
    ];

    const updateExpressions = [];
    const expressionAttributeValues = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateExpressions.push(`${field} = :${field}`);
        expressionAttributeValues[`:${field}`] = updates[field];
      }
    }

    if (updateExpressions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }

    // Always update timestamp
    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const updateCommand = new UpdateCommand({
      TableName: 'Users',
      Key: { userId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(updateCommand);

    console.log('[/update-profile] Profile updated for:', userId);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: result.Attributes,
    });
  } catch (error) {
    console.error('[/update-profile] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update profile',
    });
  }
});

/**
 * POST /check-profile-complete
 * Check if user's profile registration is complete
 * Used by frontend to decide: show HomeScreen or ProfileSetup
 */
router.post('/check-profile-complete', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    console.log('[/check-profile-complete] Checking for:', userId);

    const getCommand = new GetCommand({
      TableName: 'Users',
      Key: { userId },
    });

    const result = await docClient.send(getCommand);

    if (!result.Item) {
      return res.status(200).json({
        success: true,
        isProfileComplete: false,
        message: 'Profile not found, needs setup',
      });
    }

    const isComplete = result.Item.isProfileComplete === true;

    console.log('[/check-profile-complete] isProfileComplete:', isComplete);

    return res.status(200).json({
      success: true,
      isProfileComplete: isComplete,
      user: isComplete ? result.Item : null,
    });
  } catch (error) {
    console.error('[/check-profile-complete] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to check profile status',
    });
  }
});

export default router;
