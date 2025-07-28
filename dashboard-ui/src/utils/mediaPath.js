/**
 * Utility for generating paths to media files
 */

/**
 * Calculate the appropriate file path for a media item
 * 
 * @param {Object} media - Media item with type and identifier
 * @returns {string} - Path to the media file
 */
export const getMediaPath = (media) => {
  if (!media) {
    console.warn('📡 getMediaPath called with null media');
    return '';
  }
  
  const { md5, type } = media;
  if (!md5 || !type) {
    console.warn('📡 getMediaPath: Missing md5 or type', { media });
    return '';
  }
  
  // In production, media files are served from the data directory
  const path = `/collection_data/${type}s/${md5}.${type}`;
  console.log(`💾 Media path generated: ${path}`);
  return path;
};

/**
 * Calculate path to a photo file
 * 
 * @param {Object} photo - Photo object with md5 and type
 * @returns {string} - Path to the photo file
 */
export const getPhotoPath = (photo) => {
  if (!photo) {
    console.warn('📡 getPhotoPath called with null photo');
    return '';
  }
  
  const { md5, type } = photo;
  if (!md5 || !type) {
    console.warn('📡 getPhotoPath: Missing md5 or type', { photo });
    return '';
  }
  
  const path = `/collection_data/photos/${md5}.${type}`;
  console.log(`📷 Photo path generated: ${path}`);
  return path;
};

/**
 * Calculate path to a video file
 * 
 * @param {Object} video - Video object with md5 and type
 * @returns {string} - Path to the video file
 */
export const getVideoPath = (video) => {
  if (!video) {
    console.warn('📡 getVideoPath called with null video');
    return '';
  }
  
  const { md5, type } = video;
  if (!md5 || !type) {
    console.warn('📡 getVideoPath: Missing md5 or type', { video });
    return '';
  }
  
  const path = `/collection_data/videos/${md5}.${type}`;
  console.log(`🎬 Video path generated: ${path}`);
  return path;
};

/**
 * Calculate path to a PDF file
 * 
 * @param {Object} pdf - PDF object with md5
 * @returns {string} - Path to the PDF file
 */
export const getPdfPath = (pdf) => {
  if (!pdf) {
    console.warn('📡 getPdfPath called with null pdf');
    return '';
  }
  
  const { md5 } = pdf;
  if (!md5) {
    console.warn('📡 getPdfPath: Missing md5', { pdf });
    return '';
  }
  
  const path = `/collection_data/pdfs/${md5}.pdf`;
  console.log(`📄 PDF path generated: ${path}`);
  return path;
};

/**
 * Check if a file exists at the given path
 * 
 * @param {string} path - Path to check
 * @returns {Promise<boolean>} - True if file exists
 */
export const checkFileExists = async (path) => {
  try {
    console.log(`🔎 Checking if file exists: ${path}`);
    const response = await fetch(path, { method: 'HEAD' });
    const exists = response.ok;
    console.log(exists ? `✅ File exists: ${path}` : `❌ File not found: ${path}`);
    return exists;
  } catch (error) {
    console.error(`❌ Error checking file: ${path}`, error);
    return false;
  }
};

export default {
  getMediaPath,
  getPhotoPath,
  getVideoPath,
  getPdfPath,
  checkFileExists
};