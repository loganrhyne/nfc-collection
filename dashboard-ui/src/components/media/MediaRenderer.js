import React, { useState, useEffect, useRef } from 'react';
import { getMediaPath, getPhotoPath, getVideoPath, getPdfPath } from '../../utils/mediaPath';
import { diagnosePaths } from '../../utils/fileChecker';
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
 * Component for rendering images with logging and error handling
 */
const MediaImage = ({ src, mediaItem }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    console.log(`🖼️ Attempting to load image: ${src}`);
    console.log('Image metadata:', { 
      md5: mediaItem.md5, 
      type: mediaItem.type, 
      width: mediaItem.width, 
      height: mediaItem.height 
    });
    
    // Diagnose path issues
    if (src && src.startsWith('/data/')) {
      diagnosePaths(src.substring(1)); // Remove leading slash
    }
  }, [src, mediaItem]);
  
  const handleLoad = () => {
    console.log(`✅ Successfully loaded image: ${src}`);
    setLoaded(true);
  };
  
  const handleError = () => {
    console.error(`❌ Failed to load image: ${src}`);
    setError(true);
  };
  
  if (error) {
    return (
      <div className="media-item-error">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
          <div>Image not found</div>
          <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
            {mediaItem.md5}.{mediaItem.type}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <img 
        src={src} 
        alt="" 
        onLoad={handleLoad} 
        onError={handleError} 
        style={{ opacity: loaded ? 1 : 0.3 }}
      />
      {!loaded && !error && (
        <div className="loading-indicator-container" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <div className="loading-indicator"></div>
        </div>
      )}
    </>
  );
};

/**
 * Component for rendering videos with logging and error handling
 */
const MediaVideo = ({ mediaPath, mediaItem }) => {
  const [error, setError] = useState(false);
  const videoRef = useRef(null);
  
  useEffect(() => {
    console.log(`🎬 Attempting to load video: ${mediaPath}`);
    console.log('Video metadata:', { 
      md5: mediaItem.md5, 
      type: mediaItem.type,
      width: mediaItem.width,
      height: mediaItem.height
    });
  }, [mediaPath, mediaItem]);
  
  const handleLoadedData = () => {
    console.log(`✅ Successfully loaded video: ${mediaPath}`);
    console.log(`Video dimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
  };
  
  const handleError = () => {
    console.error(`❌ Failed to load video: ${mediaPath}`);
    setError(true);
  };
  
  if (error) {
    return (
      <div className="media-item-error">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎬</div>
          <div>Video not found</div>
          <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
            {mediaItem.md5}.{mediaItem.type}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <video 
      ref={videoRef}
      controls 
      muted
      onLoadedData={handleLoadedData}
      onError={handleError}
    >
      {/* Map file extension to MIME type */}
      <source 
        src={mediaPath} 
        type={mediaItem.type === 'mov' ? 'video/quicktime' : 
              mediaItem.type === 'mp4' ? 'video/mp4' : 
              mediaItem.type === 'webm' ? 'video/webm' : 
              mediaItem.type === 'avi' ? 'video/x-msvideo' : 
              mediaItem.type === 'mkv' ? 'video/x-matroska' : 
              mediaItem.type === 'wmv' ? 'video/x-ms-wmv' : 
              `video/${mediaItem.type}`} 
      />
      Your browser does not support the video tag.
    </video>
  );
};

/**
 * Component for rendering PDFs with logging and error handling
 */
const MediaPdf = ({ mediaPath, mediaItem }) => {
  const [error, setError] = useState(false);
  
  useEffect(() => {
    console.log(`📄 Attempting to load PDF: ${mediaPath}`);
    console.log('PDF metadata:', { 
      md5: mediaItem.md5, 
      type: mediaItem.type 
    });
    
    // Check if PDF exists by trying to fetch it
    fetch(mediaPath, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          console.log(`✅ PDF file exists: ${mediaPath}`);
        } else {
          console.error(`❌ PDF file not found: ${mediaPath}`);
          setError(true);
        }
      })
      .catch(err => {
        console.error(`❌ Error checking PDF file: ${mediaPath}`, err);
        setError(true);
      });
  }, [mediaPath, mediaItem]);
  
  if (error) {
    return (
      <div className="media-item-error">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
          <div>PDF not found</div>
          <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
            {mediaItem.md5}.pdf
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="pdf-placeholder">
      <div className="pdf-icon">📄</div>
      <div>PDF Document</div>
      <a href={mediaPath} target="_blank" rel="noopener noreferrer">
        <button style={{ marginTop: '12px', padding: '8px 16px' }}>Open PDF</button>
      </a>
    </div>
  );
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
        // Handle various media types and determine the appropriate directory
        const videoFormats = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv'];
        const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'];
        
        if (type === 'photo' || imageFormats.includes(type.toLowerCase())) {
          mediaPath = getPhotoPath(item);
          console.log(`📷 Treating ${type} as a photo`);  
        } else if (type === 'video' || videoFormats.includes(type.toLowerCase())) {
          mediaPath = getVideoPath(item);
          console.log(`🎬 Treating ${type} as a video`);  
        } else if (type === 'pdf') {
          mediaPath = getPdfPath(item);
        } else {
          console.warn(`⚠️ Unknown media type: ${type}, using general path`);  
          mediaPath = getMediaPath(item);
        }
        
        return (
          <div 
            key={item.identifier || item.md5 || index} 
            className={`media-item ${orientation}`}
            style={{ '--aspect-ratio': aspectRatio }}
            onClick={() => onMediaClick && onMediaClick(item)}
          >
            {/* Handle both explicit photo type and recognized image formats */}
            {(type === 'photo' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(type.toLowerCase())) && (
              <MediaImage src={mediaPath} mediaItem={item} />
            )}
            
            {/* Handle both explicit video type and recognized video formats */}
            {(type === 'video' || ['mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv'].includes(type.toLowerCase())) && (
              <MediaVideo mediaPath={mediaPath} mediaItem={item} />
            )}
            
            {type === 'pdf' && (
              <MediaPdf mediaPath={mediaPath} mediaItem={item} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MediaRenderer;