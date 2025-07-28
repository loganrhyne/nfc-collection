import React, { useState, useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import '@videojs/http-streaming';
import 'videojs-contrib-quality-levels';
import videoTranscoder from '../../utils/videoTranscoder';
const { transcodeVideo, needsTranscoding, releaseTranscodedVideo } = videoTranscoder;

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
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [transcodingProgress, setTranscodingProgress] = useState(0);
  const [transcodedSrc, setTranscodedSrc] = useState(null);
  const [transcodingError, setTranscodingError] = useState(null);
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      // Get the actual DOM video element
      const videoElement = videoRef.current;
      
      if (!videoElement) return;

      // Initialize Video.js player with enhanced options for MOV support
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
          type: typeof getMimeType(type) === 'string' ? getMimeType(type) : 'video/mp4'
        }]
      }, () => {
        console.log('Video.js player initialized for:', src);
        
        // Add event listeners
        player.on('ready', () => {
          console.log('Video.js player ready');
          if (onReady) onReady(player);
        });

        player.on('error', (error) => {
          console.error('Video.js player error:', error);
          
          // Try to display more detailed error info
          const errorObj = player.error();
          if (errorObj) {
            console.error(`Video.js error code: ${errorObj.code}, message: ${errorObj.message}`);
            
            // If it's a format error (code 4), try additional sources for MOV
            if (errorObj.code === 4 && type?.toLowerCase() === 'mov') {
              console.log('Trying alternative source formats for MOV file...');
              
              // Try alternative source
              player.src([
                { src: src, type: 'video/mp4' },
                { src: src, type: 'video/quicktime' },
                { src: src, type: 'application/x-mpegURL' }
              ]);
              
              // Try to play with the new sources
              player.load();
              player.play().catch(playErr => {
                console.error('Failed to play with alternative sources:', playErr);
                console.log('Attempting to transcode the video on the fly...');
                
                // Try to transcode the video
                setIsTranscoding(true);
                
                transcodeVideo(src, {
                  outputFormat: 'mp4',
                  onProgress: (progress) => {
                    console.log(`Transcoding progress: ${Math.round(progress * 100)}%`);
                    setTranscodingProgress(progress);
                  }
                }).then(transcodedUrl => {
                  console.log('Transcoding completed, setting new source:', transcodedUrl);
                  setTranscodedSrc(transcodedUrl);
                  
                  // Update player source
                  player.src({ src: transcodedUrl, type: 'video/mp4' });
                  player.load();
                  player.play().catch(finalErr => {
                    console.error('Failed to play even after transcoding:', finalErr);
                    if (onError) onError(finalErr);
                  });
                  
                  setIsTranscoding(false);
                }).catch(transcodingErr => {
                  console.error('Failed to transcode video:', transcodingErr);
                  setTranscodingError(transcodingErr.message || 'Transcoding failed');
                  setIsTranscoding(false);
                  if (onError) onError(errorObj);
                });
                
                return; // Exit early to avoid triggering onError yet
              });
              
              return; // Exit early to avoid triggering onError yet
            }
          }
          
          if (onError) onError(error);
        });
      });

      // Add a class to identify our video player type for styling
      player.addClass('vjs-custom-player');
    }
  }, [onReady, onError, src, type]);

  // Dispose the Video.js player when the component unmounts
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        console.log('Disposing Video.js player');
        player.dispose();
        playerRef.current = null;
      }
      
      // Also clean up transcoded video if any
      if (transcodedSrc) {
        console.log('Releasing transcoded video');
        releaseTranscodedVideo(transcodedSrc);
      }
    };
  }, [transcodedSrc]);

  // Get the appropriate MIME type with better codec specifications for MOV files
  const getMimeType = (fileType) => {
    const type = fileType?.toLowerCase();
    const mimeTypes = {
      // For MOV files, try video/mp4 first as browsers often handle this better than video/quicktime
      'mov': 'video/mp4',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
      'wmv': 'video/x-ms-wmv'
    };
    
    return mimeTypes[type] || `video/${type}`;
  };

  // Show transcoding UI if transcoding is in progress
  if (isTranscoding) {
    return (
      <div className="video-player-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: '#222' }}>
        <div style={{ color: 'white', marginBottom: '16px' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px', textAlign: 'center' }}>
            Converting Video Format
          </div>
          <div style={{ fontSize: '14px', marginBottom: '20px', textAlign: 'center', opacity: 0.7 }}>
            MOV format detected. Converting to MP4 for better compatibility...
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
          {/* Use transcoded source if available, otherwise use original */}
          {transcodedSrc ? (
            <source src={transcodedSrc} type="video/mp4" />
          ) : type && type.toLowerCase() === 'mov' ? (
            // For MOV files, try multiple source formats in order of most compatible first
            <>
              <source src={src} type="video/mp4" />
              <source src={src} type="video/mp4; codecs='avc1.42E01E, mp4a.40.2'" />
              <source src={src} type="video/quicktime" />
              <source src={src} type="video/*" /> {/* Try generic video type as fallback */}
              <source src={src} type="application/octet-stream" /> {/* Last resort */}
            </>
          ) : (
            // For other video types use the standard approach
            <source src={src} type={getMimeType(type)} />
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

export default VideoPlayer;