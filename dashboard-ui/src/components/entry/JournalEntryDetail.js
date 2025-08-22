import React from 'react';
import styled from 'styled-components';
import { useData } from '../../context/DataContext';
import colorScheme from '../../utils/colorSchemeEnhanced';

const EntryContainer = styled.div`
  padding: 24px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  
  &:hover {
    color: #333;
  }
`;

const EntryHeader = styled.div`
  margin-bottom: 24px;
  border-bottom: 1px solid #eee;
  padding-bottom: 16px;
`;

const EntryTitle = styled.h1`
  font-size: 2rem;
  margin-bottom: 8px;
  color: ${props => props.color || '#333'};
`;

const EntryMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 0.9rem;
  color: #666;
`;

const EntryMetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const EntryTag = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 16px;
  background-color: ${props => props.color || '#eee'};
  color: ${props => props.textColor || '#333'};
  font-size: 0.8rem;
  margin-right: 8px;
  font-weight: 500;
`;

const EntryContent = styled.div`
  line-height: 1.6;
  color: #333;
  
  p {
    margin-bottom: 16px;
  }
`;

const MediaContainer = styled.div`
  margin: 24px 0;
`;

const PhotosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-top: 16px;
`;

const PhotoItem = styled.img`
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const NoSelectionMessage = styled.div`
  text-align: center;
  padding: 48px 16px;
  color: #666;
  font-size: 1.1rem;
`;

const HighlightButton = styled.button`
  padding: 8px 16px;
  background-color: ${props => props.color || '#4a90e2'};
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 16px;
  
  &:hover {
    opacity: 0.9;
  }
`;

const JournalEntryDetail = () => {
  const { selectedEntry, setSelectedEntry, highlightTypeOnGrid } = useData();
  
  if (!selectedEntry) {
    return (
      <NoSelectionMessage>
        Select an entry from the map or timeline to view details
      </NoSelectionMessage>
    );
  }
  
  // Extract entry data
  const {
    title,
    type,
    region,
    text,
    creationDate,
    location,
    photos,
    videos,
    pdfAttachments,
    uuid
  } = selectedEntry;
  
  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Function to handle close button click
  const handleClose = () => {
    setSelectedEntry(null);
  };
  
  // Function to handle highlight button click
  const handleHighlight = () => {
    highlightTypeOnGrid(type);
  };
  
  // Function to render markdown content (simplified)
  const renderContent = () => {
    // For now just render the text as-is with basic paragraph breaks
    return text?.split('\\n').map((paragraph, index) => (
      paragraph ? <p key={index}>{paragraph.replace(/\\./g, '')}</p> : <br key={index} />
    ));
  };
  
  return (
    <EntryContainer>
      <CloseButton onClick={handleClose}>&times;</CloseButton>
      
      <EntryHeader>
        <EntryTitle color={colorScheme[type] || '#333'}>
          {title}
        </EntryTitle>
        
        <EntryMeta>
          <EntryMetaItem>
            <span role="img" aria-label="Date">📅</span> {formatDate(creationDate)}
          </EntryMetaItem>
          
          <EntryMetaItem>
            <span role="img" aria-label="Location">📍</span> {location?.placeName || location?.localityName}, {location?.country}
          </EntryMetaItem>
        </EntryMeta>
        
        <div>
          <EntryTag color={colorScheme[type] || '#eee'} textColor="#fff">
            {type}
          </EntryTag>
          <EntryTag color="#eee">
            {region}
          </EntryTag>
        </div>
        
        <HighlightButton color={colorScheme[type]} onClick={handleHighlight}>
          Highlight {type} Samples
        </HighlightButton>
      </EntryHeader>
      
      <EntryContent>
        {renderContent()}
      </EntryContent>
      
      {(photos && photos.length > 0) && (
        <MediaContainer>
          <h3>Photos</h3>
          <PhotosGrid>
            {photos.map((photo) => (
              <PhotoItem 
                key={photo.identifier} 
                src={`/collection_data/photos/${photo.md5}.${photo.type}`}
                alt=""
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/150?text=Photo+Not+Found';
                }}
              />
            ))}
          </PhotosGrid>
        </MediaContainer>
      )}
      
      {(videos && videos.length > 0) && (
        <MediaContainer>
          <h3>Videos</h3>
          <div>
            {/* Video rendering would go here */}
            {videos.length} video(s) available
          </div>
        </MediaContainer>
      )}
      
      {(pdfAttachments && pdfAttachments.length > 0) && (
        <MediaContainer>
          <h3>Documents</h3>
          <div>
            {/* PDF rendering would go here */}
            {pdfAttachments.length} document(s) available
          </div>
        </MediaContainer>
      )}
    </EntryContainer>
  );
};

export default JournalEntryDetail;