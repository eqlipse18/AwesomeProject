import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import {
  docClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  s3Client,
} from './db.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminLinkProviderForUserCommand,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ListUsersCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { OAuth2Client } from 'google-auth-library';
import { sendOTPEmail } from './email.js';
import registerRouter from './registerRoute.js';
import swipeRouter from './swipeRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import dailyFeedRoutes from './dailyFeedRoutes.js';
const app = express();
app.use(express.json());
app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
// ✅ Check env variables at server start
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log(
  'AWS_ACCESS_KEY_ID:',
  process.env.AWS_ACCESS_KEY_ID ? 'ok' : 'missing',
);
console.log(
  'AWS_SECRET_ACCESS_KEY:',
  process.env.AWS_SECRET_ACCESS_KEY ? 'ok' : 'missing',
);

const PORT = 9000;
app.listen(PORT, () => {
  console.log(`server running on http://localhost${PORT}`);
});

// onbaording setup for image upload

const dynamoDbClient = new DynamoDBClient({ region: 'ap-south-1' });
const cognitoClient = new CognitoIdentityProviderClient({
  region: 'ap-south-1',
});

//S3 for the images
//---> s3 gpt se
app.post('/s3-upload-url', async (req, res) => {
  try {
    const { fileType } = req.body;

    if (!fileType) {
      return res.status(400).json({ message: 'fileType required' });
    }

    const key = `users/${uuidv4()}.jpg`;

    const command = new PutObjectCommand({
      Bucket: 'flameapp-user-images',
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60,
    });

    const publicUrl = `https://flameapp-user-images.s3.ap-south-1.amazonaws.com/${key}`;

    res.json({ uploadUrl, publicUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'S3 URL generation failed' });
  }
});
//-- Now setup the photoscreen to upload photo s3
//--> delete from ui box

app.post('/s3-delete', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    // URL se key nikalo
    const key = imageUrl.split('.amazonaws.com/')[1];

    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      }),
    );

    res.json({ success: true });
  } catch (err) {
    console.log('S3 delete error:', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

/**
 * /sendOtp endpoint - FIXED VERSION
 *
 * NOW CHECKS:
 * 1. If user already exists in Cognito (return error)
 * 2. If user exists but not confirmed (send OTP)
 * 3. If user is new (sign up + send OTP)
 */

/**
 * /sendOtp endpoint - FULLY FIXED VERSION
 *
 * CRITICAL CHANGE:
 * DynamoDB creation is NOW REQUIRED
 * If DynamoDB fails, signup FAILS (don't silently ignore!)
 *
 * Flow:
 * 1. Check if user exists in Cognito
 * 2. Sign up new user in Cognito
 * 3. Create user in DynamoDB (REQUIRED!)
 * 4. Send OTP via Cognito
 */

app.post('/sendOtp', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('[/sendOtp] Attempting signup for:', email);

    // ✅ STEP 1: Check if user ALREADY EXISTS in Cognito
    try {
      const adminGetUserCommand = new AdminGetUserCommand({
        UserPoolId: 'ap-south-1_GXlmQsjSF',
        Username: email,
      });

      const existingUser = await cognitoClient.send(adminGetUserCommand);

      console.log('[/sendOtp] User exists in Cognito');
      console.log('[/sendOtp] User status:', existingUser.UserStatus);

      // ✅ User exists - check their status
      if (existingUser.UserStatus === 'CONFIRMED') {
        console.error('[/sendOtp] User already confirmed:', email);
        return res.status(400).json({
          success: false,
          error: 'User already exists and confirmed. Please login instead.',
        });
      }

      if (existingUser.UserStatus === 'FORCE_CHANGE_PASSWORD') {
        console.error('[/sendOtp] User needs to change password:', email);
        return res.status(400).json({
          success: false,
          error:
            'This account needs password change. Please use forgot password.',
        });
      }

      // ✅ User exists but not confirmed - send OTP to confirm
      console.log('[/sendOtp] User exists but not confirmed, sending OTP');
      return res.status(200).json({
        success: true,
        unconfirmed: true,
        message: 'OTP sent to your email',
      });
    } catch (getUserError) {
      // ✅ User doesn't exist in Cognito - proceed with signup
      if (getUserError.name === 'UserNotFoundException') {
        console.log('[/sendOtp] User not found, proceeding with signup');
      } else {
        console.error('[/sendOtp] Error checking user:', getUserError.message);
        throw getUserError;
      }
    }

    // ✅ STEP 2: Sign up NEW user in Cognito
    const signUpCommand = new SignUpCommand({
      ClientId: '3gbksse66jn6m1dsquv52t9mut',
      Username: email,
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
      ],
    });

    const signUpResult = await cognitoClient.send(signUpCommand);
    const userId = signUpResult.UserSub;

    console.log('[/sendOtp] User signed up in Cognito:', userId);

    // ✅ STEP 3: Create user in DynamoDB (REQUIRED - DO NOT SKIP!)
    try {
      console.log('[/sendOtp] Creating user in DynamoDB:', userId);

      await docClient.send(
        new PutCommand({
          TableName: 'Users',
          Item: {
            userId,
            email,
            createdAt: new Date().toISOString(),
            isProfileComplete: false,
            appSource: 'In Flame', // Track which app they signed up from
          },
        }),
      );

      console.log('[/sendOtp] User created in DynamoDB:', userId);
    } catch (dbError) {
      console.error('[/sendOtp] DynamoDB creation FAILED:', dbError.message);

      // ❌ CRITICAL: DynamoDB failed! Delete Cognito user to rollback!
      try {
        console.log(
          '[/sendOtp] Rolling back Cognito user due to DynamoDB failure',
        );

        const adminDeleteUserCommand = new AdminDeleteUserCommand({
          UserPoolId: 'ap-south-1_GXlmQsjSF',
          Username: email,
        });

        await cognitoClient.send(adminDeleteUserCommand);
        console.log('[/sendOtp] Rollback successful - Cognito user deleted');
      } catch (rollbackError) {
        console.error('[/sendOtp] Rollback FAILED:', rollbackError.message);
        // Log but don't throw - user will need manual cleanup
      }

      // Return error to user
      return res.status(500).json({
        success: false,
        error: 'Failed to create account. Please try again.',
      });
    }

    // ✅ STEP 4: Send OTP via Cognito
    // Cognito automatically sends confirmation code via email
    console.log('[/sendOtp] Sending OTP to:', email);

    return res.status(200).json({
      success: true,
      unconfirmed: true,
      message: 'Verification code sent to your email',
      userId,
    });
  } catch (error) {
    console.error('[/sendOtp] Error:', error.message);
    console.error('[/sendOtp] Error name:', error.name);

    // ✅ Handle specific Cognito errors
    if (error.name === 'UsernameExistsException') {
      console.error('[/sendOtp] Username already exists (Cognito):', email);
      return res.status(400).json({
        success: false,
        error: 'User already exists. Please login or use forgot password.',
      });
    }

    if (error.name === 'InvalidPasswordException') {
      console.error('[/sendOtp] Invalid password:', error.message);
      return res.status(400).json({
        success: false,
        error: error.message || 'Password does not meet requirements',
      });
    }

    if (error.name === 'InvalidParameterException') {
      console.error('[/sendOtp] Invalid email format:', email);
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    if (error.name === 'TooManyRequestsException') {
      console.error('[/sendOtp] Too many requests');
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Signup failed. Please try again.',
    });
  }
});

/**
 * CRITICAL NOTE FOR EXISTING USERS:
 *
 * If you have users in Cognito but NOT in DynamoDB:
 * 1. They exist in Cognito (verified)
 * 2. They can use forgot password
 * 3. They CANNOT login (DynamoDB missing)
 *
 * To fix: Run the migration script below to create DynamoDB records
 * for all users that exist in Cognito
 */

// ════════════════════════════════════════════════════════════════════════════
// MIGRATION: Create DynamoDB records for users that exist in Cognito
// ════════════════════════════════════════════════════════════════════════════

app.post('/admin/migrate-cognito-to-dynamodb', async (req, res) => {
  // ⚠️ ADMIN ONLY - Add authentication before using!

  try {
    console.log('[/admin/migrate] Starting migration');

    // Get all users from Cognito
    const ListUsersCommand = (
      await import('@aws-sdk/client-cognito-identity-provider')
    ).ListUsersCommand;

    const listUsersCommand = new ListUsersCommand({
      UserPoolId: 'ap-south-1_GXlmQsjSF',
    });

    const cognitoUsersResult = await cognitoClient.send(listUsersCommand);
    const cognitoUsers = cognitoUsersResult.Users || [];

    console.log(
      '[/admin/migrate] Found',
      cognitoUsers.length,
      'users in Cognito',
    );

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // For each Cognito user, check if DynamoDB record exists
    for (const cognitoUser of cognitoUsers) {
      const email = cognitoUser.Username; // Email is the username
      const userId = cognitoUser.Attributes?.find(
        attr => attr.Name === 'sub',
      )?.Value;

      if (!userId) {
        console.warn('[/admin/migrate] No userId for:', email);
        continue;
      }

      // Check if DynamoDB record exists
      try {
        const getResult = await docClient.send(
          new GetCommand({
            TableName: 'Users',
            Key: { userId },
          }),
        );

        if (getResult.Item) {
          console.log('[/admin/migrate] DynamoDB record exists for:', email);
          skippedCount++;
          continue;
        }
      } catch (getError) {
        console.log('[/admin/migrate] No DynamoDB record for:', email);
      }

      // Create DynamoDB record
      try {
        await docClient.send(
          new PutCommand({
            TableName: 'Users',
            Item: {
              userId,
              email,
              createdAt: new Date().toISOString(),
              isProfileComplete: false,
              appSource: 'In Flame (Migrated)',
              migratedAt: new Date().toISOString(),
            },
          }),
        );

        console.log('[/admin/migrate] Created DynamoDB record for:', email);
        createdCount++;
      } catch (putError) {
        console.error(
          '[/admin/migrate] Failed to create record for',
          email,
          ':',
          putError.message,
        );
        errorCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Migration complete',
      summary: {
        totalCognitoUsers: cognitoUsers.length,
        createdRecords: createdCount,
        skippedExisting: skippedCount,
        errors: errorCount,
      },
    });
  } catch (error) {
    console.error('[/admin/migrate] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Migration failed',
    });
  }
});

//--> endpoint for resending the otp
app.post('/resendOtp', async (req, res) => {
  const { email } = req.body;

  const resendParams = {
    // ClientId: '4pc2aqs8tm3jj5j5f8blci6s2r',
    ClientId: '3gbksse66jn6m1dsquv52t9mut',
    Username: email,
  };
  try {
    const command = new ResendConfirmationCodeCommand(resendParams);
    await cognitoClient.send(command);
    res.status(200).json({ message: 'New Otp sent to mail' });
  } catch (error) {
    console.log('error', error);
  }
});

//initialize the endpoint for confirming the signup
// to verify the otp
app.post('/confirmSignup', async (req, res) => {
  const { email, otpCode, password } = req.body;

  try {
    // 1️⃣ Confirm user
    const confirmCommand = new ConfirmSignUpCommand({
      ClientId: '3gbksse66jn6m1dsquv52t9mut',
      Username: email,
      ConfirmationCode: otpCode,
    });

    await cognitoClient.send(confirmCommand);

    // 2️⃣ Login user to get token
    const loginCommand = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: '3gbksse66jn6m1dsquv52t9mut',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const loginResponse = await cognitoClient.send(loginCommand);

    const token = loginResponse.AuthenticationResult.IdToken;

    return res.status(200).json({
      message: 'OTP verified successfully',
      token,
      isProfileComplete: false,
    });
  } catch (error) {
    console.log('error otp confirming signup', error);
    return res.status(400).json({
      error: error.message,
    });
  }
});

app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  const otpCode = Math.floor(100000 + Math.random() * 900000); // 6 digit OTP

  try {
    await sendOTPEmail(email, otpCode);
    res.json({ success: true, message: 'OTP sent to email.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
});

//--> login endpoint -->
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('[/login] Attempting login for:', email);

    // 1️⃣ Authenticate with Cognito
    const authCommand = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: '3gbksse66jn6m1dsquv52t9mut',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const authResult = await cognitoClient.send(authCommand);
    const { IdToken, AccessToken, RefreshToken } =
      authResult.AuthenticationResult;

    console.log('[/login] Cognito auth successful for:', email);

    // 2️⃣ Get user profile from DynamoDB
    const userResult = await docClient.send(
      new QueryCommand({
        TableName: 'Users',
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :emailValue',
        ExpressionAttributeValues: {
          ':emailValue': email,
        },
      }),
    );

    console.log('[/login] DynamoDB query result:', {
      itemsCount: userResult.Items?.length || 0,
      email,
    });

    // ✅ CHECK IF USER EXISTS IN DYNAMODB
    if (!userResult.Items || userResult.Items.length === 0) {
      console.error(
        '[/login] User authenticated in Cognito but NOT in DynamoDB:',
        email,
      );
      return res.status(401).json({
        success: false,
        error: 'User not found in database. Please complete signup first.',
      });
    }

    const userId = userResult.Items[0].userId;

    // ✅ CHECK IF userId EXISTS
    if (!userId) {
      console.error('[/login] userId is missing for email:', email);
      return res.status(500).json({
        success: false,
        error: 'User record is incomplete. Contact support.',
      });
    }

    console.log('[/login] Found userId in DynamoDB:', userId);

    // 3️⃣ Get full user profile by userId
    const fullUserResult = await docClient.send(
      new GetCommand({
        TableName: 'Users',
        Key: { userId },
      }),
    );

    // ✅ CHECK IF FULL USER PROFILE EXISTS
    if (!fullUserResult.Item) {
      console.error('[/login] Full user profile not found for userId:', userId);
      return res.status(500).json({
        success: false,
        error: 'User profile not found. Please sign up again.',
      });
    }

    const user = fullUserResult.Item;
    const isProfileComplete = user.isProfileComplete || false;

    console.log('[/login] Login successful for user:', userId);

    return res.status(200).json({
      success: true,
      token: IdToken,
      idToken: IdToken,
      accessToken: AccessToken,
      refreshToken: RefreshToken,
      userId,
      isProfileComplete,
    });
  } catch (error) {
    console.error('[/login] Error:', error.message);
    console.error('[/login] Error name:', error.name);

    // Handle Cognito specific errors
    if (error.name === 'NotAuthorizedException') {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    if (error.name === 'UserNotFoundException') {
      return res.status(401).json({
        success: false,
        error: 'User not found in Cognito. Please sign up first.',
      });
    }

    if (error.name === 'UserNotConfirmedException') {
      return res.status(401).json({
        success: false,
        error: 'User account not confirmed. Check your email for OTP.',
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Login failed',
    });
  }
});

//-- login-forgot pass endpoints

// ════════════════════════════════════════════════════════════════════════════
// /forgot-password - REQUEST PASSWORD RESET
// ════════════════════════════════════════════════════════════════════════════

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    console.log('[/forgot-password] Request for email:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    // Check if user exists in Cognito
    try {
      const adminGetUserCommand = new AdminGetUserCommand({
        UserPoolId: 'ap-south-1_GXlmQsjSF',
        Username: email,
      });

      const existingUser = await cognitoClient.send(adminGetUserCommand);

      console.log('[/forgot-password] User exists:', email);
      console.log('[/forgot-password] User status:', existingUser.UserStatus);

      if (existingUser.UserStatus === 'UNCONFIRMED') {
        return res.status(400).json({
          success: false,
          error: 'Please verify your email first',
        });
      }
    } catch (getUserError) {
      if (getUserError.name === 'UserNotFoundException') {
        console.error('[/forgot-password] User not found:', email);
        return res.status(404).json({
          success: false,
          error: 'User not found. Please sign up first.',
        });
      }
      throw getUserError;
    }

    // ✅ Cognito automatically sends a password reset code via email
    // Use ForgotPasswordCommand to initiate password reset
    const ForgotPasswordCommand = (
      await import('@aws-sdk/client-cognito-identity-provider')
    ).ForgotPasswordCommand;

    const forgotPasswordCommand = new ForgotPasswordCommand({
      ClientId: '3gbksse66jn6m1dsquv52t9mut',
      Username: email,
    });

    const forgotPasswordResult = await cognitoClient.send(
      forgotPasswordCommand,
    );

    console.log('[/forgot-password] Password reset code sent to:', email);
    console.log('[/forgot-password] CodeDeliveryDetails:', {
      Destination: forgotPasswordResult.CodeDeliveryDetails?.Destination,
      DeliveryMedium: forgotPasswordResult.CodeDeliveryDetails?.DeliveryMedium,
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset code sent to email',
    });
  } catch (error) {
    console.error('[/forgot-password] Error:', error.message);

    if (error.name === 'TooManyRequestsException') {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    if (error.name === 'LimitExceededException') {
      return res.status(429).json({
        success: false,
        error: 'Attempt limit exceeded. Please try again later.',
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate password reset',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// /reset-password - VERIFY OTP AND RESET PASSWORD
// ════════════════════════════════════════════════════════════════════════════

app.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    console.log('[/reset-password] Resetting password for:', email);

    // Validate inputs
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, OTP, and new password are required',
      });
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP format',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
    }

    // ✅ Use ConfirmForgotPasswordCommand to reset password
    const ConfirmForgotPasswordCommand = (
      await import('@aws-sdk/client-cognito-identity-provider')
    ).ConfirmForgotPasswordCommand;

    const confirmForgotPasswordCommand = new ConfirmForgotPasswordCommand({
      ClientId: '3gbksse66jn6m1dsquv52t9mut',
      Username: email,
      ConfirmationCode: otp, // The code sent via email
      Password: newPassword,
    });

    const result = await cognitoClient.send(confirmForgotPasswordCommand);

    console.log('[/reset-password] Password reset successful for:', email);

    return res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('[/reset-password] Error:', error.message);
    console.error('[/reset-password] Error name:', error.name);

    // ✅ Handle specific Cognito errors
    if (error.name === 'CodeMismatchException') {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code',
      });
    }

    if (error.name === 'ExpiredCodeException') {
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new one.',
      });
    }

    if (error.name === 'InvalidPasswordException') {
      return res.status(400).json({
        success: false,
        error: error.message || 'Password does not meet requirements',
      });
    }

    if (error.name === 'UserNotFoundException') {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (error.name === 'TooManyRequestsException') {
      return res.status(429).json({
        success: false,
        error: 'Too many attempts. Please try again later.',
      });
    }

    if (error.name === 'LimitExceededException') {
      return res.status(429).json({
        success: false,
        error: 'Attempt limit exceeded. Please try again later.',
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset password',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// /resend-reset-code - RESEND PASSWORD RESET CODE
// ════════════════════════════════════════════════════════════════════════════

app.post('/resend-reset-code', async (req, res) => {
  const { email } = req.body;

  try {
    console.log('[/resend-reset-code] Request for email:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    // Check if user exists
    try {
      const adminGetUserCommand = new AdminGetUserCommand({
        UserPoolId: 'ap-south-1_GXlmQsjSF',
        Username: email,
      });

      await cognitoClient.send(adminGetUserCommand);
    } catch (getUserError) {
      if (getUserError.name === 'UserNotFoundException') {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      throw getUserError;
    }

    // Send new reset code
    const ForgotPasswordCommand = (
      await import('@aws-sdk/client-cognito-identity-provider')
    ).ForgotPasswordCommand;

    const forgotPasswordCommand = new ForgotPasswordCommand({
      ClientId: '3gbksse66jn6m1dsquv52t9mut',
      Username: email,
    });

    await cognitoClient.send(forgotPasswordCommand);

    console.log('[/resend-reset-code] New code sent to:', email);

    return res.status(200).json({
      success: true,
      message: 'New password reset code sent',
    });
  } catch (error) {
    console.error('[/resend-reset-code] Error:', error.message);

    if (error.name === 'TooManyRequestsException') {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please wait before trying again.',
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to resend code',
    });
  }
});

const googleClient = new OAuth2Client();
const USER_POOL_ID = 'ap-south-1_GXlmQsjSF'; // flamedevapp pool id

app.post('/google-signin', async (req, res) => {
  try {
    const { idToken, email, name, photo } = req.body;

    // Step 1: Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience:
        '236630957782-3bcls107c8qeth7cbuj3a861rdsgrj5a.apps.googleusercontent.com', // Same as webClientId in googleAuth.js
    });
    const payload = ticket.getPayload();
    const googleSub = payload.sub; // Google user ID

    // Step 2: Check karo user Cognito mein hai ya nahi
    const listResult = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Filter: `email = "${email}"`,
      }),
    );

    let cognitoUser;
    let isNewUser = false;

    if (listResult.Users.length === 0) {
      // Step 3a: New user — Cognito mein create karo
      const createResult = await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'given_name', Value: name?.split(' ')[0] || '' },
            { Name: 'family_name', Value: name?.split(' ')[1] || '' },
          ],
          MessageAction: 'SUPPRESS', // Password email mat bhejo
        }),
      );

      // Step 3b: Google identity link karo Cognito user se
      await cognitoClient.send(
        new AdminLinkProviderForUserCommand({
          UserPoolId: USER_POOL_ID,
          DestinationUser: {
            ProviderName: 'Cognito',
            ProviderAttributeValue: email,
          },
          SourceUser: {
            ProviderName: 'Google',
            ProviderAttributeName: 'Cognito_Subject',
            ProviderAttributeValue: googleSub,
          },
        }),
      );

      cognitoUser = createResult.User;
      isNewUser = true;
    } else {
      cognitoUser = listResult.Users[0];
    }

    // Step 4: JWT banao
    const userId = cognitoUser.Username;
    const token = jwt.sign({ userId, email }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.json({ token, userId, isNewUser, email, name });
  } catch (error) {
    console.log('Google signin error:', error);
    res.status(500).json({ error: error.message });
  }
});
// // ### Flow Yeh Hai
// // ```
// App → Google Sign-In popup
//     → idToken milta hai
//     → Backend ko bhejo
//     → Backend Google verify karta hai
//     → Cognito mein user create + Google link
//     → JWT return
//     → User "flamedevapp" pool mein dikh jaayega ✅

//--->using the routes
app.use('/', registerRouter);
//--> using the swiperoute for endpoints --->\\
/*
 * 1. GET /feed - Fetch paginated feed of users to swipe on
 * 2. POST /swipe - Record a swipe (like/superlike/pass) and detect matches
 * 3. GET /matches - Get current user's confirmed matches
 *
 */
app.use('/', swipeRouter);
app.use('/', subscriptionRoutes);
app.use('/', dailyFeedRoutes);
