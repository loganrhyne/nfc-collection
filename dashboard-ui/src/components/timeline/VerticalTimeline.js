import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useData } from '../../context/DataContext';
import colorScheme from '../../utils/colorScheme';

const TimelineContainer = styled.div`
  height: calc(100% - 16px);
  overflow-y: auto;
  position: relative;
  padding: 20px 10px 20px 0;
`;

// Vertical line that runs through the timeline
const VerticalLine = styled.div`
  position: absolute;
  left: 30px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, transparent, #e0e0e0 20px, #e0e0e0 calc(100% - 20px), transparent);
  z-index: 1;
`;

const TimelineList = styled.div`
  position: relative;
  padding-left: 60px; // Increased space for the vertical line and dot
`;

const TimelineItem = styled.div`
  position: relative;
  margin-bottom: 24px;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateX(5px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  ${props => props.selected && `
    background-color: #f0f7ff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(66, 153, 225, 0.5);
    transform: translateX(5px);
  `}
`;

// Colored circle indicator
const TimelineDot = styled.div`
  position: absolute;
  left: -39px; // Adjusted to center with vertical line
  top: 15px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: ${props => props.color || '#ccc'};
  border: 2px solid white;
  box-shadow: 0 0 0 2px #e0e0e0;
  z-index: 2;
  transition: all 0.2s;
  transform: translateX(-${props => props.selected ? '0px' : '0px'});
`;

const TimelineDate = styled.div`
  font-size: 0.8rem;
  color: #666;
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

const TimelineType = styled.div`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${props => props.color || '#999'};
  margin-bottom: 4px;
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
    <TimelineContainer>
      <VerticalLine />
      <TimelineList>
        {sortedEntries.map(entry => (
          <TimelineItem
            key={entry.uuid}
            onClick={() => handleItemClick(entry)}
            selected={selectedEntry?.uuid === entry.uuid}
          >
            <TimelineDot 
            color={colorScheme[entry.type] || '#999'}
            selected={selectedEntry?.uuid === entry.uuid}
          />
            <TimelineDate>
              {formatDate(entry.creationDate)}
            </TimelineDate>
            <TimelineType color={colorScheme[entry.type] || '#999'}>
              {entry.type}
            </TimelineType>
            <TimelineTitle>{entry.title}</TimelineTitle>
            <TimelineLocation>
              {entry.location?.placeName || entry.location?.localityName}
              {entry.location?.country ? `, ${entry.location.country}` : ''}
            </TimelineLocation>
          </TimelineItem>
        ))}
      </TimelineList>
    </TimelineContainer>
  );
};

export default VerticalTimeline;