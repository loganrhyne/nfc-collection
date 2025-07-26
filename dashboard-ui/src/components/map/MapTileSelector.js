import React, { useState } from 'react';
import { useMap, TileLayer } from 'react-leaflet';
import styled from 'styled-components';

// Available tile layers
const TILE_LAYERS = {
  STANDARD: {
    name: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  SATELLITE: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  },
  TOPO: {
    name: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxZoom: 17
  }
};

// Styled components for the selector
const SelectorContainer = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  background: white;
  padding: 5px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
`;

const MapButton = styled.button`
  background: ${props => props.active ? '#f0f0f0' : 'white'};
  border: 1px solid ${props => props.active ? '#555' : '#e0e0e0'};
  padding: 8px 12px;
  margin: 3px 0;
  border-radius: 4px;
  font-size: 13px;
  font-family: sans-serif;
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  color: ${props => props.active ? '#333' : '#666'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? '#e8e8e8' : '#f5f5f5'};
    border-color: #999;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
  }
  
  &:first-child {
    margin-top: 0;
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

/**
 * Map tile layer selector and switcher component
 * Uses react-leaflet's useMap hook to access the Leaflet map instance
 */
const MapTileSelector = () => {
  const [currentLayer, setCurrentLayer] = useState(TILE_LAYERS.STANDARD);
  const map = useMap();
  
  // Handle tile layer change
  const handleLayerChange = (layer) => {
    setCurrentLayer(layer);
  };
  
  return (
    <>
      {/* Render the current active tile layer */}
      <TileLayer
        attribution={currentLayer.attribution}
        url={currentLayer.url}
        maxZoom={currentLayer.maxZoom}
      />
      
      {/* Render the selector UI */}
      <SelectorContainer>
        {Object.values(TILE_LAYERS).map(layer => (
          <MapButton
            key={layer.name}
            active={layer.name === currentLayer.name}
            onClick={() => handleLayerChange(layer)}
          >
            {layer.name}
          </MapButton>
        ))}
      </SelectorContainer>
    </>
  );
};

export default MapTileSelector;