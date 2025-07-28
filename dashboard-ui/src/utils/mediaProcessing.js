/**
 * Utility functions for processing media content in journal entries.
 */

/**
 * Process entry text to extract and replace media references with HTML elements.
 * 
 * @param {string} text - The raw markdown text from the journal entry
 * @param {Array} mediaItems - Array of media objects (photos, videos, pdfs)
 * @returns {Object} Object containing processed text and extracted media references
 */
export const processMediaReferences = (text, mediaItems = []) => {
  if (!text) return { text: '', mediaGroups: [] };

  console.log(`🔎 Processing media references in text (${text.length} chars)`);
  console.log(`📊 Available media items: ${mediaItems.length}`);
  
  // Create a map of media by identifier for quick lookup
  const mediaById = {};
  mediaItems.forEach(media => {
    if (media.identifier) {
      mediaById[media.identifier] = media;
      console.log(`📝 Mapped media by identifier: ${media.identifier} (${media.type})`);
    } else if (media.md5) {
      // Fall back to md5 as identifier if explicit identifier isn't available
      mediaById[media.md5] = media;
      console.log(`📝 Mapped media by md5: ${media.md5} (${media.type})`);
    }
  });

  // This regex matches Day One media references: ![](dayone-moment:/video/ABC123) or ![](dayone-moment://ABC123)
  const mediaRefRegex = /!\[\]\(dayone-moment:(?:\/video\/|\/\/)([A-F0-9]+)\)/gi;
  
  // Find all media references in the text
  let matches = text.match(mediaRefRegex);
  if (matches) {
    console.log(`👀 Found ${matches.length} media references in text`);
    matches.forEach(match => {
      console.log(`  🖼️ Media reference found: ${match}`);
    });
  } else {
    console.log(`📝 No media references found in text`);
  }
  
  // Track media groups for rendering
  const mediaGroups = [];
  let currentGroup = [];
  
  // Split text into sections with and without media
  const sections = text.split(mediaRefRegex);
  const updatedSections = [];

  // Process each section
  sections.forEach((section, index) => {
    // Even indexes are text content, odd indexes are media references
    if (index % 2 === 0) {
      // If we have accumulated media, close the group
      if (currentGroup.length > 0) {
        mediaGroups.push([...currentGroup]);
        currentGroup = [];
      }
      
      // Add text content to the updated sections
      updatedSections.push(section);
    } else {
      // This is a media identifier, look it up
      const mediaId = section;
      const media = mediaById[mediaId];
      
      if (media) {
        console.log(`✅ Found media for reference ${mediaId}: ${media.type}`);
        // Add to the current media group
        currentGroup.push(media);
      } else {
        console.warn(`⚠️ Could not find media for reference ${mediaId}`);
      }
    }
  });
  
  // Add any remaining media to the groups
  if (currentGroup.length > 0) {
    mediaGroups.push([...currentGroup]);
  }
  
  // Join the text sections back together
  const processedText = updatedSections.join('');
  
  console.log(`📌 Processing complete: ${mediaGroups.length} media groups extracted`);
  mediaGroups.forEach((group, i) => {
    console.log(`  📂 Group ${i+1}: ${group.length} items (${group.map(m => m.type).join(', ')})`);
  });
  
  return {
    text: processedText,
    mediaGroups
  };
};

/**
 * Check if a string contains media references in the Day One format
 * 
 * @param {string} text - Text to check for media references
 * @returns {boolean} True if media references are found
 */
export const hasMediaReferences = (text) => {
  if (!text) return false;
  const mediaRefRegex = /!\[\]\(dayone-moment:(?:\/video\/|\/\/)([A-F0-9]+)\)/gi;
  return mediaRefRegex.test(text);
};

export default {
  processMediaReferences,
  hasMediaReferences
};