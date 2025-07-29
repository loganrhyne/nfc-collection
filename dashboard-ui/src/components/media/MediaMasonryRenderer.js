import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import '../../styles/mediaMasonry.css';
import mediaService from '../../services/mediaService';

// Import our modular components
import MediaImage from './MediaImage';
import MediaVideo from './MediaVideo';
import MediaDocument from './MediaDocument';

/**
 * Masonry container for displaying media without vertical gaps
 */
const MasonryContainer = styled.div`
  /* Styles are defined in mediaMasonry.css for better organization */
`;

/**
 * Renders a single media item for masonry layout
 */
const MediaItem = ({ media, onClick }) => {
  if (!media) return null;
  
  const { type } = media;
  
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
          <div className="media-item document">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              minHeight: '200px',
              padding: '16px',
              textAlign: 'center',
              backgroundColor: '#f5f5f5'
            }}>
              <div>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📁</div>
                <div>Unknown media format</div>
              </div>
            </div>
          </div>
        );
    }
  };
  
  return renderMediaContent();
};

/**
 * MediaMasonryRenderer component for displaying a collection of media items
 * in a masonry layout with no vertical gaps
 */
const MediaMasonryRenderer = ({ mediaItems, onMediaClick }) => {
  // Don't render anything if no media items
  if (!mediaItems || mediaItems.length === 0) return null;
  
  // For very large collections, limit the class name to avoid CSS specificity issues
  const mediaCountClass = mediaItems.length <= 20 
    ? `media-count-${mediaItems.length}` 
    : 'media-count-many';
  
  return (
    <MasonryContainer className={`media-masonry ${mediaCountClass}`}>
      {mediaItems.map((item, index) => {
        if (!item) return null;
        
        // Determine media type for styling
        const mediaCategory = mediaService.getMediaCategory(item.type);
        const itemClass = mediaCategory === 'document' ? 'document' : '';
        
        return (
          <div 
            key={item.identifier || item.md5 || index} 
            className="media-masonry-item"
          >
            <div 
              className={`media-item ${itemClass}`}
              onClick={onMediaClick ? () => onMediaClick(item) : undefined}
              style={{ cursor: onMediaClick ? 'pointer' : 'default' }}
            >
              <MediaItem 
                media={item} 
                onClick={onMediaClick} 
              />
            </div>
          </div>
        );
      })}
    </MasonryContainer>
  );
};

MediaMasonryRenderer.propTypes = {
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

export default MediaMasonryRenderer;