import React, { useState, useRef, useEffect } from 'react';
import { useMap, TileLayer } from 'react-leaflet';
import styled from 'styled-components';

// Available tile layers
const TILE_LAYERS = {
  STANDARD: {
    name: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 8,
    tileSize: 256,
    noWrap: true
  },
  SATELLITE: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 8,
    tileSize: 256,
    noWrap: true
  },
  TOPO: {
    name: 'Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxZoom: 8,
    tileSize: 256,
    noWrap: true
  }
};

// Styled components for the compact selector
const ControlButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  width: 36px;
  height: 36px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  
  &:hover {
    background: #f5f5f5;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
  }
`;

const LayerIcon = styled.div`
  width: 22px;
  height: 22px;
  position: relative;
  
  &:before {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 10px;
    border: 2px solid #666;
    border-radius: 2px;
  }
  
  &:after {
    content: "";
    position: absolute;
    top: 7px;
    left: 7px;
    width: 12px;
    height: 8px;
    border: 2px solid #666;
    border-radius: 2px;
    background: #fff;
  }
`;

const LayerMenu = styled.div`
  position: absolute;
  top: 50px;
  right: 10px;
  z-index: 1000;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  padding: 5px;
  display: ${props => props.isOpen ? 'block' : 'none'};
  border: 1px solid #e0e0e0;
  min-width: 120px;
`;

const LayerOption = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  border-radius: 3px;
  transition: background 0.2s;
  font-size: 13px;
  font-family: sans-serif;
  
  &:hover {
    background: #f5f5f5;
  }
  
  ${props => props.active && `
    font-weight: bold;
    background: #f0f0f0;
  `}
`;

const ColorIndicator = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin-right: 8px;
  background-color: ${props => props.color};
  border: 1px solid #ccc;
`;

/**
 * Map tile layer selector and switcher component
 * Uses react-leaflet's useMap hook to access the Leaflet map instance
 */
const MapTileSelector = () => {
  const [currentLayer, setCurrentLayer] = useState(TILE_LAYERS.SATELLITE);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const map = useMap();
  
  // Handle tile layer change
  const handleLayerChange = (layer) => {
    setCurrentLayer(layer);
    setMenuOpen(false);
  };
  
  // Toggle the menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuOpen && 
        menuRef.current && 
        !menuRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);
  
  // Get color indicator for layer types
  const getLayerColor = (layerType) => {
    switch(layerType) {
      case TILE_LAYERS.STANDARD:
        return '#A5D6A7';  // Light green for standard
      case TILE_LAYERS.SATELLITE:
        return '#3F51B5';  // Indigo for satellite
      case TILE_LAYERS.TOPO:
        return '#A1887F';  // Brown for topo
      default:
        return '#BDBDBD';  // Gray for default
    }
  };
  
  return (
    <>
      {/* Render the current active tile layer */}
      <TileLayer
        attribution={currentLayer.attribution}
        url={currentLayer.url}
        maxZoom={currentLayer.maxZoom}
        tileSize={currentLayer.tileSize}
        noWrap={currentLayer.noWrap}
      />
      
      {/* Render the compact selector UI */}
      <ControlButton 
        onClick={toggleMenu}
        ref={buttonRef}
        title="Change map style"
      >
        <LayerIcon />
      </ControlButton>
      
      <LayerMenu 
        isOpen={menuOpen}
        ref={menuRef}
      >
        {Object.values(TILE_LAYERS).map(layer => (
          <LayerOption
            key={layer.name}
            active={layer.name === currentLayer.name}
            onClick={() => handleLayerChange(layer)}
          >
            <ColorIndicator color={getLayerColor(layer)} />
            {layer.name}
          </LayerOption>
        ))}
      </LayerMenu>
    </>
  );
};

export default MapTileSelector;