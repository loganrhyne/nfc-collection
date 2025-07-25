import React from 'react';
import styled from 'styled-components';
import { useData } from '../../context/DataContext';
import colorScheme from '../../utils/colorScheme';

const TimelineContainer = styled.div`
  height: calc(100vh - 70px);
  overflow-y: auto;
  padding-right: 10px;
`;

const TimelineItem = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border-left: 4px solid ${props => props.color || '#999'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  &.selected {
    background-color: #f0f7ff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
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

const VerticalTimeline = () => {
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
  };
  
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
      {sortedEntries.map(entry => (
        <TimelineItem
          key={entry.uuid}
          color={colorScheme[entry.type] || '#999'}
          onClick={() => handleItemClick(entry)}
          className={selectedEntry?.uuid === entry.uuid ? 'selected' : ''}
        >
          <TimelineDate>
            {formatDate(entry.creationDate)}
          </TimelineDate>
          <TimelineType color={colorScheme[entry.type] || '#999'}>
            {entry.type}
          </TimelineType>
          <TimelineTitle>{entry.title}</TimelineTitle>
          <TimelineLocation>
            {entry.location?.placeName || entry.location?.localityName}, {entry.location?.country}
          </TimelineLocation>
        </TimelineItem>
      ))}
    </TimelineContainer>
  );
};

export default VerticalTimeline;