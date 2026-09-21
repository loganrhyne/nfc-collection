export const validLocation = (location) =>
  !!location &&
  Number.isFinite(location.latitude) &&
  Number.isFinite(location.longitude) &&
  Math.abs(location.latitude) <= 90 &&
  Math.abs(location.longitude) <= 180;
export function boundsFromPoints(a, b) {
  if (!a || !b || ![a.lat, a.lng, b.lat, b.lng].every(Number.isFinite))
    return null;
  return {
    south: Math.min(a.lat, b.lat),
    north: Math.max(a.lat, b.lat),
    west: Math.min(a.lng, b.lng),
    east: Math.max(a.lng, b.lng),
  };
}
