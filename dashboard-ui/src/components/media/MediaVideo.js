import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import VideoPlayer from './VideoPlayer';
import MediaErrorDisplay from './MediaErrorDisplay';
import MediaLoading from './MediaLoading';
import mediaService from '../../services/mediaService';
import mediaErrorService from '../../services/mediaErrorService';

/**
 * Component for rendering videos with enhanced format support and error handling
 * 
 * @component
 */
const MediaVideo = ({ mediaPath, mediaItem }) => {
  // Calculate a display path that might improve format compatibility
  const displayPath = mediaItem.type?.toLowerCase() === 'mov' 
    ? mediaService.createCompatibleUrl(mediaPath, 'mov', 'mp4') 
    : mediaPath;
  
  // Component state
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [nativeFallback, setNativeFallback] = useState(false);
  const [fileExists, setFileExists] = useState(true); // Assume file exists initially
  
  // Check if the video file exists when component mounts
  useEffect(() => {
    const checkVideoExists = async () => {
      try {
        const exists = await mediaService.checkFileExists(mediaPath);
        if (!exists) {
          const notFoundError = mediaErrorService.createNotFoundError(mediaPath, mediaItem);
          mediaErrorService.logMediaError(notFoundError);
          setError(notFoundError);
          setFileExists(false);
        }
      } catch (err) {
        console.error(`Error checking video file: ${mediaPath}`, err);
        setFileExists(false);
        setError(mediaErrorService.createNotFoundError(mediaPath, mediaItem));
      }
    };
    
    // Log some diagnostic info
    console.log(`🎬 Processing video: ${mediaPath}`);
    console.log('Video metadata:', { 
      md5: mediaItem.md5, 
      type: mediaItem.type,
      width: mediaItem.width,
      height: mediaItem.height
    });
    
    checkVideoExists();
  }, [mediaPath, mediaItem]);
  
  // Handle when the player is ready
  const handlePlayerReady = (player) => {
    console.log('✅ Video player is ready');
    setLoaded(true);
  };
  
  // Handle player errors
  const handlePlayerError = (playerError) => {
    console.error(`❌ Video player error for ${mediaPath}:`, playerError);
    
    // For problematic formats like MOV, try native fallback
    if (mediaService.isProblematicFormat(mediaItem.type)) {
      console.log('⚠️ Problematic format detected, trying native player fallback');
      setNativeFallback(true);
      return; // Don't set error yet, try the fallback first
    }
    
    setError(playerError);
  };
  
  // Handle native player errors
  const handleNativePlayerError = (e) => {
    console.error('❌ Native video player failed:', e);
    
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
        mediaPath={mediaPath}
        downloadable={true}
        openInNewTab={true}
      />
    );
  }
  
  // If we're using the native fallback
  if (nativeFallback) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <video 
          controls 
          muted
          preload="metadata"
          playsInline
          style={{ 
            width: '100%', 
            height: '100%',
            opacity: loaded ? 1 : 0.5 
          }}
          onLoadedData={() => {
            console.log('✅ Native video player loaded successfully');
            setLoaded(true);
          }}
          onError={handleNativePlayerError}
        >
          {/* Try multiple MIME types for better compatibility */}
          {mediaService.getAlternativeMimeTypes(mediaItem.type).map((mimeType, index) => (
            <source key={index} src={mediaPath} type={mimeType} />
          ))}
          
          <source src={mediaPath} type={mediaService.getMimeType(mediaItem.type)} />
          <source src={mediaPath} type="video/*" />
          
          Your browser does not support this video format.
        </video>
        
        {!loaded && (
          <MediaLoading 
            message={`Loading ${mediaItem.type?.toUpperCase() || 'video'}...`} 
            overlay={true}
          />
        )}
      </div>
    );
  }
  
  // Default: Use VideoJS player
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <VideoPlayer 
        src={displayPath} /* Use the modified path for MOV files */
        type={mediaItem.type === 'mov' ? 'mp4' : mediaItem.type} /* Present it as MP4 to VideoJS */
        mediaItem={mediaItem}
        onReady={handlePlayerReady}
        onError={handlePlayerError}
      />
      
      {!loaded && (
        <MediaLoading 
          message="Loading video player..." 
          overlay={false}
          centered={true}
          size="medium"
        />
      )}
    </div>
  );
};

MediaVideo.propTypes = {
  /** Path to the video file */
  mediaPath: PropTypes.string.isRequired,
  
  /** Media item metadata */
  mediaItem: PropTypes.shape({
    md5: PropTypes.string,
    type: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number
  }).isRequired
};

export default MediaVideo;