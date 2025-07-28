import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useData } from '../../context/DataContext';
import colorScheme from '../../utils/colorScheme';

const TimelineContainer = styled.div`
  height: calc(100% - 16px);
  overflow-y: auto;
  padding: 20px 16px 20px 0;
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

const VerticalTimeline = ({ onEntrySelect }) => {
  const { entries, selectedEntry, setSelectedEntry } = useData();
  
  // Reference to the timeline container for scrolling
  const timelineContainerRef = useRef(null);
  
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
  
  // Scroll to position selected entry in the middle of the viewport
  useEffect(() => {
    // Only proceed if we have a selected entry
    if (!selectedEntry) return;
    
    // Use short timeout to ensure the DOM is updated
    const timeoutId = setTimeout(() => {
      try {
        // Find the selected element using its ID
        const selectedElement = document.getElementById(`timeline-entry-${selectedEntry.uuid}`);
        if (!selectedElement) {
          console.log(`Could not find element for entry ${selectedEntry.uuid}`);
          return;
        }
        
        // Get the container and its dimensions
        const container = timelineContainerRef.current;
        if (!container) return;
        
        // Get dimensions needed for calculation
        const containerHeight = container.clientHeight;
        const entryHeight = selectedElement.offsetHeight;
        
        // Get the header element (SectionTitle in EntryView.js)
        let headerElement = document.querySelector('#entry-timeline-container > h2');
        
        // If we can't find it directly, try a more general selector for the sticky header
        if (!headerElement) {
          const containerParent = document.querySelector('.timeline-container')?.parentNode;
          if (containerParent) {
            headerElement = containerParent.querySelector('h2');
          }
        }
        
        const headerHeight = headerElement ? headerElement.offsetHeight : 0;
        console.log('Header element found:', !!headerElement);
        
        // Calculate the offset needed to position the entry in the middle
        // Formula: Middle of container - Half of entry height - header height - header padding
        const headerPadding = 16; // From the padding in EntryView.js
        const middleOffset = (containerHeight / 2) - (entryHeight / 2) - headerHeight - headerPadding;
        
        console.log(`Container height: ${containerHeight}, Entry height: ${entryHeight}, Header height: ${headerHeight}, Header padding: ${headerPadding}, Offset: ${middleOffset}`);
        
        // First scroll the entry to the top of the view
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
        
        // After the initial scroll, adjust to center the entry
        setTimeout(() => {
          if (container) {
            // Scroll up by middle offset to center the entry
            container.scrollBy({
              top: -middleOffset,
              behavior: 'smooth'
            });
            
            console.log(`Centering entry with offset: ${-middleOffset}px`);
          }
        }, 300);
        
      } catch (error) {
        console.error('Error during timeline scrolling:', error);
      }
    }, 100);
    
    // Clean up timeout if component unmounts
    return () => clearTimeout(timeoutId);
  }, [selectedEntry]);
  
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
    <TimelineContainer ref={timelineContainerRef} className="timeline-container">
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

