/**
 * Media Error Service - Centralized error handling for media components
 * 
 * This service provides utilities for:
 * - Standardized error logging
 * - Error categorization
 * - User-friendly error messages
 * - Diagnostic information
 */

// Error categories
export const ERROR_CATEGORIES = {
  NOT_FOUND: 'not_found',
  FORMAT_UNSUPPORTED: 'format_unsupported',
  NETWORK: 'network_error',
  DECODE: 'decode_error',
  UNKNOWN: 'unknown_error'
};

// Error codes from HTML media elements
export const HTML_MEDIA_ERROR_CODES = {
  MEDIA_ERR_ABORTED: 1,      // User aborted the download
  MEDIA_ERR_NETWORK: 2,      // Network error occurred during download
  MEDIA_ERR_DECODE: 3,       // Error occurred when decoding
  MEDIA_ERR_SRC_NOT_SUPPORTED: 4  // Format not supported
};

/**
 * Standardized media error object
 */
export class MediaError {
  constructor({
    category = ERROR_CATEGORIES.UNKNOWN,
    originalError = null,
    message = 'Unknown media error',
    mediaInfo = {},
    timestamp = Date.now()
  }) {
    this.category = category;
    this.originalError = originalError;
    this.message = message;
    this.mediaInfo = mediaInfo;
    this.timestamp = timestamp;
  }

  // Generate a user-friendly message based on error category
  getUserMessage() {
    switch(this.category) {
      case ERROR_CATEGORIES.NOT_FOUND:
        return 'Media file not found';
      case ERROR_CATEGORIES.FORMAT_UNSUPPORTED:
        return `Format ${this.mediaInfo.type || ''} is not supported by your browser`;
      case ERROR_CATEGORIES.NETWORK:
        return 'Network error while loading media';
      case ERROR_CATEGORIES.DECODE:
        return 'Could not decode the media file';
      default:
        return this.message;
    }
  }
  
  // Get technical details for debugging
  getTechnicalDetails() {
    const details = {
      category: this.category,
      message: this.message,
      mediaType: this.mediaInfo.type,
      mediaMd5: this.mediaInfo.md5,
      timestamp: new Date(this.timestamp).toISOString()
    };
    
    if (this.originalError) {
      if (this.originalError.code) {
        details.errorCode = this.originalError.code;
      }
      if (this.originalError.message) {
        details.errorMessage = this.originalError.message;
      }
    }
    
    return details;
  }
  
  // Convert to string for easy logging
  toString() {
    return `MediaError: ${this.message} (${this.category})`;
  }
}

/**
 * Create a standardized error from an HTML media element error event
 * 
 * @param {Event} errorEvent - Error event from HTML media element
 * @param {Object} mediaInfo - Information about the media being played
 * @returns {MediaError} - Standardized media error
 */
export const createErrorFromMediaEvent = (errorEvent, mediaInfo = {}) => {
  // Extract error information
  const target = errorEvent?.target;
  const mediaError = target?.error;
  const errorCode = mediaError?.code;
  
  let category = ERROR_CATEGORIES.UNKNOWN;
  let message = 'Unknown media playback error';
  
  // Categorize based on HTML media error code
  if (errorCode) {
    switch(errorCode) {
      case HTML_MEDIA_ERROR_CODES.MEDIA_ERR_ABORTED:
        category = ERROR_CATEGORIES.UNKNOWN;
        message = 'Media playback aborted';
        break;
      case HTML_MEDIA_ERROR_CODES.MEDIA_ERR_NETWORK:
        category = ERROR_CATEGORIES.NETWORK;
        message = 'Network error while loading media';
        break;
      case HTML_MEDIA_ERROR_CODES.MEDIA_ERR_DECODE:
        category = ERROR_CATEGORIES.DECODE;
        message = 'Media decoding error';
        break;
      case HTML_MEDIA_ERROR_CODES.MEDIA_ERR_SRC_NOT_SUPPORTED:
        category = ERROR_CATEGORIES.FORMAT_UNSUPPORTED;
        message = 'Media format not supported';
        break;
    }
  }
  
  // Create and return the standardized error
  return new MediaError({
    category,
    originalError: mediaError || errorEvent,
    message,
    mediaInfo
  });
};

/**
 * Create an error for a media file that was not found
 * 
 * @param {string} path - Path that was not found
 * @param {Object} mediaInfo - Information about the media
 * @returns {MediaError} - Standardized media error
 */
export const createNotFoundError = (path, mediaInfo = {}) => {
  return new MediaError({
    category: ERROR_CATEGORIES.NOT_FOUND,
    message: `Media file not found: ${path}`,
    mediaInfo
  });
};

/**
 * Create an error for an unsupported media format
 * 
 * @param {string} format - The unsupported format
 * @param {Object} mediaInfo - Information about the media
 * @returns {MediaError} - Standardized media error
 */
export const createUnsupportedFormatError = (format, mediaInfo = {}) => {
  return new MediaError({
    category: ERROR_CATEGORIES.FORMAT_UNSUPPORTED,
    message: `Media format not supported: ${format}`,
    mediaInfo: { ...mediaInfo, type: format }
  });
};

/**
 * Log an error with standard formatting
 * 
 * @param {MediaError} error - The error to log
 */
export const logMediaError = (error) => {
  if (!(error instanceof MediaError)) {
    console.error('Non-standard media error:', error);
    return;
  }
  
  // Log with standard format
  console.group(`🚨 Media Error: ${error.category}`);
  console.error(error.message);
  console.info('Media info:', error.mediaInfo);
  
  if (error.originalError) {
    console.debug('Original error:', error.originalError);
  }
  
  console.groupEnd();
};

export default {
  MediaError,
  createErrorFromMediaEvent,
  createNotFoundError,
  createUnsupportedFormatError,
  logMediaError,
  ERROR_CATEGORIES,
  HTML_MEDIA_ERROR_CODES
};