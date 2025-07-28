import React from 'react';
import PropTypes from 'prop-types';

/**
 * A standardized loading indicator for media content
 * 
 * @component
 */
const MediaLoading = ({ 
  message = 'Loading media...',
  centered = true,
  overlay = true,
  size = 'medium'
}) => {
  // Size configurations
  const sizeConfig = {
    small: {
      spinnerSize: '16px',
      fontSize: '12px'
    },
    medium: {
      spinnerSize: '32px',
      fontSize: '14px'
    },
    large: {
      spinnerSize: '48px',
      fontSize: '16px'
    }
  };
  
  const { spinnerSize, fontSize } = sizeConfig[size] || sizeConfig.medium;
  
  // Component styles
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    ...(overlay ? {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 10
    } : {}),
    ...(centered && !overlay ? {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none'
    } : {})
  };
  
  // Spinner animation
  const spinnerStyle = {
    width: spinnerSize,
    height: spinnerSize,
    border: `3px solid rgba(255, 255, 255, 0.3)`,
    borderRadius: '50%',
    borderTop: `3px solid #007bff`,
    animation: 'media-spinner 1s linear infinite',
    marginBottom: '12px'
  };
  
  // Message style
  const messageStyle = {
    color: 'white',
    fontSize: fontSize,
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)'
  };
  
  return (
    <div className="media-loading-container" style={containerStyle}>
      {/* Spinner animation */}
      <div className="media-loading-spinner" style={spinnerStyle} />
      
      {/* Loading message */}
      {message && (
        <div className="media-loading-message" style={messageStyle}>
          {message}
        </div>
      )}
      
      {/* Add required CSS for spinner animation */}
      <style>{`
        @keyframes media-spinner {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

MediaLoading.propTypes = {
  /** Loading message to display */
  message: PropTypes.string,
  
  /** Whether to center the loading indicator */
  centered: PropTypes.bool,
  
  /** Whether to display as overlay */
  overlay: PropTypes.bool,
  
  /** Size of the loading indicator */
  size: PropTypes.oneOf(['small', 'medium', 'large'])
};

export default MediaLoading;