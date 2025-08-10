import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTouchInteractions } from '../../hooks/useTouchInteractions';
import { fadeIn, slideInUp, float, pulse } from '../../styles/animations';
import ds from '../../styles/designSystem';
import MediaCarousel from '../media/MediaCarousel';
import MediaMasonryRenderer from '../media/MediaMasonryRenderer';

const EntryContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(
    180deg,
    ${ds.colors.sand[50]} 0%,
    white 30%,
    white 100%
  );
  animation: ${fadeIn} ${ds.transitions.duration.slow} ${ds.transitions.easing.enter};
`;

const EntryHeader = styled.header`
  position: relative;
  padding: ${ds.spacing[16]} ${ds.spacing[6]} ${ds.spacing[12]};
  text-align: center;
  overflow: hidden;
  
  /* Decorative background shapes */
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle at 30% 40%,
      ${ds.colors.sand[200]}22 0%,
      transparent 50%
    );
    animation: ${float} 20s ease-in-out infinite;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle at 70% 60%,
      ${ds.colors.ocean[200]}22 0%,
      transparent 50%
    );
    animation: ${float} 25s ease-in-out infinite reverse;
  }
`;

const EntryTitle = styled.h1`
  position: relative;
  margin: 0 0 ${ds.spacing[4]} 0;
  font-family: ${ds.typography.fontFamily.serif};
  font-size: ${ds.typography.fontSize['5xl']};
  font-weight: ${ds.typography.fontWeight.bold};
  color: ${ds.colors.stone[900]};
  line-height: ${ds.typography.lineHeight.tight};
  animation: ${slideInUp} ${ds.transitions.duration.slow} ${ds.transitions.easing.enter};
  
  @media (max-width: ${ds.breakpoints.sm}) {
    font-size: ${ds.typography.fontSize['4xl']};
  }
`;

const EntryMeta = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${ds.spacing[6]};
  margin-top: ${ds.spacing[6]};
  animation: ${slideInUp} ${ds.transitions.duration.slow} ${ds.transitions.easing.enter} 0.1s both;
  
  @media (max-width: ${ds.breakpoints.sm}) {
    flex-direction: column;
    gap: ${ds.spacing[3]};
  }
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${ds.spacing[2]};
  font-size: ${ds.typography.fontSize.sm};
  color: ${ds.colors.stone[600]};
  
  /* Icon */
  span:first-child {
    font-size: ${ds.typography.fontSize.lg};
  }
`;

const MetaDivider = styled.div`
  width: 1px;
  height: 20px;
  background: ${ds.colors.stone[300]};
  
  @media (max-width: ${ds.breakpoints.sm}) {
    display: none;
  }
`;

const EntryContent = styled.article`
  max-width: 800px;
  margin: 0 auto;
  padding: 0 ${ds.spacing[6]} ${ds.spacing[16]};
  animation: ${slideInUp} ${ds.transitions.duration.slow} ${ds.transitions.easing.enter} 0.2s both;
`;

const ContentSection = styled.section`
  margin-bottom: ${ds.spacing[12]};
  
  /* First paragraph - larger text */
  > p:first-child {
    font-size: ${ds.typography.fontSize.xl};
    line-height: ${ds.typography.lineHeight.relaxed};
    color: ${ds.colors.stone[700]};
    margin-bottom: ${ds.spacing[8]};
  }
  
  /* Regular paragraphs */
  p {
    font-family: ${ds.typography.fontFamily.sans};
    font-size: ${ds.typography.fontSize.lg};
    line-height: ${ds.typography.lineHeight.relaxed};
    color: ${ds.colors.stone[700]};
    margin-bottom: ${ds.spacing[6]};
  }
  
  /* Headers */
  h2 {
    margin: ${ds.spacing[12]} 0 ${ds.spacing[6]} 0;
    font-family: ${ds.typography.fontFamily.serif};
    font-size: ${ds.typography.fontSize['3xl']};
    font-weight: ${ds.typography.fontWeight.semibold};
    color: ${ds.colors.stone[900]};
    line-height: ${ds.typography.lineHeight.tight};
  }
  
  h3 {
    margin: ${ds.spacing[8]} 0 ${ds.spacing[4]} 0;
    font-family: ${ds.typography.fontFamily.sans};
    font-size: ${ds.typography.fontSize['xl']};
    font-weight: ${ds.typography.fontWeight.semibold};
    color: ${ds.colors.stone[800]};
    line-height: ${ds.typography.lineHeight.snug};
  }
  
  /* Blockquotes */
  blockquote {
    position: relative;
    margin: ${ds.spacing[8]} 0;
    padding: ${ds.spacing[6]} ${ds.spacing[8]};
    background: ${ds.colors.sand[50]};
    border-left: 4px solid ${ds.colors.sand[400]};
    border-radius: ${ds.borderRadius.md};
    font-style: italic;
    
    &::before {
      content: '"';
      position: absolute;
      top: -${ds.spacing[4]};
      left: ${ds.spacing[4]};
      font-size: ${ds.typography.fontSize['6xl']};
      font-family: ${ds.typography.fontFamily.serif};
      color: ${ds.colors.sand[300]};
      line-height: 1;
    }
    
    p {
      margin: 0;
      color: ${ds.colors.stone[700]};
    }
  }
  
  /* Links */
  a {
    color: ${ds.colors.ocean[600]};
    text-decoration: none;
    border-bottom: 1px solid ${ds.colors.ocean[200]};
    transition: all ${ds.transitions.duration.fast} ${ds.transitions.easing.smooth};
    
    &:active {
      color: ${ds.colors.ocean[700]};
      border-bottom-color: ${ds.colors.ocean[400]};
    }
  }
  
  /* Horizontal rule */
  hr {
    margin: ${ds.spacing[12]} 0;
    border: none;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      ${ds.colors.stone[300]} 20%,
      ${ds.colors.stone[300]} 80%,
      transparent
    );
  }
`;

const MediaSection = styled.div`
  margin: ${ds.spacing[12]} -${ds.spacing[6]};
  
  @media (min-width: ${ds.breakpoints.lg}) {
    margin: ${ds.spacing[12]} 0;
  }
`;

const LocationSection = styled.section`
  margin: ${ds.spacing[16]} 0;
  padding: ${ds.spacing[8]};
  background: ${ds.colors.glass};
  backdrop-filter: blur(10px);
  border-radius: ${ds.borderRadius.xl};
  border: 1px solid ${ds.colors.glassBorder};
`;

const LocationHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${ds.spacing[3]};
  margin-bottom: ${ds.spacing[4]};
  
  h3 {
    margin: 0;
    font-family: ${ds.typography.fontFamily.sans};
    font-size: ${ds.typography.fontSize.xl};
    font-weight: ${ds.typography.fontWeight.semibold};
    color: ${ds.colors.stone[900]};
  }
  
  /* Location icon */
  &::before {
    content: '📍';
    font-size: ${ds.typography.fontSize['2xl']};
  }
`;

const LocationDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${ds.spacing[4]};
`;

const LocationItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${ds.spacing[1]};
  
  label {
    font-size: ${ds.typography.fontSize.xs};
    font-weight: ${ds.typography.fontWeight.medium};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${ds.colors.stone[500]};
  }
  
  span {
    font-size: ${ds.typography.fontSize.base};
    color: ${ds.colors.stone[700]};
  }
`;

const FloatingActionBar = styled.div`
  position: fixed;
  bottom: ${ds.spacing[8]};
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: ${ds.spacing[3]};
  padding: ${ds.spacing[3]};
  background: ${ds.colors.glass};
  backdrop-filter: blur(20px);
  border-radius: ${ds.borderRadius.full};
  border: 1px solid ${ds.colors.glassBorder};
  box-shadow: ${ds.shadows.xl};
  z-index: ${ds.zIndex.fixed};
  animation: ${slideInUp} ${ds.transitions.duration.slow} ${ds.transitions.easing.enter} 0.5s both;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${props => props.primary ? ds.colors.sand[500] : 'transparent'};
  color: ${props => props.primary ? 'white' : ds.colors.stone[700]};
  border: none;
  border-radius: ${ds.borderRadius.full};
  cursor: pointer;
  transition: all ${ds.transitions.duration.fast} ${ds.transitions.easing.smooth};
  
  &:active {
    transform: scale(${ds.touch.tapScale});
  }
  
  /* Icon */
  svg {
    width: 24px;
    height: 24px;
  }
`;

const SampleIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, ${ds.colors.sand[300]} 0%, ${ds.colors.sand[400]} 100%);
  border-radius: ${ds.borderRadius.md};
  box-shadow: ${ds.shadows.sm};
  animation: ${pulse} 3s ease-in-out infinite;
  
  &::before {
    content: '🏖️';
    font-size: ${ds.typography.fontSize.xl};
  }
`;

export const EnhancedEntryView = ({ entry }) => {
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // Track scroll progress for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrolled / maxScroll, 1);
      setScrollProgress(progress);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  if (!entry) return null;
  
  const allMedia = [...(entry.photos || []), ...(entry.videos || [])];
  const location = entry.location || {};
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const handleMediaClick = (clickedMedia) => {
    const index = allMedia.findIndex(
      item => item.identifier === clickedMedia.identifier || 
             item.md5 === clickedMedia.md5
    );
    if (index !== -1) {
      setCarouselStartIndex(index);
      setCarouselOpen(true);
    }
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: entry.title,
        text: `Check out this sand sample from ${location.placeName || 'Unknown Location'}`,
        url: window.location.href
      });
    }
  };
  
  return (
    <EntryContainer>
      <EntryHeader style={{
        transform: `translateY(${scrollProgress * -50}px)`,
        opacity: 1 - scrollProgress * 0.5
      }}>
        <SampleIcon />
        <EntryTitle>{entry.title}</EntryTitle>
        <EntryMeta>
          <MetaItem>
            <span>📅</span>
            <span>{formatDate(entry.creationDate)}</span>
          </MetaItem>
          <MetaDivider />
          <MetaItem>
            <span>🏷️</span>
            <span>{entry.type}</span>
          </MetaItem>
          <MetaDivider />
          <MetaItem>
            <span>🌍</span>
            <span>{entry.region}</span>
          </MetaItem>
        </EntryMeta>
      </EntryHeader>
      
      <EntryContent>
        <ContentSection>
          {/* Parse and render the journal text beautifully */}
          <div dangerouslySetInnerHTML={{ 
            __html: entry.text
              .replace(/^# .+\n\n/, '') // Remove title (already shown)
              .replace(/\n\n/g, '</p><p>') // Convert paragraphs
              .replace(/^/, '<p>') // Start first paragraph
              .replace(/$/, '</p>') // End last paragraph
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Bold
              .replace(/\*(.+?)\*/g, '<em>$1</em>') // Italic
              .replace(/!\[\]\(dayone-moment:\/\/[A-F0-9]+\)/gi, '') // Remove media refs
          }} />
        </ContentSection>
        
        {allMedia.length > 0 && (
          <MediaSection>
            <MediaMasonryRenderer
              mediaItems={allMedia}
              onMediaClick={handleMediaClick}
            />
          </MediaSection>
        )}
        
        {location.placeName && (
          <LocationSection>
            <LocationHeader>
              <h3>Location Details</h3>
            </LocationHeader>
            <LocationDetails>
              <LocationItem>
                <label>Place</label>
                <span>{location.placeName}</span>
              </LocationItem>
              {location.localityName && (
                <LocationItem>
                  <label>Locality</label>
                  <span>{location.localityName}</span>
                </LocationItem>
              )}
              {location.country && (
                <LocationItem>
                  <label>Country</label>
                  <span>{location.country}</span>
                </LocationItem>
              )}
              {location.latitude && (
                <LocationItem>
                  <label>Coordinates</label>
                  <span>{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
                </LocationItem>
              )}
            </LocationDetails>
          </LocationSection>
        )}
      </EntryContent>
      
      <FloatingActionBar>
        <ActionButton onClick={() => window.history.back()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </ActionButton>
        <ActionButton primary onClick={handleShare}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8.59 13.51l6.83 3.98m-.01-10.98l-6.82 3.98M21 5a3 3 0 11-6 0 3 3 0 016 0zM9 12a3 3 0 11-6 0 3 3 0 016 0zm12 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </ActionButton>
        <ActionButton>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </ActionButton>
      </FloatingActionBar>
      
      {carouselOpen && (
        <MediaCarousel
          mediaItems={allMedia}
          startIndex={carouselStartIndex}
          onClose={() => setCarouselOpen(false)}
        />
      )}
    </EntryContainer>
  );
};

export default EnhancedEntryView;