import React, { useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { useData } from '../../context/DataContext';
import colorScheme from '../../utils/colorScheme';

const TimelineContainer = styled.div`
  height: calc(100% - 16px) !important;
  overflow-y: auto !important;
  padding: 20px 16px 20px 0;
  display: flex;
  flex-direction: column;
`;

// Main timeline layout
const TimelineLayout = styled.div`
  position: relative;
  padding-left: 40px; /* Space for timeline and dot */
`;

// Vertical line that runs through the timeline
const VerticalLine = styled.div`
  position: absolute;
  left: 16px; /* Centered line position */
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

// Timeline entries wrapper
const TimelineEntries = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

// Card container with consistent box model
const TimelineCard = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  cursor: pointer;
  margin: 0;
  /* 
   * Using box-sizing: border-box and fixed border width 
   * to prevent layout shifts when border appears
   */
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 8px;
  background-color: #fff;
  padding: 12px 16px;
  
  /* Box shadow always present but varies in intensity */
  box-shadow: ${props => 
    props.selected 
      ? '0 3px 10px rgba(0, 0, 0, 0.15)' 
      : '0 1px 3px rgba(0, 0, 0, 0.08)'
  };
  
  /* Visual state changes */
  background-color: ${props => 
    props.selected ? '#f0f7ff' : '#fff'
  };
  
  border-color: ${props => 
    props.selected ? 'rgba(66, 153, 225, 0.5)' : 'transparent'
  };
  
  transition: 
    background-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out,
    border-color 0.15s ease-in-out;
    
  &:hover {
    box-shadow: ${props => 
      props.selected 
        ? '0 3px 10px rgba(0, 0, 0, 0.15)' 
        : '0 3px 8px rgba(0, 0, 0, 0.1)'
    };
  }
`;

// Timeline indicator dot with perfect centering
const TimelineDot = styled.div`
  position: absolute;
  /* Dot is positioned relative to the card */
  left: -40px; 
  top: 16px; /* Aligns with first line of text */
  
  /* Fixed size for consistent alignment */
  width: 12px;
  height: 12px;
  
  /* Center the dot perfectly on the timeline */
  transform: translateX(10px);
  
  /* Visual styling */
  border-radius: 50%;
  background-color: ${props => props.color || '#ccc'};
  
  /* Creates concentric circles effect */
  box-shadow: 0 0 0 2px white, 0 0 0 4px #e0e0e0;
  z-index: 2;
`;

// Content elements
const TimelineDate = styled.div`
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 4px;
`;

const TimelineType = styled.div`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${props => props.color || '#999'};
  margin-bottom: 4px;
`;

const TimelineTitle = styled.div`
  font-weight: bold;
  margin-bottom: 4px;
`;

const TimelineLocation = styled.div`
  font-size: 0.85rem;
  color: #444;
`;


const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #666;
`;

const VerticalTimeline = ({ onEntrySelect, initialScrollOffset = 20 }) => {
  const { entries, selectedEntry, setSelectedEntry } = useData();
  
  // Reference to the timeline container for scrolling
  const timelineContainerRef = useRef(null);
  
  // We don't need this effect since we're setting the ref directly on the container
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Handle timeline item click
  const handleItemClick = (entry) => {
    setSelectedEntry(entry);
    if (onEntrySelect) {
      onEntrySelect(entry);
    }
  };
  
  // When selectedEntry changes, notify parent if needed
  useEffect(() => {
    if (selectedEntry && onEntrySelect) {
      onEntrySelect(selectedEntry);
    }
  }, [selectedEntry, onEntrySelect]);
  
  // Define a custom hook for scrolling selected entries
  const scrollSelectedEntryIntoView = useCallback(() => {
    if (!selectedEntry) {
      console.log('No selected entry to scroll to');
      return;
    }
    
    if (!timelineContainerRef.current) {
      console.log('Timeline container ref is not available');
      return;
    }
    
    try {
      // First find the target element
      const selectedElement = document.getElementById(`timeline-entry-${selectedEntry.uuid}`);
      if (!selectedElement) {
        console.warn(`Could not find element for entry ${selectedEntry.uuid} - DOM element may not exist yet`);
        return;
      }
      
      // Get all timeline entries to find the previous entry
      const allEntries = document.querySelectorAll('[id^="timeline-entry-"]');
      let previousEntryHeight = 0;
      let currentIndex = -1;
      
      // Find the index of the selected entry
      for (let i = 0; i < allEntries.length; i++) {
        if (allEntries[i].id === `timeline-entry-${selectedEntry.uuid}`) {
          currentIndex = i;
          break;
        }
      }
      
      // If we found the current entry and there's a previous entry,
      // get its height to use for offsetting
      if (currentIndex > 0) {
        previousEntryHeight = allEntries[currentIndex - 1].offsetHeight + 24; // entry height + gap
        console.log(`Found previous entry with height: ${previousEntryHeight}px`);
      } else {
        // No previous entry, use a default offset
        previousEntryHeight = 100; // reasonable default
        console.log('No previous entry, using default offset');
      }
      
      // Account for the sticky header - get its height
      const stickyHeader = document.querySelector('.timeline-sticky-header');
      let headerHeight = 0;
      if (stickyHeader) {
        headerHeight = stickyHeader.offsetHeight;
        console.log(`Found sticky header with height: ${headerHeight}px`);
      }
      
      // Calculate scroll position to show previous entry (if it exists)
      const container = timelineContainerRef.current;
      const newScrollTop = selectedElement.offsetTop - headerHeight - previousEntryHeight;
      
      console.log('DEBUG: Container:', {
        scrollable: getComputedStyle(container).overflowY,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
        currentScrollTop: container.scrollTop,
        newScrollTop: newScrollTop
      });
      
      // Try multiple approaches to ensure scrolling works
      
      // 1. Direct property setting - most immediate
      console.log('Method 1: Setting scrollTop directly');
      container.scrollTop = newScrollTop;
      
      // 2. Use scrollTo with auto behavior
      console.log('Method 2: Using scrollTo with auto behavior');
      container.scrollTo({
        top: newScrollTop,
        behavior: 'auto'
      });
      
      // 3. Try again with smooth animation after a slight delay
      setTimeout(() => {
        console.log('Method 3: Using scrollTo with smooth behavior');
        container.scrollTo({
          top: newScrollTop,
          behavior: 'smooth'
        });
        
        // Log the current scroll position
        console.log(`Current scrollTop after attempt: ${container.scrollTop}`);
        
        // If scrolling didn't work, try more aggressive approach
        if (Math.abs(container.scrollTop - newScrollTop) > 50) {
          console.log('Scrolling did not succeed, trying forceful approach');
          
          // Force the container to be scrollable
          container.style.overflowY = 'auto';
          container.style.height = 'calc(100% - 16px)';
          
          // Try again with direct assignment
          container.scrollTop = newScrollTop;
        }
      }, 100);
      
      console.log(`Attempting to scroll to position ${newScrollTop}`);
    } catch (error) {
      console.error('Error scrolling to selected entry:', error);
    }
  }, [selectedEntry]);

  
  // Trigger the scroll when selected entry changes
  useEffect(() => {
    // Short timeout to ensure DOM is ready
    const timeoutId = setTimeout(scrollSelectedEntryIntoView, 200);
    
    // Try again after a longer delay as a fallback
    const secondAttemptId = setTimeout(scrollSelectedEntryIntoView, 500);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(secondAttemptId);
    };
  }, [selectedEntry, scrollSelectedEntryIntoView]);
  
  // Sort entries by date (newest first)
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.creationDate) - new Date(a.creationDate)
  );
  
  if (sortedEntries.length === 0) {
    return (
      <EmptyState>No entries to display</EmptyState>
    );
  }
  
  return (
    <TimelineContainer 
      ref={timelineContainerRef} 
      className="timeline-container"
      style={{ overflowY: 'auto', height: 'calc(100% - 16px)' }} // Force scrollability
    >
      <TimelineLayout>
        {/* Static timeline that never changes */}
        <VerticalLine />
        
        {/* Entries positioned relative to the timeline */}
        <TimelineEntries>
          {sortedEntries.map(entry => {
            const isSelected = selectedEntry?.uuid === entry.uuid;
            return (
              <TimelineCard
                key={entry.uuid}
                id={`timeline-entry-${entry.uuid}`}
                onClick={() => handleItemClick(entry)}
                selected={isSelected}
              >
                {/* Timeline connector dot */}
                <TimelineDot
                  color={colorScheme[entry.type] || '#999'}
                />
                
                {/* Entry content */}
                <TimelineDate>
                  {formatDate(entry.creationDate)}
                </TimelineDate>
                <TimelineType color={colorScheme[entry.type] || '#999'}>
                  {entry.type}
                </TimelineType>
                <TimelineTitle>
                  {entry.title}
                </TimelineTitle>
                <TimelineLocation>
                  {entry.location?.placeName || entry.location?.localityName}
                  {entry.location?.country ? `, ${entry.location.country}` : ''}
                </TimelineLocation>
              </TimelineCard>
            );
          })}
        </TimelineEntries>
      </TimelineLayout>
    </TimelineContainer>
  );
};

export default VerticalTimeline;