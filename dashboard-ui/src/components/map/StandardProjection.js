import L from 'leaflet';

/**
 * Standard Leaflet projection configuration
 * 
 * This is the default Web Mercator projection (EPSG:3857)
 * that Leaflet uses by default. It's a fallback in case
 * custom projections cause issues.
 */

// Create a standard CRS configuration with some optimizations
const standardProjection = L.CRS.EPSG3857;

export default standardProjection;