import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import mediaService from '../../services/mediaService';
import MediaImage from './MediaImage';
import MediaVideo from './MediaVideo';
import MediaDocument from './MediaDocument';

/**
 * Full-screen overlay for the carousel
 */
const CarouselOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease-in-out;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

/**
 * Container for the media content
 */
const MediaContainer = styled.div`
  max-width: 90vw;
  max-height: 90vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

/**
 * Close button
 */
const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  color: white;
  font-size: 36px;
  cursor: pointer;
  padding: 10px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s;
  z-index: 10;
  
  &:hover {
    opacity: 1;
  }
`;

/**
 * Navigation button base styles
 */
const NavButton = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 24px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  opacity: 0.7;
  
  &:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.2);
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

/**
 * Previous button
 */
const PrevButton = styled(NavButton)`
  left: 40px;
`;

/**
 * Next button
 */
const NextButton = styled(NavButton)`
  right: 40px;
`;

/**
 * Media counter
 */
const MediaCounter = styled.div`
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-size: 14px;
  opacity: 0.7;
  background: rgba(0, 0, 0, 0.5);
  padding: 8px 16px;
  border-radius: 20px;
`;

/**
 * Media wrapper for proper sizing
 */
const MediaWrapper = styled.div`
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  img, video {
    max-width: 100%;
    max-height: 90vh;
    width: auto;
    height: auto;
    object-fit: contain;
  }
  
  /* For documents */
  .media-document {
    background: white;
    padding: 40px;
    border-radius: 8px;
    max-width: 600px;
  }
`;

/**
 * Renders a single media item in the carousel
 */
const CarouselMediaItem = ({ media }) => {
  if (!media) return null;
  
  const { type } = media;
  const mediaPath = mediaService.getMediaPath(media);
  const mediaCategory = mediaService.getMediaCategory(type);
  
  switch (mediaCategory) {
    case 'image':
      return <MediaImage src={mediaPath} mediaItem={media} />;
      
    case 'video':
      return <MediaVideo mediaPath={mediaPath} mediaItem={media} />;
      
    case 'document':
      return (
        <div className="media-document">
          <MediaDocument mediaPath={mediaPath} mediaItem={media} />
        </div>
      );
      
    default:
      return (
        <div className="media-document">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
            <div style={{ fontSize: '18px' }}>Unknown media format</div>
          </div>
        </div>
      );
  }
};

/**
 * Full-screen media carousel viewer
 */
const MediaCarousel = ({ mediaItems, startIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (currentIndex < mediaItems.length - 1) {
            setCurrentIndex(currentIndex + 1);
          }
          break;
        case 'Escape':
          onClose();
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Prevent body scroll when carousel is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [currentIndex, mediaItems.length, onClose]);
  
  if (!mediaItems || mediaItems.length === 0) return null;
  
  const currentMedia = mediaItems[currentIndex];
  
  return (
    <CarouselOverlay onClick={(e) => {
      // Close if clicking on overlay (not on media or buttons)
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <CloseButton onClick={onClose} aria-label="Close carousel">
        ×
      </CloseButton>
      
      <PrevButton 
        onClick={() => setCurrentIndex(currentIndex - 1)}
        disabled={currentIndex === 0}
        aria-label="Previous media"
      >
        ‹
      </PrevButton>
      
      <MediaContainer>
        <MediaWrapper>
          <CarouselMediaItem media={currentMedia} />
        </MediaWrapper>
      </MediaContainer>
      
      <NextButton 
        onClick={() => setCurrentIndex(currentIndex + 1)}
        disabled={currentIndex === mediaItems.length - 1}
        aria-label="Next media"
      >
        ›
      </NextButton>
      
      <MediaCounter>
        {currentIndex + 1} / {mediaItems.length}
      </MediaCounter>
    </CarouselOverlay>
  );
};

MediaCarousel.propTypes = {
  /** Array of all media items to display */
  mediaItems: PropTypes.arrayOf(PropTypes.shape({
    md5: PropTypes.string,
    type: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number,
    identifier: PropTypes.string
  })).isRequired,
  
  /** Starting index for the carousel */
  startIndex: PropTypes.number,
  
  /** Callback when carousel is closed */
  onClose: PropTypes.func.isRequired
};

CarouselMediaItem.propTypes = {
  /** Media item object */
  media: PropTypes.shape({
    md5: PropTypes.string,
    type: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number,
    identifier: PropTypes.string,
    mimeType: PropTypes.string
  })
};

export default MediaCarousel;