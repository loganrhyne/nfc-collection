import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useData } from '../../context/DataContext';
import colorScheme from '../../utils/colorScheme';
import VerticalTimeline from '../timeline/VerticalTimeline';
import ReactMarkdown from 'react-markdown';
import MediaRenderer from '../media/MediaRenderer';
import { processMediaReferences } from '../../utils/mediaProcessing';
import { getPhotoPath } from '../../utils/mediaPath';
// Debug components removed - using standard paths now

const EntryViewContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100vh;
  background-color: #f5f5f5;
  position: relative;
  overflow: hidden;
`;

const ReturnButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: white;
  color: #333;
  border: 1px solid #ddd;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
  align-self: flex-start;
  font-size: 0.9rem;
  
  &:hover {
    background-color: #f8f8f8;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  &:before {
    content: "←";
    font-size: 16px;
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
  padding: 24px 32px 32px;
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
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

// Style for markdown h1 tags
const MarkdownHeading = styled.div`
  h1 {
    font-size: 2.5rem;
    margin-bottom: 16px;
    margin-top: 0;
    color: ${props => props.color || '#333'};
  }
`;

const EntryMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 1rem;
  color: #666;
  justify-content: flex-end;
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

const PhotoPlaceholderContainer = styled.div`
  width: 100%;
  height: 200px;
  background-color: #f0f0f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #666;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  padding: 20px;
  transition: transform 0.3s;
  
  &:hover {
    transform: scale(1.03);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }
`;

// Photo component that handles loading and errors safely
const PhotoPlaceholder = ({ photo }) => {
  const [imageError, setImageError] = useState(false);
  const imagePath = getPhotoPath(photo);
  
  if (imageError) {
    return (
      <PhotoPlaceholderContainer>
        <div>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
          <div>Photo preview not available</div>
        </div>
      </PhotoPlaceholderContainer>
    );
  }
  
  return (
    <PhotoItem 
      src={imagePath}
      alt=""
      onError={() => setImageError(true)}
    />
  );
};

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

/**
 * Timeline sidebar that contains a list of journal entries.
 * Uses a flex column layout with fixed header and scrollable content.
 */
const TimelineSidebar = styled.aside`
  width: 350px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-left: 1px solid #e0e0e0;
  box-shadow: -4px 0 8px rgba(0, 0, 0, 0.05);
  z-index: 1;
  overflow: hidden;
`;

/**
 * Fixed header for the timeline sidebar.
 * Set as flex: 0 0 auto to ensure it doesn't grow or shrink.
 */
const SidebarHeader = styled.h2`
  font-size: 1.2rem;
  margin: 0;
  color: #333;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  background-color: #fff;
  font-weight: 500;
  z-index: 10;
  flex: 0 0 auto;
`;

/**
 * Scrollable container for the timeline content.
 * Takes up all remaining space in the sidebar with flex: 1.
 */
const ScrollableTimelineContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
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
  
  // Process entry content, handling media references and markdown formatting
  const processEntryContent = () => {
    if (!text) return { processedText: '', mediaGroups: [] };
    
    // First replace escaped backslashes
    const cleanedText = text.replace(/\\\\/g, '\\');
    
    // Process media references in the text
    const allMedia = [
      ...(photos || []),
      ...(videos || []),
      ...(pdfAttachments || [])
    ];
    
    // Process media references
    const { text: processedText, mediaGroups } = processMediaReferences(cleanedText, allMedia);
    
    return { processedText, mediaGroups };
  };
  
  return (
    <EntryViewContainer>
      <MainContentArea>
        {noEntrySelected ? (
          <NoEntryMessage>
            No journal entry selected. Please select an entry from the timeline.
          </NoEntryMessage>
        ) : (
          <EntryContainer>
            <EntryHeader>
              <ReturnButton onClick={() => {
                // Clear selected entry before returning to dashboard
                setSelectedEntry(null);
                // Call the return function passed from parent
                if (onReturn) onReturn();
              }}>
                Return to Dashboard
              </ReturnButton>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
              </div>
            </EntryHeader>
            
            <EntryContent>
              {/* Process the content to extract media references and format markdown */}
              {(() => {
                const { processedText, mediaGroups } = processEntryContent();
                
                return (
                  <>
                    <MarkdownHeading color={colorScheme[type] || '#333'}>
                      <ReactMarkdown>{processedText}</ReactMarkdown>
                    </MarkdownHeading>
                    
                    {/* Render media groups that were extracted from the text */}
                    {mediaGroups.map((group, index) => (
                      <MediaRenderer key={index} mediaItems={group} />
                    ))}
                  </>
                );
              })()}
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
            
            {/* Photos section with MediaRenderer */}
            {(photos && photos.length > 0) && (
              <MediaContainer>
                <ContentSectionTitle>Photos</ContentSectionTitle>
                <MediaRenderer mediaItems={photos} />
                
                {/* Debug components removed - using standard paths now */}
              </MediaContainer>
            )}
            
            {/* Videos section with MediaRenderer */}
            {(videos && videos.length > 0) && (
              <MediaContainer>
                <ContentSectionTitle>Videos</ContentSectionTitle>
                <MediaRenderer mediaItems={videos} />
              </MediaContainer>
            )}
            
            {/* PDF documents section with MediaRenderer */}
            {(pdfAttachments && pdfAttachments.length > 0) && (
              <MediaContainer>
                <ContentSectionTitle>Documents</ContentSectionTitle>
                <MediaRenderer mediaItems={pdfAttachments} />
              </MediaContainer>
            )}
          </EntryContainer>
        )}
      </MainContentArea>
      
      <TimelineSidebar id="entry-timeline-sidebar">
        <SidebarHeader>Journal Entries</SidebarHeader>
        <ScrollableTimelineContainer id="timeline-scroll-container">
          <VerticalTimeline onEntrySelect={handleEntrySelect} />
        </ScrollableTimelineContainer>
      </TimelineSidebar>
    </EntryViewContainer>
  );
};

export default EntryView;