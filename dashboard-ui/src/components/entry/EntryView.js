import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useData } from '../../context/DataContext';
import colorScheme from '../../utils/colorScheme';
import VerticalTimeline from '../timeline/VerticalTimeline';

const EntryViewContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100vh;
  background-color: #f5f5f5;
  position: relative;
  overflow: hidden;
`;

const ReturnButton = styled.button`
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: white;
  color: #333;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  
  &:hover {
    background-color: #f8f8f8;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  &:before {
    content: "←";
    font-size: 18px;
  }
`;

const MainContentArea = styled.div`
  flex: 1;
  height: 100%;
  overflow: hidden;
  position: relative;
  padding: 16px;
`;

const EntryContainer = styled.div`
  padding: 60px 32px 32px;
  background-color: #fff;
  height: 100%;
  width: 100%;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
`;

const EntryHeader = styled.div`
  margin-bottom: 32px;
  border-bottom: 1px solid #eee;
  padding-bottom: 24px;
`;

const EntryTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 16px;
  color: ${props => props.color || '#333'};
`;

const EntryMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 1rem;
  color: #666;
`;

const EntryMetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const EntryTag = styled.span`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 16px;
  background-color: ${props => props.color || '#eee'};
  color: ${props => props.textColor || '#333'};
  font-size: 0.9rem;
  margin-right: 12px;
  font-weight: 500;
`;

const EntryContent = styled.div`
  line-height: 1.8;
  color: #333;
  font-size: 1.1rem;
  
  p {
    margin-bottom: 24px;
  }
`;

const MediaContainer = styled.div`
  margin: 32px 0;
`;

const PhotosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-top: 24px;
`;

const PhotoItem = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.3s;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  
  &:hover {
    transform: scale(1.03);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }
`;

const ContentSectionTitle = styled.h2`
  font-size: 1.4rem;
  color: #444;
  margin: 32px 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
`;

const LocationSection = styled.div`
  margin: 32px 0;
`;

const LocationDetails = styled.div`
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
  border: 1px solid #eee;
`;

const NoEntryMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.2rem;
  color: #666;
  text-align: center;
  padding: 32px;
`;

const RightColumn = styled.div`
  width: 350px;
  height: 100%;
  overflow-y: auto;
  padding: 0;
  background-color: #fff;
  border-left: 1px solid #e0e0e0;
  box-shadow: -4px 0 8px rgba(0, 0, 0, 0.05);
  z-index: 1;
`;

const SectionTitle = styled.h2`
  font-size: 1.2rem;
  margin: 0;
  color: #333;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  background-color: #fff;
  font-weight: 500;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const EntryView = ({ entryId, onReturn }) => {
  const { entries, selectedEntry, setSelectedEntry } = useData();
  
  // Find entry by ID if provided in URL
  useEffect(() => {
    if (entryId && entries.length > 0) {
      const entry = entries.find(e => e.uuid === entryId);
      if (entry) {
        setSelectedEntry(entry);
      }
    }
  }, [entryId, entries, setSelectedEntry]);
  
  // Handle timeline entry selection - allows navigation between entries without going back to dashboard
  const handleEntrySelect = (entry) => {
    setSelectedEntry(entry);
    
    // Update URL to match selected entry without triggering a page reload
    if (entry && entry.uuid && entry.uuid !== entryId) {
      window.history.replaceState(null, '', `/entry/${entry.uuid}`);
    }
  };
  
  // Check if no entry is selected
  const noEntrySelected = !selectedEntry;
  
  // Extract entry data if an entry is selected
  const {
    title,
    type,
    region,
    text,
    creationDate,
    location,
    photos,
    videos,
    pdfAttachments
  } = selectedEntry || {};
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Function to render markdown content (simplified)
  const renderContent = () => {
    // For now just render the text as-is with basic paragraph breaks
    return text?.split('\\n').map((paragraph, index) => (
      paragraph ? <p key={index}>{paragraph.replace(/\\./g, '')}</p> : <br key={index} />
    )) || [];
  };
  
  return (
    <EntryViewContainer>
      <ReturnButton onClick={() => {
        // Clear selected entry before returning to dashboard
        setSelectedEntry(null);
        // Call the return function passed from parent
        if (onReturn) onReturn();
      }}>
        Return to Dashboard
      </ReturnButton>
      
      <MainContentArea>
        {noEntrySelected ? (
          <NoEntryMessage>
            No journal entry selected. Please select an entry from the timeline.
          </NoEntryMessage>
        ) : (
          <EntryContainer>
            <EntryHeader>
              <EntryTitle color={colorScheme[type] || '#333'}>
                {title}
              </EntryTitle>
              
              <EntryMeta>
                <EntryMetaItem>
                  <span role="img" aria-label="Date">📅</span> {formatDate(creationDate)}
                </EntryMetaItem>
                
                {location && (
                  <EntryMetaItem>
                    <span role="img" aria-label="Location">📍</span> 
                    {location?.placeName || location?.localityName}
                    {location?.country ? `, ${location.country}` : ''}
                  </EntryMetaItem>
                )}
              </EntryMeta>
              
              <div>
                {type && (
                  <EntryTag color={colorScheme[type] || '#eee'} textColor="#fff">
                    {type}
                  </EntryTag>
                )}
                {region && (
                  <EntryTag color="#eee">
                    {region}
                  </EntryTag>
                )}
              </div>
            </EntryHeader>
            
            <EntryContent>
              {renderContent()}
            </EntryContent>
            
            {location && location.latitude && location.longitude && (
              <LocationSection>
                <ContentSectionTitle>Location Details</ContentSectionTitle>
                <LocationDetails>
                  <p><strong>Place:</strong> {location.placeName || 'Unknown'}</p>
                  <p><strong>Locality:</strong> {location.localityName || 'Unknown'}</p>
                  <p><strong>Country:</strong> {location.country || 'Unknown'}</p>
                  <p><strong>Coordinates:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
                </LocationDetails>
              </LocationSection>
            )}
            
            {(photos && photos.length > 0) && (
              <MediaContainer>
                <ContentSectionTitle>Photos</ContentSectionTitle>
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
                <ContentSectionTitle>Videos</ContentSectionTitle>
                <div>
                  {/* Video rendering would go here */}
                  {videos.length} video(s) available
                </div>
              </MediaContainer>
            )}
            
            {(pdfAttachments && pdfAttachments.length > 0) && (
              <MediaContainer>
                <ContentSectionTitle>Documents</ContentSectionTitle>
                <div>
                  {/* PDF rendering would go here */}
                  {pdfAttachments.length} document(s) available
                </div>
              </MediaContainer>
            )}
          </EntryContainer>
        )}
      </MainContentArea>
      
      <RightColumn>
        <SectionTitle>Journal Entries</SectionTitle>
        <div style={{ padding: '16px' }}>
          <VerticalTimeline onEntrySelect={handleEntrySelect} />
        </div>
      </RightColumn>
    </EntryViewContainer>
  );
};

export default EntryView;