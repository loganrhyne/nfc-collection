import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useData } from '../../context/DataContext';
import colorScheme from '../../utils/colorScheme';
import { useTouchScroll } from '../../hooks/useTouchScroll';

/**
 * Container for the timeline component that fits within the scrollable area.
 */
const TimelineContainer = styled.div`
  height: 100%;
  padding: 0 16px 20px 0;
`;

/**
 * Main timeline layout container.
 * Provides relative positioning for the vertical line and entries.
 * Left padding creates space for the timeline vertical line and dots.
 */
const TimelineLayout = styled.div`
  position: relative;
  padding-left: 40px;
`;

/**
 * Vertical line that runs through the timeline.
 * Uses a gradient to fade at the top and bottom.
 */
const VerticalLine = styled.div`
  position: absolute;
  left: 16px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(
    to bottom, 
    transparent, 
    #e0e0e0 20px, 
    #e0e0e0 calc(100% - 20px), 
    transparent
  );
`;

/**
 * Container for all timeline entry cards.
 * Uses flex layout with consistent spacing between entries.
 */
const TimelineEntries = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  
  /* Ensure container doesn't interfere with parent scrolling */
  touch-action: inherit;
`;

/**
 * Timeline entry card component.
 * 
 * Features:
 * - Consistent box model with border-box sizing
 * - Visual states for selected/unselected
 * - Smooth transitions between states
 * - Hover effects
 */
const TimelineCard = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  cursor: pointer;
  margin: 0;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 8px;
  background-color: ${props => props.selected ? '#f0f7ff' : '#fff'};
  padding: 12px 16px;
  
  /* Prevent text selection on the card itself */
  -webkit-touch-callout: none; /* iOS Safari */
  -webkit-user-select: none; /* Safari */
  -khtml-user-select: none; /* Konqueror HTML */
  -moz-user-select: none; /* Old versions of Firefox */
  -ms-user-select: none; /* Internet Explorer/Edge */
  user-select: none; /* Non-prefixed version */
  
  /* Dynamic shadow based on selection state */
  box-shadow: ${props => 
    props.selected 
      ? '0 3px 10px rgba(0, 0, 0, 0.15)' 
      : '0 1px 3px rgba(0, 0, 0, 0.08)'
  };
  
  /* Dynamic border based on selection state */
  border-color: ${props => 
    props.selected ? 'rgba(66, 153, 225, 0.5)' : 'transparent'
  };
  
  /* Smooth transitions */
  transition: 
    background-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out,
    border-color 0.15s ease-in-out;
    
  /* Hover effect */
  &:hover {
    box-shadow: ${props => 
      props.selected 
        ? '0 3px 10px rgba(0, 0, 0, 0.15)' 
        : '0 3px 8px rgba(0, 0, 0, 0.1)'
    };
  }
`;

/**
 * Timeline indicator dot that appears on the vertical line.
 * 
 * Features:
 * - Perfect horizontal alignment with the timeline using transform
 * - Positioned relative to its parent card
 * - Concentric circles effect with box-shadow
 * - Dynamic color based on entry type
 */
const TimelineDot = styled.div`
  position: absolute;
  left: -40px; 
  top: 16px;
  width: 12px;
  height: 12px;
  transform: translateX(10px);
  border-radius: 50%;
  background-color: ${props => props.color || '#ccc'};
  box-shadow: 0 0 0 2px white, 0 0 0 4px #e0e0e0;
  z-index: 2;
`;

/**
 * Timeline entry content components.
 * Each component handles a specific part of the entry display.  
 */
const TimelineDate = styled.div`
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 4px;
  
  /* Allow text selection for date */
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
`;

const TimelineType = styled.div`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${props => props.color || '#999'};
  margin-bottom: 4px;
  
  /* Allow text selection for type */
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
`;

const TimelineTitle = styled.div`
  font-weight: bold;
  margin-bottom: 4px;
  
  /* Allow text selection for important content */
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
`;

const TimelineLocation = styled.div`
  font-size: 0.85rem;
  color: #444;
  
  /* Allow text selection for location info */
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
`;

/**
 * Empty state display when no entries are available.
 */
const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #666;
`;

/**
 * VerticalTimeline component displays a chronological list of journal entries
 * with visual timeline elements and highlights the selected entry.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onEntrySelect - Callback when an entry is selected
 */
const VerticalTimeline = ({ onEntrySelect }) => {
  const { entries, selectedEntry, setSelectedEntry } = useData();
  const timelineContainerRef = useRef(null);
  
  /**
   * Formats a date string for display in the timeline
   * 
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  /**
   * Handles a click on a timeline entry
   * 
   * @param {Object} entry - The journal entry that was clicked
   */
  const handleItemClick = (entry) => {
    setSelectedEntry(entry);
    if (onEntrySelect) {
      onEntrySelect(entry);
    }
  };
  
  // Notify parent component when selected entry changes
  useEffect(() => {
    if (selectedEntry && onEntrySelect) {
      onEntrySelect(selectedEntry);
    }
  }, [selectedEntry, onEntrySelect]);
  
  /**
   * Centers the selected entry in the timeline viewport.
   * 
   * The approach:
   * 1. Find the selected timeline entry element by ID
   * 2. Find the scrollable container (parent ScrollableTimelineContainer)
   * 3. Calculate the relative position of the entry within the container
   * 4. Calculate the ideal scroll position to center the entry
   * 5. Smoothly scroll to that position
   */
  useEffect(() => {
    if (!selectedEntry) return;
    
    // Short delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      try {
        // Get the entry element
        const entryId = `timeline-entry-${selectedEntry.uuid}`;
        const selectedElement = document.getElementById(entryId);
        if (!selectedElement) return;
        
        // Find the scrollable container - use the ID we defined in EntryView.js
        const scrollContainer = document.querySelector('#timeline-scroll-container');
        if (!scrollContainer) return;
        
        // Get the dimensions for centering calculation
        const containerHeight = scrollContainer.clientHeight;
        const entryHeight = selectedElement.offsetHeight;
        
        // Calculate vertical center offset
        const middleOffset = (containerHeight / 2) - (entryHeight / 2);
        
        // Get positions for relative positioning calculation
        const entryRect = selectedElement.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        const relativeTop = entryRect.top - containerRect.top;
        
        // Calculate the ideal scroll position that centers the entry
        const idealScrollTop = scrollContainer.scrollTop + relativeTop - middleOffset;
        
        // Perform the scroll with animation
        scrollContainer.scrollTo({
          top: idealScrollTop,
          behavior: 'smooth'
        });
      } catch (error) {
        // Silently handle errors to prevent UI disruption
        console.error('Timeline scrolling error:', error);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [selectedEntry]);
  
  // Sort entries by date (newest first)
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.creationDate) - new Date(a.creationDate)
  );
  
  // Show empty state if no entries
  if (sortedEntries.length === 0) {
    return <EmptyState>No entries to display</EmptyState>;
  }
  
  /**
   * Renders a single timeline entry card
   * 
   * @param {Object} entry - The journal entry to render
   * @returns {JSX.Element} The rendered card component
   */
  const renderTimelineCard = (entry) => {
    const isSelected = selectedEntry?.uuid === entry.uuid;
    const entryColor = colorScheme[entry.type] || '#999';
    const locationName = entry.location?.placeName || entry.location?.localityName;
    const locationCountry = entry.location?.country ? `, ${entry.location.country}` : '';
    
    // Use touch scroll hook to handle touch vs click
    const touchHandlers = useTouchScroll(() => handleItemClick(entry));
    
    return (
      <TimelineCard
        key={entry.uuid}
        id={`timeline-entry-${entry.uuid}`}
        {...touchHandlers}
        selected={isSelected}
      >
        <TimelineDot color={entryColor} />
        
        <TimelineDate>
          {formatDate(entry.creationDate)}
        </TimelineDate>
        <TimelineType color={entryColor}>
          {entry.type}
        </TimelineType>
        <TimelineTitle>
          {entry.title}
        </TimelineTitle>
        <TimelineLocation>
          {locationName}{locationCountry}
        </TimelineLocation>
      </TimelineCard>
    );
  };
  
  return (
    <TimelineContainer ref={timelineContainerRef} className="timeline-container">
      <TimelineLayout>
        <VerticalLine />
        <TimelineEntries>
          {sortedEntries.map(renderTimelineCard)}
        </TimelineEntries>
      </TimelineLayout>
    </TimelineContainer>
  );
};

export default VerticalTimeline;

