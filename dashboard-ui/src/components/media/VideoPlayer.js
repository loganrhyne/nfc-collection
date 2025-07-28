import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import '@videojs/http-streaming';
import 'videojs-contrib-quality-levels';
import mediaService from '../../services/mediaService';
import mediaErrorService from '../../services/mediaErrorService';

/**
 * Custom Video.js player component with enhanced format support
 * 
 * @component
 */
const VideoPlayer = ({ 
  src, 
  type, 
  poster, 
  mediaItem, 
  onReady, 
  onError 
}) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [transcodingProgress, setTranscodingProgress] = useState(0);
  const [transcodedSrc, setTranscodedSrc] = useState(null);
  const [transcodingError, setTranscodingError] = useState(null);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      // Get the actual DOM video element
      const videoElement = videoRef.current;
      
      if (!videoElement) return;

      const mimeType = mediaService.getMimeType(type);
      console.log(`🎥 Initializing video player for: ${src} (${mimeType})`);
      
      // Initialize Video.js player with enhanced options for format support
      const player = playerRef.current = videojs(videoElement, {
        controls: true,
        autoplay: false,
        preload: 'metadata',
        fluid: true,
        responsive: true,
        techOrder: ['html5'],
        playbackRates: [0.5, 1, 1.5, 2],
        controlBar: {
          pictureInPictureToggle: false
        },
        html5: {
          vhs: {
            overrideNative: true,
          },
          hls: {
            overrideNative: true
          },
          nativeAudioTracks: false,
          nativeVideoTracks: false,
        },
        sources: [{
          src: src,
          type: mimeType
        }]
      }, () => {
        console.log('✅ Video.js player initialized');
        
        // Add event listeners
        player.on('ready', () => {
          console.log('✅ Video.js player ready');
          if (onReady) onReady(player);
        });

        player.on('error', (error) => {
          handlePlayerError(player, error);
        });
      });

      // Add a class to identify our video player for styling
      player.addClass('vjs-custom-player');
    }
  }, [onReady, onError, src, type]);

  /**
   * Handle errors from the Video.js player
   * 
   * @param {Object} player - Video.js player instance
   * @param {Error} error - Error object from Video.js
   */
  const handlePlayerError = (player, error) => {
    const playerError = player.error();
    const errorObj = mediaErrorService.createErrorFromMediaEvent(
      error,
      { ...mediaItem, src, type }
    );
    
    mediaErrorService.logMediaError(errorObj);
    
    // Handle problematic formats with special care
    if (mediaService.isProblematicFormat(type)) {
      console.log('⚠️ Problematic format detected, attempting alternative strategies');
      
      // Log browser compatibility information
      const compatInfo = mediaService.getBrowserCompatInfo(type);
      console.log('📊 Browser format compatibility:', compatInfo);
      
      // If it's a format error (code 4), try alternative strategies
      if (playerError?.code === 4) {
        console.log('🔄 Trying alternative sources for format compatibility');
        
        // Get alternative MIME types to try
        const altMimeTypes = mediaService.getAlternativeMimeTypes(type);
        if (altMimeTypes.length > 0) {
          // Create an array of sources to try
          const sources = altMimeTypes.map(mimeType => ({
            src,
            type: mimeType
          }));
          
          // Update player with alternative sources
          player.src(sources);
          player.load();
          
          player.one('canplay', () => {
            console.log('✅ Alternative source playback successful');
          });
          
          player.play().catch(playErr => {
            console.error('❌ Failed to play with alternative sources:', playErr);
            
            // If everything failed, report the error
            if (onError) onError(errorObj);
          });
          
          return; // Exit early to avoid triggering onError yet
        }
      }
    }
    
    // If we reach here, we couldn't recover
    if (onError) onError(errorObj);
  };

  // Dispose the Video.js player when the component unmounts
  useEffect(() => {
    return () => {
      // Clean up Video.js player
      const player = playerRef.current;
      if (player && !player.isDisposed()) {
        console.log('🧹 Disposing Video.js player');
        player.dispose();
        playerRef.current = null;
      }
      
      // Clean up transcoded source if any
      if (transcodedSrc) {
        console.log('🧹 Revoking transcoded video URL');
        URL.revokeObjectURL(transcodedSrc);
      }
    };
  }, [transcodedSrc]);

  // Show transcoding UI if transcoding is in progress
  if (isTranscoding) {
    return (
      <div className="video-player-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: '#222' }}>
        <div style={{ color: 'white', marginBottom: '16px' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px', textAlign: 'center' }}>
            Converting Video Format
          </div>
          <div style={{ fontSize: '14px', marginBottom: '20px', textAlign: 'center', opacity: 0.7 }}>
            {type?.toUpperCase()} format detected. Converting to MP4 for better compatibility...
          </div>
        </div>
        
        {/* Progress bar */}
        <div style={{ width: '80%', maxWidth: '300px', background: '#444', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
          <div 
            style={{ 
              width: `${Math.round(transcodingProgress * 100)}%`, 
              height: '100%', 
              background: '#007bff',
              transition: 'width 0.3s'
            }}
          />
        </div>
        
        <div style={{ marginTop: '12px', fontSize: '14px', color: '#ccc' }}>
          {Math.round(transcodingProgress * 100)}% complete
        </div>
      </div>
    );
  }
  
  // Show error UI if there was a transcoding error
  if (transcodingError) {
    return (
      <div className="video-player-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: '#222', padding: '24px' }}>
        <div style={{ color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>
            Video Conversion Failed
          </div>
          <div style={{ fontSize: '14px', marginBottom: '20px', opacity: 0.7 }}>
            {transcodingError}
          </div>
          <div>
            <a 
              href={src} 
              download
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                borderRadius: '4px',
                textDecoration: 'none'
              }}
            >
              Download Original Video
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="video-player-container">
      <div data-vjs-player>
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered"
          playsInline
        >
          {/* Use transcoded source if available, otherwise use original with multiple source options */}
          {transcodedSrc ? (
            <source src={transcodedSrc} type="video/mp4" />
          ) : mediaService.isProblematicFormat(type) ? (
            // For problematic formats, try multiple source formats
            mediaService.getAlternativeMimeTypes(type).map((mimeType, index) => (
              <source key={index} src={src} type={mimeType} />
            ))
          ) : (
            // For standard formats use the regular MIME type
            <source src={src} type={mediaService.getMimeType(type)} />
          )}
          <p className="vjs-no-js">
            To view this video please enable JavaScript, and consider upgrading to a
            web browser that supports HTML5 video
          </p>
        </video>
      </div>
    </div>
  );
};

VideoPlayer.propTypes = {
  /** Source URL for the video */
  src: PropTypes.string.isRequired,
  
  /** MIME type of the video */
  type: PropTypes.string,
  
  /** Optional poster image URL */
  poster: PropTypes.string,
  
  /** Original media item data */
  mediaItem: PropTypes.object,
  
  /** Callback when player is ready */
  onReady: PropTypes.func,
  
  /** Callback when player encounters an error */
  onError: PropTypes.func
};

VideoPlayer.defaultProps = {
  type: '',
  poster: '',
  mediaItem: {},
  onReady: () => {},
  onError: () => {}
};

export default VideoPlayer;