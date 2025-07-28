import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import MediaErrorDisplay from './MediaErrorDisplay';
import MediaLoading from './MediaLoading';
import mediaService from '../../services/mediaService';
import mediaErrorService from '../../services/mediaErrorService';

/**
 * Component for rendering images with enhanced error handling
 * 
 * @component
 */
const MediaImage = ({ src, mediaItem, onLoad }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [fileExists, setFileExists] = useState(true); // Assume file exists initially
  
  // Check if the image file exists when component mounts
  useEffect(() => {
    const checkImageExists = async () => {
      try {
        const exists = await mediaService.checkFileExists(src);
        if (!exists) {
          const notFoundError = mediaErrorService.createNotFoundError(src, mediaItem);
          mediaErrorService.logMediaError(notFoundError);
          setError(notFoundError);
          setFileExists(false);
        }
      } catch (err) {
        console.error(`Error checking image file: ${src}`, err);
        setFileExists(false);
        setError(mediaErrorService.createNotFoundError(src, mediaItem));
      }
    };
    
    // Log some diagnostic info
    console.log(`🖼️ Processing image: ${src}`);
    console.log('Image metadata:', { 
      md5: mediaItem?.md5, 
      type: mediaItem?.type, 
      width: mediaItem?.width, 
      height: mediaItem?.height 
    });
    
    checkImageExists();
  }, [src, mediaItem]);
  
  // Handle successful image load
  const handleLoad = () => {
    console.log(`✅ Successfully loaded image: ${src}`);
    setLoaded(true);
    if (onLoad) onLoad();
  };
  
  // Handle image load error
  const handleError = (e) => {
    console.error(`❌ Failed to load image: ${src}`, e);
    
    // Create standardized error
    const error = mediaErrorService.createErrorFromMediaEvent(e, mediaItem);
    mediaErrorService.logMediaError(error);
    
    setError(error);
  };
  
  // If file doesn't exist or we have an error, show error display
  if (!fileExists || error) {
    return (
      <MediaErrorDisplay 
        error={error} 
        mediaItem={mediaItem} 
        mediaPath={src}
        downloadable={true}
        openInNewTab={true}
      />
    );
  }
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img 
        src={src} 
        alt={mediaItem?.altText || ''} 
        onLoad={handleLoad} 
        onError={handleError} 
        style={{ 
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: loaded ? 1 : 0.3,
          transition: 'opacity 0.3s ease'
        }}
      />
      
      {!loaded && !error && (
        <MediaLoading 
          message="Loading image..." 
          overlay={false}
          centered={true}
          size="small"
        />
      )}
    </div>
  );
};

MediaImage.propTypes = {
  /** Source URL for the image */
  src: PropTypes.string.isRequired,
  
  /** Media item metadata */
  mediaItem: PropTypes.shape({
    md5: PropTypes.string,
    type: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number,
    altText: PropTypes.string
  }),
  
  /** Callback when image is loaded */
  onLoad: PropTypes.func
};

export default MediaImage;