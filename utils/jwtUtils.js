/**
 * JWT Token Decoder Utility
 * Decodes JWT without verification (for getting userId)
 */

export const decodeJWT = token => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const decoded = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8'),
    );
    return decoded;
  } catch (error) {
    console.error('[decodeJWT] Error:', error);
    return null;
  }
};

export const getUserIdFromToken = token => {
  const decoded = decodeJWT(token);
  return decoded?.sub || decoded?.userId || null;
};
