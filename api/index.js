import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { PutCommand, QueryCommand, s3Client } from './db.js';
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
} from '@aws-sdk/client-cognito-identity-provider';
import { OAuth2Client } from 'google-auth-library';
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

app.post('/sendOtp', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const signUpParams = {
    ClientId: '3gbksse66jn6m1dsquv52t9mut',
    Username: email,
    Password: password,
    UserAttributes: [{ Name: 'email', Value: email }],
  };

  try {
    const command = new SignUpCommand(signUpParams);
    await cognitoClient.send(command);

    return res.status(200).json({ message: 'OTP sent successfully!' });
  } catch (error) {
    console.log('Error sending OTP:', error);

    // handle special Cognito errors
    if (error.name === 'UsernameExistsException') {
      try {
        // check if user is confirmed
        const userParams = {
          UserPoolId: 'ap-south-1_GXlmQsjSF',
          Username: email,
        };
        const { UserStatus } = await cognitoClient.send(
          new AdminGetUserCommand(userParams),
        );

        if (UserStatus === 'CONFIRMED') {
          return res
            .status(409)
            .json({ error: 'User already exists and confirmed' });
        } else if (UserStatus === 'UNCONFIRMED') {
          // user exists but not confirmed → send OTP again
          const resendParams = {
            ClientId: '3gbksse66jn6m1dsquv52t9mut',
            Username: email,
          };
          await cognitoClient.send(
            new ResendConfirmationCodeCommand(resendParams),
          );

          return res.status(200).json({
            message: 'User exists but not confirmed, OTP resent',
            unconfirmed: true,
          });
        }
      } catch (e) {
        console.log('Error checking user status:', e);
        return res.status(500).json({ error: 'Failed to check user status' });
      }
    }

    return res
      .status(400)
      .json({ error: error.message || 'Failed to send OTP, please try again' });
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
