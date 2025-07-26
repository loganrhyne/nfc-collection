import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MapTileSelector from './MapTileSelector';
import L from 'leaflet';
import { useData } from '../../context/DataContext';
import styled from 'styled-components';
import colorScheme from '../../utils/colorScheme';
import equalEarthProjection from './EqualEarthProjection';
import standardProjection from './StandardProjection';

// Import Leaflet CSS - we'll need to make sure this is included in the index.html
// or add as import in the index.js file
import 'leaflet/dist/leaflet.css';
import 'proj4leaflet';

// Choose which projection to use
// Set to true to use Equal Earth, false to use standard Web Mercator
const USE_EQUAL_EARTH = false;
const projection = USE_EQUAL_EARTH ? equalEarthProjection : standardProjection;

const MapWrapper = styled.div`
  height: 100%;
  width: 100%;
  
  .leaflet-container {
    height: 100%;
    width: 100%;
    border-radius: 8px;
  }
`;

// Fix for marker icons in React-Leaflet
// Default marker icon URLs are broken in React-Leaflet
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Create custom icon for each entry type
const getEntryIcon = (type) => {
  const color = colorScheme[type] || '#999';
  
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      background-color: ${color};
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 4px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10]
  });
};

/**
 * BoundsFitter component - updates map bounds when entries change
 * Uses the useMap hook to access the Leaflet map instance and update its bounds
 */
const BoundsFitter = ({ bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds[0] && bounds[1] && 
        bounds[0][0] !== undefined && bounds[0][1] !== undefined &&
        bounds[1][0] !== undefined && bounds[1][1] !== undefined) {
      
      // Use a safe approach to set the view without animation
      try {
        // Get the center and zoom that would fit these bounds
        const center = [
          (bounds[0][0] + bounds[1][0]) / 2,
          (bounds[0][1] + bounds[1][1]) / 2
        ];
        
        // Set view safely - no animation, just immediate repositioning
        map.setView(center, 2, { animate: false });
        
        console.log('Map view set to center:', center);
      } catch (err) {
        console.error('Error setting map bounds:', err);
      }
    }
  }, [bounds, map]);

  return null;  // This is a utility component with no visual output
};

const MapView = () => {
  const { entries, filters, setSelectedEntry } = useData();
  
  // Calculate map bounds based on entry locations
  const getMapBounds = () => {
    if (!entries.length) return [[0, 0], [0, 0]];
    
    // Filter entries with valid coordinates
    const validEntries = entries.filter(entry => 
      entry.location && 
      typeof entry.location.latitude === 'number' && !isNaN(entry.location.latitude) && isFinite(entry.location.latitude) &&
      typeof entry.location.longitude === 'number' && !isNaN(entry.location.longitude) && isFinite(entry.location.longitude) &&
      entry.location.latitude >= -90 && entry.location.latitude <= 90 &&
      entry.location.longitude >= -180 && entry.location.longitude <= 180
    );
    
    if (!validEntries.length) return [[0, 0], [0, 0]];
    
    const latitudes = validEntries.map(entry => entry.location.latitude);
    const longitudes = validEntries.map(entry => entry.location.longitude);
    
    // Ensure values are finite numbers
    const minLat = Math.max(-85, Math.min(...latitudes)); // Constrain to avoid projection issues
    const maxLat = Math.min(85, Math.max(...latitudes));
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    
    // Calculate padding as a percentage of the range
    // with a minimum to ensure visibility
    const latRange = maxLat - minLat || 10; // Fallback if range is 0
    const lngRange = maxLng - minLng || 10;
    const latPadding = Math.max(latRange * 0.1, 0.5);
    const lngPadding = Math.max(lngRange * 0.1, 0.5);
    
    // Ensure bounds are within valid range
    const southWest = [
      Math.max(-85, minLat - latPadding),
      Math.max(-180, minLng - lngPadding)
    ];
    
    const northEast = [
      Math.min(85, maxLat + latPadding),
      Math.min(180, maxLng + lngPadding)
    ];
    
    return [southWest, northEast];
  };
  
  // Keep track of current bounds
  const bounds = getMapBounds();
  
  // Handle marker click to show entry details
  const handleMarkerClick = (entry) => {
    setSelectedEntry(entry);
  };
  
  // If no entries with valid locations, show a message
  if (!entries.some(entry => (
    entry.location && 
    typeof entry.location.latitude === 'number' && !isNaN(entry.location.latitude) && isFinite(entry.location.latitude) &&
    typeof entry.location.longitude === 'number' && !isNaN(entry.location.longitude) && isFinite(entry.location.longitude)
  ))) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>No entries with valid locations to display</p>
      </div>
    );
  }
  
  // Get center of map based on all entries
  const center = entries.length > 0 && entries[0].location ? 
    [entries[0].location.latitude, entries[0].location.longitude] : 
    [0, 0];
  
  return (
    <MapWrapper>
      <MapContainer 
        center={center}
        zoom={1} 
        minZoom={1}
        maxZoom={8}
        crs={projection}
        style={{ height: '100%', width: '100%' }}
      >
        {/* BoundsFitter updates the map bounds when entries change */}
        <BoundsFitter bounds={bounds} />
        
        {/* MapTileSelector provides tile layer selection UI and renders the active tile layer */}
        <MapTileSelector />
        
        {entries.map((entry) => (
          entry.location && 
          typeof entry.location.latitude === 'number' && !isNaN(entry.location.latitude) && isFinite(entry.location.latitude) &&
          typeof entry.location.longitude === 'number' && !isNaN(entry.location.longitude) && isFinite(entry.location.longitude) ? (
            <Marker
              key={entry.uuid}
              position={[entry.location.latitude, entry.location.longitude]}
              icon={getEntryIcon(entry.type)}
              eventHandlers={{
                click: () => handleMarkerClick(entry),
              }}
            >
              <Popup>
                <div>
                  <h3>{entry.title}</h3>
                  <p>{entry.type} - {entry.region}</p>
                  <p>{new Date(entry.creationDate).toLocaleDateString()}</p>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>
    </MapWrapper>
  );
};

export default MapView;