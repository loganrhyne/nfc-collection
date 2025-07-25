import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useData } from '../../context/DataContext';
import styled from 'styled-components';
import colorScheme from '../../utils/colorScheme';

// Import Leaflet CSS - we'll need to make sure this is included in the index.html
// or add as import in the index.js file
import 'leaflet/dist/leaflet.css';

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

const MapView = () => {
  const { entries, setSelectedEntry } = useData();
  
  // Calculate map bounds based on entry locations
  const getMapBounds = () => {
    if (!entries.length) return [[0, 0], [0, 0]];
    
    const validEntries = entries.filter(entry => 
      entry.location && entry.location.latitude && entry.location.longitude
    );
    
    if (!validEntries.length) return [[0, 0], [0, 0]];
    
    const latitudes = validEntries.map(entry => entry.location.latitude);
    const longitudes = validEntries.map(entry => entry.location.longitude);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    
    // Add some padding
    const padding = 0.5;
    return [
      [minLat - padding, minLng - padding],
      [maxLat + padding, maxLng + padding]
    ];
  };
  
  // Handle marker click to show entry details
  const handleMarkerClick = (entry) => {
    setSelectedEntry(entry);
  };
  
  // If no entries with valid locations, show a message
  if (!entries.some(entry => entry.location && entry.location.latitude && entry.location.longitude)) {
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
        zoom={2} 
        bounds={getMapBounds()}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {entries.map((entry) => (
          entry.location && entry.location.latitude && entry.location.longitude ? (
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