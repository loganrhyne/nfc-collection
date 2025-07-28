import React from 'react';
import PropTypes from 'prop-types';
import mediaErrorService from '../../services/mediaErrorService';
import mediaService from '../../services/mediaService';

/**
 * A standardized component for displaying media errors
 * 
 * @component
 */
const MediaErrorDisplay = ({ 
  error, 
  mediaItem, 
  mediaPath, 
  downloadable = true,
  openInNewTab = true,
  retry = null
}) => {
  // If no error provided but we have mediaItem info, create a generic error
  const displayError = error || new mediaErrorService.MediaError({
    category: mediaErrorService.ERROR_CATEGORIES.UNKNOWN,
    message: 'Unknown media error',
    mediaInfo: mediaItem
  });
  
  // Determine what type of media we're dealing with for appropriate icon
  const mediaType = mediaItem?.type ? 
    mediaService.getMediaCategory(mediaItem.type) : 
    'unknown';
  
  // Select icon based on media type
  const getIconForMediaType = () => {
    switch (mediaType) {
      case 'image':
        return '📷';
      case 'video':
        return '🎬';
      case 'document':
        return '📄';
      default:
        return '📁';
    }
  };
  
  // Get appropriate error message
  const errorMessage = displayError.getUserMessage();
  
  // Determine if this is a problematic format
  const isProblematicFormat = mediaItem?.type && 
    mediaService.isProblematicFormat(mediaItem.type);
  
  return (
    <div className="media-item-error">
      <div style={{ padding: '20px', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>
          {getIconForMediaType()}
        </div>
        
        {/* Primary error message */}
        <div style={{ fontWeight: 500, marginBottom: '8px' }}>
          {errorMessage}
        </div>
        
        {/* Secondary message for problematic formats */}
        {isProblematicFormat && (
          <div style={{ fontSize: '13px', margin: '8px 0', color: '#666' }}>
            {mediaItem.type.toUpperCase()} files have limited browser support.
            <div style={{ marginTop: '4px' }}>
              Try using MP4 format for better compatibility.
            </div>
          </div>
        )}
        
        {/* File info */}
        {mediaItem && (
          <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
            {mediaItem.md5}.{mediaItem.type}
          </div>
        )}
        
        {/* Action buttons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '10px', 
          marginTop: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Download button */}
          {downloadable && mediaPath && (
            <a 
              href={mediaPath} 
              download={mediaItem ? `${mediaItem.md5}.${mediaItem.type}` : undefined}
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                backgroundColor: '#007bff',
                color: 'white',
                borderRadius: '4px',
                textDecoration: 'none'
              }}
            >
              Download {mediaType === 'video' ? 'Video' : mediaType === 'image' ? 'Image' : 'File'}
            </a>
          )}
          
          {/* Open in new tab button */}
          {openInNewTab && mediaPath && (
            <a 
              href={mediaPath}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                borderRadius: '4px',
                textDecoration: 'none'
              }}
            >
              Open in New Tab
            </a>
          )}
          
          {/* Retry button if a retry callback was provided */}
          {retry && (
            <button
              onClick={retry}
              style={{
                padding: '6px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

MediaErrorDisplay.propTypes = {
  /** Error object */
  error: PropTypes.instanceOf(mediaErrorService.MediaError),
  
  /** Media item information */
  mediaItem: PropTypes.object,
  
  /** Path to the media file */
  mediaPath: PropTypes.string,
  
  /** Whether to show download button */
  downloadable: PropTypes.bool,
  
  /** Whether to show open in new tab button */
  openInNewTab: PropTypes.bool,
  
  /** Retry callback function */
  retry: PropTypes.func
};

export default MediaErrorDisplay;