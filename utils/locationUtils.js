/**
 * locationUtils.js
 * Pure math — no API, zero cost
 */

export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = km => {
  if (km < 1) return '1km away';
  if (km < 10) return `${Math.round(km)}km away`;
  return `${Math.round(km / 5) * 5}km away`; // rounds to nearest 5 for privacy
};

/**
 * Returns display string for location line on cards.
 *
 * Examples:
 *   "📍 Kathmandu · 8 km away"
 *   "📍 Kathmandu"
 *   null  (nothing to show)
 */
export const getLocationDisplay = (myLocation, user) => {
  const hasMyCoords = myLocation?.lat != null && myLocation?.lng != null;
  const hasUserCoords = user?.lat != null && user?.lng != null;
  const hometown = user?.hometown;

  if (hometown && hasMyCoords && hasUserCoords) {
    const km = haversineDistance(
      myLocation.lat,
      myLocation.lng,
      user.lat,
      user.lng,
    );
    return ` ${hometown} · ${formatDistance(km)}`;
  }

  if (hometown) return ` ${hometown}`;

  return null;
};
