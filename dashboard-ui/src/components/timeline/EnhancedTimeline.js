import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useData } from '../../context/DataContext';
import { useTouchInteractions } from '../../hooks/useTouchInteractions';
import { slideInLeft, fadeIn, pulse, float, shimmer } from '../../styles/animations';
import ds from '../../styles/designSystem';

/**
 * Enhanced timeline with beautiful animations and touch interactions
 */

const TimelineContainer = styled.div`
  height: 100%;
  padding: ${ds.spacing[4]};
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  
  /* Hide scrollbar for cleaner look */
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const TimelineLayout = styled.div`
  position: relative;
  padding-left: ${ds.spacing[12]};
  min-height: 100%;
`;

const TimelineLine = styled.div`
  position: absolute;
  left: ${ds.spacing[6]};
  top: ${ds.spacing[8]};
  bottom: ${ds.spacing[8]};
  width: 2px;
  
  /* Gradient line with glow effect */
  background: linear-gradient(
    180deg,
    transparent 0%,
    ${ds.colors.sand[300]} 10%,
    ${ds.colors.sand[400]} 50%,
    ${ds.colors.sand[300]} 90%,
    transparent 100%
  );
  
  /* Animated glow */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      transparent 0%,
      ${ds.colors.sand[400]} 50%,
      transparent 100%
    );
    opacity: 0.5;
    filter: blur(4px);
    animation: ${pulse} 3s ease-in-out infinite;
  }
`;

const TimelineEntries = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${ds.spacing[6]};
  padding: ${ds.spacing[4]} 0;
`;

const TimelineEntry = styled.div`
  position: relative;
  opacity: 0;
  animation: ${slideInLeft} ${ds.transitions.duration.slow} ${ds.transitions.easing.enter} forwards;
  animation-delay: ${props => props.index * 50}ms;
  
  /* Touch feedback */
  transition: transform ${ds.transitions.duration.base} ${ds.transitions.easing.smooth};
  transform: ${props => props.isPressed ? `scale(${ds.touch.tapScale})` : 'scale(1)'};
`;

const TimelineDot = styled.div`
  position: absolute;
  left: -${ds.spacing[10]};
  top: ${ds.spacing[6]};
  width: 16px;
  height: 16px;
  border-radius: ${ds.borderRadius.full};
  background: ${props => props.color || ds.colors.sand[500]};
  box-shadow: 
    0 0 0 4px white,
    0 0 0 5px ${props => props.color || ds.colors.sand[500]}33,
    ${ds.shadows.sm};
  z-index: 2;
  
  /* Pulse animation for selected item */
  ${props => props.selected && `
    animation: ${pulse} 2s ease-in-out infinite;
    box-shadow: 
      0 0 0 4px white,
      0 0 0 8px ${props.color || ds.colors.sand[500]}33,
      0 0 20px ${props.color || ds.colors.sand[500]}66,
      ${ds.shadows.md};
  `}
  
  /* Connection line to card */
  &::after {
    content: '';
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    width: ${ds.spacing[6]};
    height: 1px;
    background: ${ds.colors.stone[300]};
    opacity: ${props => props.selected ? 1 : 0.5};
    transition: opacity ${ds.transitions.duration.base} ${ds.transitions.easing.smooth};
  }
`;

const TimelineCard = styled.div`
  position: relative;
  background: ${props => props.selected 
    ? `linear-gradient(135deg, ${ds.colors.sand[50]} 0%, white 100%)`
    : 'white'
  };
  border-radius: ${ds.borderRadius.xl};
  padding: ${ds.spacing[6]};
  cursor: pointer;
  overflow: hidden;
  
  /* Shadow and border */
  box-shadow: ${props => props.selected ? ds.shadows.lg : ds.shadows.md};
  border: 1px solid ${props => props.selected 
    ? ds.colors.sand[300] 
    : ds.colors.stone[200]
  };
  
  /* Hover effects */
  transition: all ${ds.transitions.duration.base} ${ds.transitions.easing.smooth};
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      transparent 0%,
      ${ds.colors.sand[100]}22 100%
    );
    opacity: 0;
    transition: opacity ${ds.transitions.duration.base} ${ds.transitions.easing.smooth};
  }
  
  ${props => props.isHovered && `
    transform: translateX(4px);
    box-shadow: ${ds.shadows.xl};
    
    &::before {
      opacity: 1;
    }
  `}
`;

const EntryDate = styled.div`
  font-size: ${ds.typography.fontSize.xs};
  font-weight: ${ds.typography.fontWeight.medium};
  color: ${ds.colors.stone[500]};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${ds.spacing[2]};
  display: flex;
  align-items: center;
  gap: ${ds.spacing[2]};
  
  /* Date icon */
  &::before {
    content: '📅';
    font-size: ${ds.typography.fontSize.sm};
  }
`;

const EntryTitle = styled.h3`
  margin: 0 0 ${ds.spacing[3]} 0;
  font-family: ${ds.typography.fontFamily.serif};
  font-size: ${ds.typography.fontSize.xl};
  font-weight: ${ds.typography.fontWeight.semibold};
  color: ${ds.colors.stone[900]};
  line-height: ${ds.typography.lineHeight.tight};
`;

const EntryLocation = styled.div`
  display: flex;
  align-items: center;
  gap: ${ds.spacing[2]};
  font-size: ${ds.typography.fontSize.sm};
  color: ${ds.colors.stone[600]};
  margin-bottom: ${ds.spacing[3]};
  
  /* Location icon */
  &::before {
    content: '📍';
    font-size: ${ds.typography.fontSize.base};
  }
`;

const EntryType = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${ds.spacing[1]} ${ds.spacing[3]};
  background: ${props => props.color}22;
  color: ${props => props.color};
  border-radius: ${ds.borderRadius.full};
  font-size: ${ds.typography.fontSize.xs};
  font-weight: ${ds.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const EntryMedia = styled.div`
  display: flex;
  gap: ${ds.spacing[2]};
  margin-top: ${ds.spacing[4]};
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const MediaThumbnail = styled.div`
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: ${ds.borderRadius.md};
  background: ${ds.colors.stone[200]};
  overflow: hidden;
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  /* Media count overlay */
  ${props => props.count && `
    &::after {
      content: '+${props.count}';
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${ds.typography.fontSize.sm};
      font-weight: ${ds.typography.fontWeight.semibold};
    }
  `}
`;

// Loading skeleton
const SkeletonCard = styled.div`
  position: relative;
  background: ${ds.colors.stone[100]};
  border-radius: ${ds.borderRadius.xl};
  padding: ${ds.spacing[6]};
  margin-bottom: ${ds.spacing[6]};
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      ${ds.colors.stone[50]} 50%,
      transparent 100%
    );
    animation: ${shimmer} 2s ease-in-out infinite;
  }
`;

const SkeletonLine = styled.div`
  height: ${props => props.height || '20px'};
  width: ${props => props.width || '100%'};
  background: ${ds.colors.stone[200]};
  border-radius: ${ds.borderRadius.sm};
  margin-bottom: ${ds.spacing[3]};
`;

export const EnhancedTimeline = ({ onEntrySelect }) => {
  const { entries, selectedEntry, setSelectedEntry } = useData();
  const [hoveredEntry, setHoveredEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  
  // Simulate loading
  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const handleEntryClick = (entry) => {
    setSelectedEntry(entry);
    if (onEntrySelect) {
      onEntrySelect(entry);
    }
    
    // Add haptic feedback on mobile
    if (window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };
  
  // Auto-scroll to selected entry
  useEffect(() => {
    if (selectedEntry && containerRef.current) {
      const selectedElement = document.getElementById(`timeline-${selectedEntry.uuid}`);
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [selectedEntry]);
  
  // Sort entries by date
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.creationDate) - new Date(a.creationDate)
  );
  
  if (loading) {
    return (
      <TimelineContainer>
        <TimelineLayout>
          <TimelineLine />
          <TimelineEntries>
            {[1, 2, 3].map(i => (
              <SkeletonCard key={i}>
                <SkeletonLine width="30%" height="16px" />
                <SkeletonLine width="70%" height="24px" />
                <SkeletonLine width="50%" height="16px" />
                <SkeletonLine width="100%" height="60px" />
              </SkeletonCard>
            ))}
          </TimelineEntries>
        </TimelineLayout>
      </TimelineContainer>
    );
  }
  
  return (
    <TimelineContainer ref={containerRef} id="timeline-scroll-container">
      <TimelineLayout>
        <TimelineLine />
        <TimelineEntries>
          {sortedEntries.map((entry, index) => (
            <TimelineEntryItem
              key={entry.uuid}
              entry={entry}
              index={index}
              selected={selectedEntry?.uuid === entry.uuid}
              hovered={hoveredEntry === entry.uuid}
              onHover={setHoveredEntry}
              onClick={handleEntryClick}
            />
          ))}
        </TimelineEntries>
      </TimelineLayout>
    </TimelineContainer>
  );
};

// Individual timeline entry component
const TimelineEntryItem = ({ 
  entry, 
  index, 
  selected, 
  hovered,
  onHover, 
  onClick 
}) => {
  const { handlers, isPressed } = useTouchInteractions({
    onTap: () => onClick(entry),
    onLongPress: () => {
      // Could show context menu or quick actions
      if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }
  });
  
  const entryColor = ds.colors[entry.type?.toLowerCase()] || ds.colors.sand[500];
  const locationName = entry.location?.placeName || entry.location?.localityName || 'Unknown Location';
  const mediaCount = entry.photos?.length || 0;
  
  return (
    <TimelineEntry
      id={`timeline-${entry.uuid}`}
      index={index}
      isPressed={isPressed}
      onMouseEnter={() => onHover(entry.uuid)}
      onMouseLeave={() => onHover(null)}
      {...handlers}
    >
      <TimelineDot 
        color={entryColor}
        selected={selected}
      />
      
      <TimelineCard
        selected={selected}
        isHovered={hovered}
      >
        <EntryDate>
          {formatDate(entry.creationDate)}
        </EntryDate>
        
        <EntryTitle>{entry.title}</EntryTitle>
        
        <EntryLocation>
          {locationName}
        </EntryLocation>
        
        <EntryType color={entryColor}>
          {entry.type}
        </EntryType>
        
        {mediaCount > 0 && (
          <EntryMedia>
            {entry.photos.slice(0, 3).map((photo, i) => (
              <MediaThumbnail key={photo.md5}>
                <img 
                  src={`/data/photos/${photo.md5}.${photo.type}`} 
                  alt=""
                  loading="lazy"
                />
              </MediaThumbnail>
            ))}
            {mediaCount > 3 && (
              <MediaThumbnail count={mediaCount - 3} />
            )}
          </EntryMedia>
        )}
      </TimelineCard>
    </TimelineEntry>
  );
};

export default EnhancedTimeline;