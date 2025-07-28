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
  if (!media) return '';
  
  const { md5, type } = media;
  if (!md5 || !type) return '';
  
  // In production, media files are served from the data directory
  return `/collection_data/${type}s/${md5}.${type}`;
};

/**
 * Calculate path to a photo file
 * 
 * @param {Object} photo - Photo object with md5 and type
 * @returns {string} - Path to the photo file
 */
export const getPhotoPath = (photo) => {
  if (!photo) return '';
  const { md5, type } = photo;
  if (!md5 || !type) return '';
  
  return `/collection_data/photos/${md5}.${type}`;
};

/**
 * Calculate path to a video file
 * 
 * @param {Object} video - Video object with md5 and type
 * @returns {string} - Path to the video file
 */
export const getVideoPath = (video) => {
  if (!video) return '';
  const { md5, type } = video;
  if (!md5 || !type) return '';
  
  return `/collection_data/videos/${md5}.${type}`;
};

/**
 * Calculate path to a PDF file
 * 
 * @param {Object} pdf - PDF object with md5
 * @returns {string} - Path to the PDF file
 */
export const getPdfPath = (pdf) => {
  if (!pdf) return '';
  const { md5 } = pdf;
  if (!md5) return '';
  
  return `/collection_data/pdfs/${md5}.pdf`;
};

export default {
  getMediaPath,
  getPhotoPath,
  getVideoPath,
  getPdfPath
};