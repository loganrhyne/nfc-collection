import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useData } from '../../context/DataContext';
import colorScheme from '../../utils/colorSchemeEnhanced';
import VerticalTimeline from '../timeline/VerticalTimeline';
import JournalContent from './JournalContent';
import NFCRegistrationModal from '../nfc/NFCRegistrationModal';
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

const RegisterButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: white;
  color: #4a90e2;
  border: 1px solid #4a90e2;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
  font-size: 0.9rem;

  &:hover {
    background-color: #f0f7ff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:before {
    content: "📱";
    font-size: 16px;
  }
`;

const HeaderButtons = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  
  /* Touch scrolling improvements */
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  overscroll-behavior: contain; /* Prevent scroll chaining */
  touch-action: pan-y; /* Enable vertical panning */
  
  /* Prevent text selection during scrolling */
  -webkit-touch-callout: none; /* iOS Safari */
  -webkit-user-select: none; /* Safari */
  -khtml-user-select: none; /* Konqueror HTML */
  -moz-user-select: none; /* Old versions of Firefox */
  -ms-user-select: none; /* Internet Explorer/Edge */
  user-select: none; /* Non-prefixed version */
`;

const EntryView = ({ entryId, onReturn }) => {
  const { entries, selectedEntry, setSelectedEntry } = useData();
  const [showRegistration, setShowRegistration] = useState(false);
  
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
  
  // Collect all media items for the entry
  const allMedia = [
    ...(photos || []),
    ...(videos || []),
    ...(pdfAttachments || [])
  ];
  
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
              <HeaderButtons>
                <ReturnButton onClick={() => {
                  // Clear selected entry before returning to dashboard
                  setSelectedEntry(null);
                  // Call the return function passed from parent
                  if (onReturn) onReturn();
                }}>
                  Return to Dashboard
                </ReturnButton>
                <RegisterButton onClick={() => setShowRegistration(true)}>
                  Register Sample
                </RegisterButton>
              </HeaderButtons>
              
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
              <JournalContent 
                text={text}
                mediaItems={allMedia}
                headerColor={colorScheme[type] || '#333'}
              />
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
            
          </EntryContainer>
        )}
      </MainContentArea>
      
      <TimelineSidebar id="entry-timeline-sidebar">
        <SidebarHeader>Journal Entries</SidebarHeader>
        <ScrollableTimelineContainer id="timeline-scroll-container">
          <VerticalTimeline onEntrySelect={handleEntrySelect} />
        </ScrollableTimelineContainer>
      </TimelineSidebar>
      
      {showRegistration && (
        <NFCRegistrationModal
          entry={selectedEntry}
          onClose={() => setShowRegistration(false)}
          onSuccess={() => {
            setShowRegistration(false);
            // Could show a success toast here
          }}
        />
      )}
    </EntryViewContainer>
  );
};

export default EntryView;