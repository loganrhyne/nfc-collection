import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

/**
 * Custom Video.js player component with enhanced format support
 * 
 * @param {Object} props - Component props
 * @param {string} props.src - Source URL for the video
 * @param {string} props.type - MIME type of the video
 * @param {string} props.poster - Optional poster image URL
 * @param {Object} props.mediaItem - Original media item data
 * @param {Function} props.onReady - Callback when player is ready
 * @param {Function} props.onError - Callback when player encounters an error
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

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      // Get the actual DOM video element
      const videoElement = videoRef.current;
      
      if (!videoElement) return;

      // Initialize Video.js player
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
          nativeAudioTracks: false,
          nativeVideoTracks: false,
        }
      }, () => {
        console.log('Video.js player initialized for:', src);
        
        // Add event listeners
        player.on('ready', () => {
          console.log('Video.js player ready');
          if (onReady) onReady(player);
        });

        player.on('error', (error) => {
          console.error('Video.js player error:', error);
          if (onError) onError(error);
        });
      });

      // Add a class to identify our video player type for styling
      player.addClass('vjs-custom-player');
    }
  }, [onReady, onError, src]);

  // Dispose the Video.js player when the component unmounts
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        console.log('Disposing Video.js player');
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  // Get the appropriate MIME type
  const getMimeType = (fileType) => {
    const type = fileType?.toLowerCase();
    const mimeTypes = {
      'mov': 'video/quicktime',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
      'wmv': 'video/x-ms-wmv'
    };
    
    return mimeTypes[type] || `video/${type}`;
  };

  // Prepare video.js specific props
  const videoJsOptions = {
    sources: [{
      src: src,
      type: getMimeType(type)
    }],
    poster: poster
  };

  return (
    <div className="video-player-container">
      <div data-vjs-player>
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered"
          playsInline
        >
          <source src={src} type={getMimeType(type)} />
          <p className="vjs-no-js">
            To view this video please enable JavaScript, and consider upgrading to a
            web browser that supports HTML5 video
          </p>
        </video>
      </div>
    </div>
  );
};

export default VideoPlayer;