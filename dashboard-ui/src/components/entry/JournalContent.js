import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';
import MediaRenderer from '../media/MediaRenderer';
import MediaMasonryRenderer from '../media/MediaMasonryRenderer';

/**
 * Layout toggle button
 */
const LayoutToggle = styled.button`
  position: absolute;
  top: -30px;
  right: 0;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 5;
  
  &:hover {
    background: #e8e8e8;
    border-color: #ccc;
  }
  
  &:active {
    transform: translateY(1px);
  }
`;

/**
 * Container for media sections with layout toggle
 */
const MediaSectionWrapper = styled.div`
  position: relative;
  margin: 40px 0 32px 0;
  padding-top: 8px;
`;

/**
 * Container for the journal content with proper spacing
 */
const ContentContainer = styled.div`
  line-height: 1.8;
  color: #333;
  font-size: 1.1rem;
  
  p {
    margin-bottom: 24px;
  }
  
  h1 {
    font-size: 2.5rem;
    margin-bottom: 24px;
    margin-top: 32px;
    color: ${props => props.headerColor || '#333'};
    
    &:first-child {
      margin-top: 0;
    }
  }
  
  h2 {
    font-size: 2rem;
    margin-bottom: 20px;
    margin-top: 28px;
    color: #444;
  }
  
  h3 {
    font-size: 1.6rem;
    margin-bottom: 16px;
    margin-top: 24px;
    color: #555;
  }
  
  em {
    font-style: italic;
    color: #666;
  }
  
  strong {
    font-weight: 600;
  }
  
  blockquote {
    border-left: 4px solid #e0e0e0;
    padding-left: 20px;
    margin-left: 0;
    color: #666;
    font-style: italic;
  }
`;

/**
 * Component that processes and renders journal content with inline media
 * 
 * @component
 */
const JournalContent = ({
  text,
  mediaItems = [],
  headerColor = '#333'
}) => {
  // State for layout preference
  const [useMasonryLayout, setUseMasonryLayout] = useState(true);
  // Create a map of media by identifier for quick lookup
  const mediaById = {};
  mediaItems.forEach(media => {
    if (media.identifier) {
      mediaById[media.identifier] = media;
    } else if (media.md5) {
      // Fall back to md5 as identifier
      mediaById[media.md5] = media;
    }
  });

  /**
   * Process the text to split it into sections with embedded media
   * This maintains the inline position of media references
   */
  const processContentSections = () => {
    if (!text) return [];
    
    // First, clean up escaped backslashes
    const cleanedText = text.replace(/\\\\/g, '\\');
    
    // Regex to match Day One media references
    const mediaRefRegex = /!\[\]\(dayone-moment:(?:\/video\/|\/\/)([A-F0-9]+)\)/gi;
    
    // Split the text by media references while keeping the separators
    const parts = cleanedText.split(mediaRefRegex);
    const sections = [];
    
    // Process each part
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Even indexes are text content
        const textContent = parts[i].trim();
        if (textContent) {
          sections.push({
            type: 'text',
            content: textContent
          });
        }
      } else {
        // Odd indexes are media identifiers
        const mediaId = parts[i];
        const media = mediaById[mediaId];
        
        if (media) {
          // Check if the next section should be grouped with this media
          // (e.g., multiple media items in a row)
          const mediaGroup = [media];
          
          // Look ahead to see if there are more media items immediately following
          let j = i + 1;
          while (j < parts.length - 1) {
            const nextText = parts[j].trim();
            const nextMediaId = parts[j + 1];
            
            // If the next text section is empty or just whitespace/newlines,
            // and there's another media item, group them together
            if ((!nextText || nextText.match(/^[\n\s]*$/)) && nextMediaId && mediaById[nextMediaId]) {
              mediaGroup.push(mediaById[nextMediaId]);
              i = j + 1; // Skip ahead
              j += 2;
            } else {
              break;
            }
          }
          
          sections.push({
            type: 'media',
            items: mediaGroup
          });
        }
      }
    }
    
    return sections;
  };

  const contentSections = processContentSections();
  
  return (
    <ContentContainer headerColor={headerColor}>
      {contentSections.map((section, index) => {
        if (section.type === 'text') {
          return (
            <ReactMarkdown key={`text-${index}`}>
              {section.content}
            </ReactMarkdown>
          );
        } else if (section.type === 'media') {
          const MediaComponent = useMasonryLayout ? MediaMasonryRenderer : MediaRenderer;
          return (
            <MediaSectionWrapper key={`media-${index}`}>
              <LayoutToggle
                onClick={() => setUseMasonryLayout(!useMasonryLayout)}
                title={useMasonryLayout ? 'Switch to grid layout' : 'Switch to masonry layout'}
              >
                {useMasonryLayout ? '⊞ Grid' : '▦ Masonry'}
              </LayoutToggle>
              <MediaComponent 
                mediaItems={section.items} 
              />
            </MediaSectionWrapper>
          );
        }
        return null;
      })}
    </ContentContainer>
  );
};

JournalContent.propTypes = {
  /** The raw markdown text from the journal entry */
  text: PropTypes.string.isRequired,
  
  /** Array of all media items (photos, videos, pdfs) for this entry */
  mediaItems: PropTypes.arrayOf(PropTypes.shape({
    identifier: PropTypes.string,
    md5: PropTypes.string,
    type: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number
  })),
  
  /** Color for the main header (h1) elements */
  headerColor: PropTypes.string
};

export default JournalContent;