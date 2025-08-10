import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, useMap, Rectangle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import styled from 'styled-components';
import { useData } from '../../context/DataContext';
import { TouchButton } from '../ui/TouchButton';
import { fadeIn, slideInUp, pulse } from '../../styles/animations';
import ds from '../../styles/designSystem';
import 'leaflet/dist/leaflet.css';

const MapWrapper = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
  border-radius: ${ds.borderRadius.xl};
  overflow: hidden;
  animation: ${fadeIn} ${ds.transitions.duration.slow} ${ds.transitions.easing.enter};
  
  .leaflet-container {
    height: 100%;
    width: 100%;
    background: ${ds.colors.ocean[50]};
  }
  
  /* Custom map controls styling */
  .leaflet-control-zoom {
    border: none;
    box-shadow: ${ds.shadows.lg};
    border-radius: ${ds.borderRadius.lg};
    overflow: hidden;
    
    a {
      background: white;
      color: ${ds.colors.stone[700]};
      border: none;
      width: 44px;
      height: 44px;
      line-height: 44px;
      font-size: 20px;
      font-weight: normal;
      transition: all ${ds.transitions.duration.fast} ${ds.transitions.easing.smooth};
      
      &:hover {
        background: ${ds.colors.stone[100]};
      }
      
      &:active {
        transform: scale(0.95);
      }
    }
  }
  
  /* Custom marker styling */
  .leaflet-marker-icon {
    transition: all ${ds.transitions.duration.base} ${ds.transitions.easing.spring};
  }
  
  /* Popup styling */
  .leaflet-popup {
    margin-bottom: 20px;
  }
  
  .leaflet-popup-content-wrapper {
    background: white;
    border-radius: ${ds.borderRadius.lg};
    box-shadow: ${ds.shadows.xl};
    border: 1px solid ${ds.colors.stone[200]};
    padding: 0;
  }
  
  .leaflet-popup-content {
    margin: 0;
    min-width: 280px;
  }
  
  .leaflet-popup-tip {
    background: white;
    border: 1px solid ${ds.colors.stone[200]};
    box-shadow: ${ds.shadows.md};
  }
`;

const MapControls = styled.div`
  position: absolute;
  top: ${ds.spacing[4]};
  right: ${ds.spacing[4]};
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: ${ds.spacing[3]};
  animation: ${slideInUp} ${ds.transitions.duration.slow} ${ds.transitions.easing.enter} 0.2s both;
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${ds.spacing[2]};
  padding: ${ds.spacing[2]};
  background: ${ds.colors.glass};
  backdrop-filter: blur(20px);
  border-radius: ${ds.borderRadius.lg};
  border: 1px solid ${ds.colors.glassBorder};
  box-shadow: ${ds.shadows.lg};
`;

const MapLegend = styled.div`
  position: absolute;
  bottom: ${ds.spacing[4]};
  left: ${ds.spacing[4]};
  z-index: 1000;
  padding: ${ds.spacing[4]};
  background: ${ds.colors.glass};
  backdrop-filter: blur(20px);
  border-radius: ${ds.borderRadius.lg};
  border: 1px solid ${ds.colors.glassBorder};
  box-shadow: ${ds.shadows.lg};
  animation: ${slideInUp} ${ds.transitions.duration.slow} ${ds.transitions.easing.enter} 0.3s both;
  
  h4 {
    margin: 0 0 ${ds.spacing[3]} 0;
    font-size: ${ds.typography.fontSize.sm};
    font-weight: ${ds.typography.fontWeight.semibold};
    color: ${ds.colors.stone[700]};
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${ds.spacing[2]};
  margin-bottom: ${ds.spacing[2]};
  font-size: ${ds.typography.fontSize.sm};
  color: ${ds.colors.stone[600]};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const LegendDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: ${ds.borderRadius.full};
  background: ${props => props.color};
  box-shadow: ${ds.shadows.sm};
`;

const MapStats = styled.div`
  position: absolute;
  top: ${ds.spacing[4]};
  left: ${ds.spacing[4]};
  z-index: 1000;
  padding: ${ds.spacing[4]};
  background: ${ds.colors.glass};
  backdrop-filter: blur(20px);
  border-radius: ${ds.borderRadius.lg};
  border: 1px solid ${ds.colors.glassBorder};
  box-shadow: ${ds.shadows.lg};
  animation: ${slideInUp} ${ds.transitions.duration.slow} ${ds.transitions.easing.enter} 0.1s both;
  
  @media (max-width: ${ds.breakpoints.sm}) {
    display: none;
  }
`;

const StatItem = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${ds.spacing[2]};
  margin-bottom: ${ds.spacing[2]};
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .label {
    font-size: ${ds.typography.fontSize.sm};
    color: ${ds.colors.stone[500]};
  }
  
  .value {
    font-size: ${ds.typography.fontSize.lg};
    font-weight: ${ds.typography.fontWeight.semibold};
    color: ${ds.colors.stone[800]};
  }
`;

const ClusterMarker = styled.div`
  position: relative;
  width: ${props => 40 + props.size * 2}px;
  height: ${props => 40 + props.size * 2}px;
  background: linear-gradient(135deg, ${ds.colors.sand[400]} 0%, ${ds.colors.sand[500]} 100%);
  border-radius: ${ds.borderRadius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: ${ds.typography.fontWeight.semibold};
  font-size: ${ds.typography.fontSize.sm};
  box-shadow: ${ds.shadows.lg};
  cursor: pointer;
  transition: all ${ds.transitions.duration.base} ${ds.transitions.easing.spring};
  
  &::before {
    content: '';
    position: absolute;
    inset: -4px;
    background: ${ds.colors.sand[400]}33;
    border-radius: ${ds.borderRadius.full};
    animation: ${pulse} 2s ease-in-out infinite;
  }
  
  &:hover {
    transform: scale(1.1);
  }
`;

// Map animation controller
const MapAnimationController = ({ bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds[0] && bounds[1]) {
      const leafletBounds = L.latLngBounds(bounds);
      if (leafletBounds.isValid()) {
        map.flyToBounds(leafletBounds, {
          padding: [50, 50],
          duration: 1.5,
          easeLinearity: 0.25
        });
      }
    }
  }, [bounds, map]);
  
  return null;
};

// Enhanced tile selector
const TileSelector = ({ currentTile, onTileChange }) => {
  const tiles = [
    { id: 'street', name: 'Street', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
    { id: 'satellite', name: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
    { id: 'terrain', name: 'Terrain', url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png' },
    { id: 'watercolor', name: 'Artistic', url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.png' }
  ];
  
  return (
    <ControlGroup>
      {tiles.map(tile => (
        <TouchButton
          key={tile.id}
          size="sm"
          variant={currentTile === tile.id ? 'primary' : 'secondary'}
          onClick={() => onTileChange(tile)}
        >
          {tile.name}
        </TouchButton>
      ))}
    </ControlGroup>
  );
};

export const EnhancedMapView = () => {
  const { entries, setSelectedEntry } = useData();
  const [currentTile, setCurrentTile] = useState('street');
  const [tileUrl, setTileUrl] = useState('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  const [showStats, setShowStats] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  
  // Calculate map statistics
  const stats = {
    total: entries.length,
    countries: new Set(entries.map(e => e.location?.country).filter(Boolean)).size,
    regions: new Set(entries.map(e => e.region).filter(Boolean)).size,
  };
  
  // Get unique types for legend
  const types = [...new Set(entries.map(e => e.type).filter(Boolean))];
  const typeColors = {
    'Beach': ds.colors.ocean[500],
    'Desert': ds.colors.sand[600],
    'River': ds.colors.ocean[400],
    'Mountain': ds.colors.stone[600],
    'Lake': ds.colors.ocean[300],
    'Other': ds.colors.stone[500]
  };
  
  // Calculate bounds
  const getMapBounds = useCallback(() => {
    const validEntries = entries.filter(entry => 
      entry.location && entry.location.latitude && entry.location.longitude
    );
    
    if (!validEntries.length) return [[0, 0], [0, 0]];
    
    const latitudes = validEntries.map(entry => entry.location.latitude);
    const longitudes = validEntries.map(entry => entry.location.longitude);
    
    return [
      [Math.min(...latitudes) - 0.5, Math.min(...longitudes) - 0.5],
      [Math.max(...latitudes) + 0.5, Math.max(...longitudes) + 0.5]
    ];
  }, [entries]);
  
  const bounds = getMapBounds();
  
  const handleTileChange = (tile) => {
    setCurrentTile(tile.id);
    setTileUrl(tile.url);
  };
  
  const handleViewEntryClick = (entry) => {
    setSelectedEntry(entry);
    // Could navigate to entry view or show in sidebar
  };
  
  // Filter entries with valid locations
  const mapEntries = entries.filter(entry => 
    entry.location && entry.location.latitude && entry.location.longitude
  );
  
  return (
    <MapWrapper>
      <MapContainer
        bounds={bounds}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer url={tileUrl} />
        <MapAnimationController bounds={bounds} />
        
        {mapEntries.map((entry) => {
          const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="
              background: ${typeColors[entry.type] || typeColors.Other};
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          
          return (
            <Marker
              key={entry.uuid}
              position={[entry.location.latitude, entry.location.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => handleViewEntryClick(entry)
              }}
            >
              <Popup>
                <div style={{ padding: '8px' }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>{entry.title}</h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    {entry.location.name || entry.location.address}
                  </p>
                  <TouchButton
                    size="sm"
                    variant="primary"
                    onClick={() => handleViewEntryClick(entry)}
                  >
                    View Entry
                  </TouchButton>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      <MapControls>
        <TileSelector 
          currentTile={currentTile} 
          onTileChange={handleTileChange} 
        />
        <ControlGroup>
          <TouchButton
            size="sm"
            variant="secondary"
            onClick={() => setShowStats(!showStats)}
          >
            📊 Stats
          </TouchButton>
          <TouchButton
            size="sm"
            variant="secondary"
            onClick={() => setShowLegend(!showLegend)}
          >
            🎨 Legend
          </TouchButton>
        </ControlGroup>
      </MapControls>
      
      {showStats && (
        <MapStats>
          <StatItem>
            <span className="value">{stats.total}</span>
            <span className="label">samples</span>
          </StatItem>
          <StatItem>
            <span className="value">{stats.countries}</span>
            <span className="label">countries</span>
          </StatItem>
          <StatItem>
            <span className="value">{stats.regions}</span>
            <span className="label">regions</span>
          </StatItem>
        </MapStats>
      )}
      
      {showLegend && types.length > 0 && (
        <MapLegend>
          <h4>Sample Types</h4>
          {types.map(type => (
            <LegendItem key={type}>
              <LegendDot color={typeColors[type] || typeColors.Other} />
              <span>{type}</span>
            </LegendItem>
          ))}
        </MapLegend>
      )}
    </MapWrapper>
  );
};

export default EnhancedMapView;