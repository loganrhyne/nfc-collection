import L from 'leaflet';
import 'proj4leaflet';
import proj4 from 'proj4';

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
const bounds = [
  [-180 * scale, -90 * scale],
  [180 * scale, 90 * scale]
];

// Create the projection
const equalEarthProjection = new L.Proj.CRS('EPSG:8857', equalEarthProj4Def, {
  resolutions: [
    32768, 16384, 8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1, 0.5
  ],
  origin: [0, 0],
  bounds: L.bounds(bounds),
  transformation: new L.Transformation(1, 0, -1, 0)
});

// Create a transformation to handle the conversion from lat/lng to projection coordinates
equalEarthProjection.transformation = new L.Transformation(
  1 / 360, 
  0.5, 
  -1 / 360, 
  0.5
);

export default equalEarthProjection;