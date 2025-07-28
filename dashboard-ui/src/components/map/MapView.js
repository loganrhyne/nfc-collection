import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Rectangle } from 'react-leaflet';
import MapTileSelector from './MapTileSelector';
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
  position: relative;
  
  .leaflet-container {
    height: 100%;
    width: 100%;
    border-radius: 8px;
  }
`;

const MapControls = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  background-color: white;
  padding: 5px;
  border-radius: 4px;
  box-shadow: 0 1px 5px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const ControlButton = styled.button`
  padding: 6px 10px;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: #f5f5f5;
  }
  
  &.active {
    background-color: #e1f5fe;
    border-color: #2196f3;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
 * BoundsFitter component - updates map bounds when entries change and handles area selection
 * Uses the useMap hook to access the Leaflet map instance and update its bounds
 */
const BoundsFitter = ({ bounds, areaSelectionMode, onSelectionComplete }) => {
  const map = useMap();
  const [startPoint, setStartPoint] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [selectionActive, setSelectionActive] = useState(false);
  
  // Handle map bounds update
  useEffect(() => {
    if (bounds && bounds[0] && bounds[1] && !areaSelectionMode) {
      // Convert to Leaflet bounds format
      const leafletBounds = L.latLngBounds(bounds);
      
      // Only update if bounds are valid
      if (leafletBounds.isValid()) {
        // Use flyToBounds for a smooth animation
        map.flyToBounds(leafletBounds, {
          padding: [50, 50],  // Add padding in pixels
          maxZoom: 12,        // Limit maximum zoom level
          duration: 0.5       // Animation duration in seconds
        });
      }
    }
  }, [bounds, map, areaSelectionMode]);

  // Set up map event handlers for area selection
  useEffect(() => {
    if (!map) return;
    
    // Enable or disable dragging based on selection mode
    if (areaSelectionMode) {
      map.dragging.disable();
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.dragging.enable();
      map.getContainer().style.cursor = '';
      setStartPoint(null);
      setCurrentPoint(null);
      setSelectionActive(false);
    }
    
    // Define the event handlers
    const handleMouseDown = (e) => {
      if (areaSelectionMode) {
        setStartPoint(e.latlng);
        setCurrentPoint(e.latlng);
        setSelectionActive(true);
      }
    };
    
    const handleMouseMove = (e) => {
      if (areaSelectionMode && selectionActive) {
        setCurrentPoint(e.latlng);
      }
    };
    
    const handleMouseUp = (e) => {
      if (areaSelectionMode && selectionActive && startPoint) {
        setSelectionActive(false);
        
        // Create bounds from the two points
        const bounds = L.latLngBounds(
          L.latLng(
            Math.min(startPoint.lat, e.latlng.lat),
            Math.min(startPoint.lng, e.latlng.lng)
          ),
          L.latLng(
            Math.max(startPoint.lat, e.latlng.lat),
            Math.max(startPoint.lng, e.latlng.lng)
          )
        );
        
        // Call the callback with the bounds
        if (onSelectionComplete && bounds.isValid()) {
          onSelectionComplete(bounds);
        }
      }
    };
    
    // Add the event listeners
    if (areaSelectionMode) {
      map.on('mousedown', handleMouseDown);
      map.on('mousemove', handleMouseMove);
      map.on('mouseup', handleMouseUp);
    }
    
    // Clean up
    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
    };
  }, [map, areaSelectionMode, onSelectionComplete, startPoint, selectionActive]);

  // Render selection rectangle if selection is active
  return (
    <>
      {areaSelectionMode && startPoint && currentPoint && (
        <Rectangle
          bounds={[
            [
              Math.min(startPoint.lat, currentPoint.lat),
              Math.min(startPoint.lng, currentPoint.lng)
            ],
            [
              Math.max(startPoint.lat, currentPoint.lat),
              Math.max(startPoint.lng, currentPoint.lng)
            ]
          ]}
          pathOptions={{
            color: '#1976d2',
            weight: 2,
            fillOpacity: 0.2,
            opacity: 0.7
          }}
        />
      )}
    </>
  );
};

const MapView = () => {
  const { 
    entries, 
    filters, 
    setSelectedEntry, 
    setFilter,
    resetFilters 
  } = useData();
  
  // State for area selection mode
  const [areaSelectionMode, setAreaSelectionMode] = useState(false);
  // Calculate map bounds based on entry locations
  const getMapBounds = useCallback(() => {
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
    
    // Calculate padding as a percentage of the range
    // with a minimum to ensure visibility
    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;
    const latPadding = Math.max(latRange * 0.1, 0.5);
    const lngPadding = Math.max(lngRange * 0.1, 0.5);
    
    return [
      [minLat - latPadding, minLng - lngPadding],
      [maxLat + latPadding, maxLng + lngPadding]
    ];
  }, [entries]);
  
  // Always calculate bounds from the filtered entries - the map should always 
  // show the current filtered set, regardless of how the filtering was done
  const bounds = getMapBounds();
  
  // Handle marker click to select entry in timeline without navigation
  // This will be called from the popup's "View Entry" button
  const handleViewEntryClick = (entry) => {
    setSelectedEntry(entry);
  };
  
  // Handle area selection completed
  const handleAreaSelectionComplete = useCallback((bounds) => {
    // Set area selection mode to false after selecting
    setAreaSelectionMode(false);
    
    // Set a special filter to trigger the context update
    // We use a custom filter format here that will be handled in the context
    setFilter('geo', {
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast()
    }, 'map', 'selection');
  }, [setFilter]);
  
  
  // Toggle area selection mode
  const toggleAreaSelection = useCallback(() => {
    setAreaSelectionMode(prev => !prev);
    // If turning off selection mode, also clear any current rectangle being drawn
    if (areaSelectionMode) {
      // We don't clear the filter here, just the selection mode
    }
  }, [areaSelectionMode]);
  
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
        style={{ height: '100%', width: '100%' }}
      >
        {/* BoundsFitter updates the map bounds when entries change */}
        <BoundsFitter 
          bounds={bounds} 
          areaSelectionMode={areaSelectionMode} 
          onSelectionComplete={handleAreaSelectionComplete} 
        />
        
        {/* MapTileSelector provides tile layer selection UI and renders the active tile layer */}
        <MapTileSelector />
        
        {/* Render existing geographic filter if present */}
        {filters.geo && (
          <Rectangle
            bounds={[
              [filters.geo.south, filters.geo.west],
              [filters.geo.north, filters.geo.east]
            ]}
            pathOptions={{
              color: '#1976d2',
              weight: 2,
              fillOpacity: 0.1,
              opacity: 0.5
            }}
          />
        )}
        
        {/* Render markers for entries */}
        {entries.map((entry) => (
          entry.location && entry.location.latitude && entry.location.longitude ? (
            <Marker
              key={entry.uuid}
              position={[entry.location.latitude, entry.location.longitude]}
              icon={getEntryIcon(entry.type)}
            >
              <Popup>
                <div style={{ textAlign: 'left', padding: '4px 0' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{entry.title}</h3>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    <strong>Type:</strong> <span style={{ color: colorScheme[entry.type] || '#333' }}>{entry.type}</span>
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    <strong>Region:</strong> {entry.region}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    <strong>Date:</strong> {new Date(entry.creationDate).toLocaleDateString()}
                  </p>
                  <button 
                    onClick={() => handleViewEntryClick(entry)}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      backgroundColor: 'white',
                      color: '#333',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    <span style={{ marginRight: '6px' }}>→</span> View Entry
                  </button>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>
      
      {/* Map controls */}
      <MapControls>
        <ControlButton 
          onClick={toggleAreaSelection}
          className={areaSelectionMode ? 'active' : ''}
          title={areaSelectionMode ? 'Cancel selection' : 'Select area'}
        >
          {areaSelectionMode ? 'Cancel Selection' : 'Select Area'}
        </ControlButton>
      </MapControls>
    </MapWrapper>
  );
};

export default MapView;