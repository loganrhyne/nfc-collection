/**
 * Media Service - Centralized utilities for media handling
 * 
 * This service provides utilities for:
 * - Media type detection
 * - MIME type management
 * - Format compatibility checking
 * - Path generation
 */

// Base path for media files in the public directory
const BASE_MEDIA_PATH = '/data';

// Media type collections for easy reference
export const MEDIA_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'photo'],
  VIDEO: ['mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv', 'video'],
  DOCUMENT: ['pdf']
};

// MIME type mappings
export const MIME_TYPES = {
  // Image formats
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'heic': 'image/heic',
  'photo': 'image/jpeg', // Default for 'photo' type
  
  // Video formats
  'mp4': 'video/mp4',
  'mov': 'video/mp4', // Use mp4 MIME type for better compatibility
  'webm': 'video/webm',
  'avi': 'video/x-msvideo',
  'mkv': 'video/x-matroska',
  'wmv': 'video/x-ms-wmv',
  'video': 'video/mp4', // Default for 'video' type
  
  // Document formats
  'pdf': 'application/pdf'
};

// Alternative MIME types to try for problematic formats
export const ALTERNATIVE_MIME_TYPES = {
  'mov': [
    'video/mp4',
    'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
    'video/quicktime',
    'video/*'
  ]
};

/**
 * Determine media category based on file type
 * 
 * @param {string} type - The file type/extension
 * @returns {string|null} - Media category ('image', 'video', 'document') or null if unknown
 */
export const getMediaCategory = (type) => {
  if (!type) return null;
  
  const lowerType = type.toLowerCase();
  
  if (MEDIA_TYPES.IMAGE.includes(lowerType)) return 'image';
  if (MEDIA_TYPES.VIDEO.includes(lowerType)) return 'video';
  if (MEDIA_TYPES.DOCUMENT.includes(lowerType)) return 'document';
  
  return null;
};

/**
 * Get the MIME type for a file type
 * 
 * @param {string} type - The file type/extension
 * @returns {string} - MIME type string
 */
export const getMimeType = (type) => {
  if (!type) return 'application/octet-stream';
  
  const lowerType = type.toLowerCase();
  return MIME_TYPES[lowerType] || `${getMediaCategory(lowerType) || 'application'}/${lowerType}`;
};

/**
 * Get alternative MIME types for problematic formats
 * 
 * @param {string} type - The file type/extension
 * @returns {string[]} - Array of alternative MIME types to try
 */
export const getAlternativeMimeTypes = (type) => {
  if (!type) return [];
  
  const lowerType = type.toLowerCase();
  return ALTERNATIVE_MIME_TYPES[lowerType] || [];
};

/**
 * Calculate path to a media file
 * 
 * @param {Object} media - Media object with md5 and type
 * @returns {string} - Path to the media file
 */
export const getMediaPath = (media) => {
  if (!media?.md5 || !media?.type) {
    console.warn('Invalid media object provided to getMediaPath', { media });
    return '';
  }
  
  const { md5, type } = media;
  const category = getMediaCategory(type);
  
  // Determine directory based on media category
  let directory;
  switch (category) {
    case 'image':
      directory = 'photos';
      break;
    case 'video':
      directory = 'videos';
      break;
    case 'document':
      directory = 'pdfs';
      break;
    default:
      console.warn(`Unknown media type: ${type}, defaulting to photos directory`);
      directory = 'photos';
  }
  
  return `${BASE_MEDIA_PATH}/${directory}/${md5}.${type}`;
};

/**
 * Calculate path to a photo file
 * 
 * @param {Object} photo - Photo object with md5 and type
 * @returns {string} - Path to the photo file
 */
export const getPhotoPath = (photo) => {
  if (!photo?.md5 || !photo?.type) {
    console.warn('Invalid photo object provided to getPhotoPath', { photo });
    return '';
  }
  
  return `${BASE_MEDIA_PATH}/photos/${photo.md5}.${photo.type}`;
};

/**
 * Calculate path to a video file
 * 
 * @param {Object} video - Video object with md5 and type
 * @returns {string} - Path to the video file
 */
export const getVideoPath = (video) => {
  if (!video?.md5 || !video?.type) {
    console.warn('Invalid video object provided to getVideoPath', { video });
    return '';
  }
  
  return `${BASE_MEDIA_PATH}/videos/${video.md5}.${video.type}`;
};

/**
 * Calculate path to a PDF file
 * 
 * @param {Object} pdf - PDF object with md5
 * @returns {string} - Path to the PDF file
 */
export const getPdfPath = (pdf) => {
  if (!pdf?.md5) {
    console.warn('Invalid pdf object provided to getPdfPath', { pdf });
    return '';
  }
  
  return `${BASE_MEDIA_PATH}/pdfs/${pdf.md5}.pdf`;
};

/**
 * Check if a file exists at the given path
 * 
 * @param {string} path - Path to check
 * @returns {Promise<boolean>} - True if file exists
 */
export const checkFileExists = async (path) => {
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error(`Error checking file: ${path}`, error);
    return false;
  }
};

/**
 * Check if a format is problematic for browser playback
 * 
 * @param {string} format - File format/extension
 * @returns {boolean} - True if the format is problematic
 */
export const isProblematicFormat = (format) => {
  if (!format) return false;
  
  const lowerFormat = format.toLowerCase();
  return ['mov', 'avi', 'wmv', 'mkv'].includes(lowerFormat);
};

/**
 * Get browser compatibility info for a given format
 * 
 * @param {string} format - File format/extension
 * @returns {Object} - Browser compatibility information
 */
export const getBrowserCompatInfo = (format) => {
  if (!format || typeof document === 'undefined') return {};
  
  const videoElement = document.createElement('video');
  const mimeType = getMimeType(format);
  const altMimeTypes = getAlternativeMimeTypes(format);
  
  const compatibility = {
    format,
    mimeType,
    mainSupport: videoElement.canPlayType(mimeType) || 'no/unknown',
    alternativeSupport: {}
  };
  
  // Check alternative MIME types
  altMimeTypes.forEach(altType => {
    compatibility.alternativeSupport[altType] = 
      videoElement.canPlayType(altType) || 'no/unknown';
  });
  
  return compatibility;
};

/**
 * Create a modified URL for better browser compatibility
 * 
 * @param {string} originalPath - Original file path
 * @param {string} originalType - Original file type
 * @param {string} targetType - Target file type to simulate
 * @returns {string} - Modified URL
 */
export const createCompatibleUrl = (originalPath, originalType, targetType) => {
  if (!originalPath || !originalType || !targetType) return originalPath;
  
  // Replace extension in the path
  return originalPath.replace(
    new RegExp(`\\.${originalType}$`, 'i'), 
    `.${targetType}`
  );
};

export default {
  getMediaCategory,
  getMimeType,
  getAlternativeMimeTypes,
  getMediaPath,
  getPhotoPath,
  getVideoPath,
  getPdfPath,
  checkFileExists,
  isProblematicFormat,
  getBrowserCompatInfo,
  createCompatibleUrl,
  MEDIA_TYPES,
  MIME_TYPES
};