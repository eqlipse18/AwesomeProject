import { CognitoJwtVerifier } from 'aws-jwt-verify';
import jwt from 'jsonwebtoken';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'id',
  clientId: process.env.COGNITO_CLIENT_ID,
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

    // ← kid check — Cognito ya custom JWT
    const decoded = jwt.decode(token, { complete: true });

    if (decoded?.header?.kid) {
      // Email flow — Cognito JWT
      const payload = await verifier.verify(token);
      req.user = {
        userId: payload.sub,
        email: payload.email,
      };
    } else {
      // Google flow — Custom JWT
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        userId: payload.userId,
        email: payload.email,
      };
    }

    next();
  } catch (error) {
    console.error('[authenticate] Error:', error.message);

    if (error.name === 'JwtExpiredError') {
      return res.status(401).json({ success: false, error: 'TOKEN_EXPIRED' });
    }

    return res.status(401).json({ success: false, error: 'INVALID_TOKEN' });
  }
};
