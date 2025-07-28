import React from 'react';
import { getMediaPath, getPhotoPath, getVideoPath, getPdfPath } from '../../utils/mediaPath';
import styled from 'styled-components';
import '../../styles/mediaGrid.css';

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
 * Styled image component
 */
const StyledImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

/**
 * Styled video component
 */
const StyledVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

/**
 * Styled PDF embed component
 */
const StyledPDF = styled.div`
  width: 100%;
  aspect-ratio: 8.5/11;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
  
  .pdf-placeholder {
    padding: 16px;
    text-align: center;
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
 * @param {Object} props - Component props
 * @param {Object} props.media - Media item metadata
 * @param {Function} props.onClick - Optional click handler
 */
const MediaItem = ({ media, onClick }) => {
  if (!media) return null;
  
  const { type, md5, width, height, mimeType } = media;
  const aspectRatio = width && height ? (width / height).toFixed(2) : undefined;
  const orientation = width && height ? getOrientationClass(width, height) : 'landscape';
  
  // Get the appropriate media path based on type
  let mediaPath;
  if (type === 'photo') {
    mediaPath = getPhotoPath(media);
  } else if (type === 'video') {
    mediaPath = getVideoPath(media);
  } else if (type === 'pdf') {
    mediaPath = getPdfPath(media);
  } else {
    mediaPath = getMediaPath(media);
  }
  
  // Determine if this is an image, video or PDF
  if (type === 'photo' || mimeType?.startsWith('image/')) {
    return (
      <BaseMediaItem className={orientation} style={{ '--aspect-ratio': aspectRatio }}>
        <StyledImage 
          src={mediaPath} 
          alt="Journal entry media" 
          onClick={onClick} 
        />
      </BaseMediaItem>
    );
  } else if (type === 'video' || mimeType?.startsWith('video/')) {
    return (
      <BaseMediaItem className={orientation} style={{ '--aspect-ratio': aspectRatio }}>
        <StyledVideo controls muted>
          <source src={mediaPath} type={mimeType || `video/${type}`} />
          Your browser does not support the video tag.
        </StyledVideo>
      </BaseMediaItem>
    );
  } else if (type === 'pdf' || mimeType === 'application/pdf') {
    return (
      <StyledPDF onClick={onClick}>
        <div className="pdf-placeholder">
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
          <div>PDF Document</div>
          <a href={mediaPath} target="_blank" rel="noopener noreferrer">
            <button style={{ marginTop: '12px', padding: '8px 16px' }}>
              Open PDF
            </button>
          </a>
        </div>
      </StyledPDF>
    );
  }
  
  // Fallback for unknown media type
  return (
    <BaseMediaItem className="landscape">
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
    </BaseMediaItem>
  );
};

/**
 * MediaGrid component for rendering a collection of media items
 * 
 * @param {Object} props - Component props
 * @param {Array} props.mediaItems - Array of media item objects
 * @param {Function} props.onMediaClick - Optional click handler for media items
 */
const MediaRenderer = ({ mediaItems, onMediaClick }) => {
  if (!mediaItems || mediaItems.length === 0) return null;
  
  return (
    <div className={`media-grid media-count-${mediaItems.length}`}>
      {mediaItems.map((item, index) => {
        const { type, md5, width, height } = item;
        const aspectRatio = width && height ? (width / height).toFixed(2) : undefined;
        const orientation = width && height ? getOrientationClass(width, height) : 'landscape';
        
        // Get the appropriate path based on media type
        let mediaPath;
        if (type === 'photo') {
          mediaPath = getPhotoPath(item);
        } else if (type === 'video') {
          mediaPath = getVideoPath(item);
        } else if (type === 'pdf') {
          mediaPath = getPdfPath(item);
        } else {
          mediaPath = getMediaPath(item);
        }
        
        return (
          <div 
            key={item.identifier || item.md5 || index} 
            className={`media-item ${orientation}`}
            style={{ '--aspect-ratio': aspectRatio }}
            onClick={() => onMediaClick && onMediaClick(item)}
          >
            {type === 'photo' && (
              <img src={mediaPath} alt="" />
            )}
            
            {type === 'video' && (
              <video controls muted>
                <source src={mediaPath} type={`video/${item.type}`} />
                Your browser does not support the video tag.
              </video>
            )}
            
            {type === 'pdf' && (
              <div className="pdf-placeholder">
                <div className="pdf-icon">📄</div>
                <div>PDF Document</div>
                <a href={mediaPath} target="_blank" rel="noopener noreferrer">
                  <button style={{ marginTop: '12px', padding: '8px 16px' }}>Open PDF</button>
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MediaRenderer;