import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Verifies the Cognito IdToken sent from the app after confirmSignup
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID, // 'ap-south-1_GXlmQsjSF'
  tokenUse: 'id',
  clientId: process.env.COGNITO_CLIENT_ID, // '3gbksse66jn6m1dsquv52t9mut'
});

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifier.verify(token);

    // userId = Cognito sub — this becomes the PK in DynamoDB Users table
    req.user = {
      userId: payload.sub,
      email: payload.email,
    };

    next();
  } catch (error) {
    console.error('[authenticate] Error:', error.message);

    if (error.name === 'JwtExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
    });
  }
};
