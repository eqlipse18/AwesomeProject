import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { s3Client } from './db.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
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
  const { email, otpCode } = req.body; // ✅ SAME NAME

  const confirmParams = {
    ClientId: '3gbksse66jn6m1dsquv52t9mut',
    Username: email,
    ConfirmationCode: otpCode,
  };

  try {
    const command = new ConfirmSignUpCommand(confirmParams);
    await cognitoClient.send(command);

    return res.status(200).json({
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.log('error confirming signup', error);
    return res.status(400).json({
      error: error.message,
    });
  }
});
