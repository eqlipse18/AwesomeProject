/**
 * Validates all required profile fields sent from PreFinalScreen.
 * Password is NOT validated here — Cognito owns auth entirely.
 */
export const validateProfileData = data => {
  const errors = [];

  if (!data.firstName?.trim()) errors.push('First name is required');
  if (!data.lastName?.trim()) errors.push('Last name is required');
  if (!data.gender) errors.push('Gender is required');
  if (!data.goals?.trim()) errors.push('Relationship goal is required');
  if (!data.hometown?.trim()) errors.push('Hometown is required');

  if (!data.dateOfBirth) {
    errors.push('Date of birth is required');
  } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data.dateOfBirth)) {
    errors.push('Date of birth must be in MM/DD/YYYY format');
  }

  if (
    !Array.isArray(data.datingPreferences) ||
    data.datingPreferences.length === 0
  ) {
    errors.push('At least one dating preference is required');
  }

  if (!Array.isArray(data.imageUrls) || data.imageUrls.length === 0) {
    errors.push('At least one profile image is required');
  }

  return errors;
};

/**
 * Recalculates age server-side from MM/DD/YYYY.
 * Client's age value is always discarded — never trust it.
 */
export const calculateAgeFromDob = dateOfBirth => {
  const [month, day, year] = dateOfBirth.split('/').map(Number);
  const dob = new Date(year, month - 1, day);
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

/**
 * Only allows image URLs from your own S3 bucket.
 * Blocks any attempt to inject external URLs.
 */
const ALLOWED_S3_BUCKET = process.env.S3_BUCKET_NAME || 'flameapp-user-images';

export const sanitizeImageUrls = urls => {
  return urls.filter(url => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.includes(ALLOWED_S3_BUCKET);
    } catch {
      return false;
    }
  });
};
