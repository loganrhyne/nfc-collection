import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import '../../styles/mediaGrid.css';
import mediaService from '../../services/mediaService';

// Import our modular components
import MediaImage from './MediaImage';
import MediaVideo from './MediaVideo';
import MediaDocument from './MediaDocument';

/**
 * Grid container for displaying media in different layouts based on count
 */
const MediaGrid = styled.div`
  display: grid;
  gap: 16px;
  margin: 24px 0;
  width: 100%;

  /* Grid template based on media count */
  &.media-count-1 {
    grid-template-columns: 1fr;
  }

  &.media-count-2 {
    grid-template-columns: 1fr 1fr;
  }

  &.media-count-3 {
    grid-template-columns: repeat(2, 1fr);
    
    /* First item spans entire first row */
    > *:first-child {
      grid-column: 1 / -1;
    }
  }

  &.media-count-4 {
    grid-template-columns: repeat(2, 1fr);
  }

  &.media-count-5, &.media-count-6 {
    grid-template-columns: repeat(3, 1fr);
  }
`;

/**
 * Base styles for all media items
 */
const BaseMediaItem = styled.div`
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  
  &:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }

  &.landscape {
    aspect-ratio: var(--aspect-ratio, 16/9);
  }
  
  &.portrait {
    aspect-ratio: var(--aspect-ratio, 3/4);
  }
  
  &.landscape.wide {
    aspect-ratio: var(--aspect-ratio, 21/9);
  }
`;

/**
 * Determines the appropriate CSS class for media orientation
 * 
 * @param {number} width - Media width
 * @param {number} height - Media height
 * @returns {string} - CSS class name for orientation
 */
const getOrientationClass = (width, height) => {
  if (width / height > 1.7) {
    return 'landscape wide';
  }
  return width >= height ? 'landscape' : 'portrait';
};

/**
 * Renders a single media item (image, video, PDF)
 * 
 * @component
 */
const MediaItem = ({ media, onClick }) => {
  if (!media) return null;
  
  const { type, md5, width, height, mimeType } = media;
  const aspectRatio = width && height ? (width / height).toFixed(2) : undefined;
  const orientation = width && height ? getOrientationClass(width, height) : 'landscape';
  
  // Get the appropriate media path
  const mediaPath = mediaService.getMediaPath(media);
  
  // Get media category for appropriate component selection
  const mediaCategory = mediaService.getMediaCategory(type);
  
  // Render the appropriate component based on media category
  const renderMediaContent = () => {
    switch (mediaCategory) {
      case 'image':
        return <MediaImage src={mediaPath} mediaItem={media} />;
        
      case 'video':
        return <MediaVideo mediaPath={mediaPath} mediaItem={media} />;
        
      case 'document':
        return <MediaDocument mediaPath={mediaPath} mediaItem={media} />;
        
      default:
        // Fallback for unknown media type
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            padding: '16px',
            textAlign: 'center',
            backgroundColor: '#f5f5f5'
          }}>
            <div>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📁</div>
              <div>Unknown media format</div>
            </div>
          </div>
        );
    }
  };
  
  return (
    <BaseMediaItem 
      className={orientation} 
      style={{ '--aspect-ratio': aspectRatio }}
      onClick={onClick ? () => onClick(media) : undefined}
    >
      {renderMediaContent()}
    </BaseMediaItem>
  );
};

/**
 * MediaRenderer component for displaying a collection of media items
 * 
 * @component
 */
const MediaRenderer = ({ mediaItems, onMediaClick }) => {
  // Don't render anything if no media items
  if (!mediaItems || mediaItems.length === 0) return null;
  
  return (
    <MediaGrid className={`media-grid media-count-${mediaItems.length}`}>
      {mediaItems.map((item, index) => {
        if (!item) return null;
        
        // Get orientation info
        const { width, height } = item;
        const aspectRatio = width && height ? (width / height).toFixed(2) : undefined;
        const orientation = width && height ? getOrientationClass(width, height) : 'landscape';
        
        return (
          <div 
            key={item.identifier || item.md5 || index} 
            className={`media-item ${orientation}`}
            style={{ '--aspect-ratio': aspectRatio }}
          >
            <MediaItem 
              media={item} 
              onClick={onMediaClick} 
            />
          </div>
        );
      })}
    </MediaGrid>
  );
};

MediaRenderer.propTypes = {
  /** Array of media item objects */
  mediaItems: PropTypes.arrayOf(PropTypes.shape({
    md5: PropTypes.string,
    type: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number,
    identifier: PropTypes.string
  })),
  
  /** Optional click handler for media items */
  onMediaClick: PropTypes.func
};

MediaItem.propTypes = {
  /** Media item object */
  media: PropTypes.shape({
    md5: PropTypes.string,
    type: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number,
    identifier: PropTypes.string,
    mimeType: PropTypes.string
  }),
  
  /** Optional click handler */
  onClick: PropTypes.func
};

export default MediaRenderer;