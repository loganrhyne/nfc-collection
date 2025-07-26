import L from 'leaflet';
import proj4 from 'proj4';
import 'proj4leaflet';

/**
 * Equal Earth Projection definition for use with Leaflet
 * 
 * This module configures and exports the Equal Earth projection
 * which is an equal-area pseudocylindrical projection designed
 * to have less visual distortion than other equal-area projections.
 */

// Register the Equal Earth projection definition
// The PROJ string for Equal Earth
const equalEarthProj4Def = '+proj=eqearth +datum=WGS84 +wktext';

// Register the Equal Earth projection with proj4
proj4.defs('EPSG:8857', equalEarthProj4Def);

// Define the projection bounds (in projected coordinates)
// These values are approximated for the Equal Earth projection
const earthRadius = 6378137; // Earth's radius in meters
const scale = 180 / Math.PI;

// Use more conservative bounds to avoid edge issues
// Equal Earth projection has issues near the poles, so we constrain a bit
const bounds = [
  [-180, -85],  // Southwest corner
  [180, 85]     // Northeast corner
];

// Create the projection with more reasonable configuration
const equalEarthProjection = new L.Proj.CRS('EPSG:8857', equalEarthProj4Def, {
  // Fewer, more reasonable resolutions
  resolutions: [
    8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1
  ],
  origin: [0, 0],
  bounds: L.bounds([
    proj4('EPSG:8857', [bounds[0][0], bounds[0][1]]),
    proj4('EPSG:8857', [bounds[1][0], bounds[1][1]])
  ])
});

// The projection will automatically handle coordinate conversion
// We don't need to specify a custom transformation as it can cause issues
// with the Equal Earth projection

export default equalEarthProjection;