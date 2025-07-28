import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// Create a singleton FFmpeg instance
const ffmpeg = new FFmpeg();

// Configuration
const config = {
  log: true
};

// Flag to track if FFmpeg has been loaded
let ffmpegLoaded = false;

/**
 * Initialize FFmpeg if it hasn't been loaded yet
 * @returns {Promise<void>} - Resolves when FFmpeg is loaded
 */
const ensureFFmpegLoaded = async () => {
  if (!ffmpegLoaded) {
    try {
      // Load using the latest API
      await ffmpeg.load();
      ffmpegLoaded = true;
      console.log('FFmpeg loaded successfully');
    } catch (error) {
      console.error('Error loading FFmpeg:', error);
      throw new Error('Failed to load FFmpeg transcoder');
    }
  }
};

/**
 * Cache for transcoded videos to avoid re-processing the same video multiple times
 */
const transcodedCache = new Map();

/**
 * Transcode a MOV file to MP4 format using ffmpeg.wasm
 * 
 * @param {string} videoUrl - URL of the MOV video file to transcode
 * @param {Object} options - Transcoding options
 * @param {string} options.outputFormat - Output format (default: 'mp4')
 * @param {Function} options.onProgress - Progress callback (receives a value from 0-1)
 * @returns {Promise<string>} - URL to the transcoded video
 */
export const transcodeVideo = async (videoUrl, options = {}) => {
  const {
    outputFormat = 'mp4',
    onProgress = null
  } = options;
  
  // Check cache first
  const cacheKey = `${videoUrl}-${outputFormat}`;
  if (transcodedCache.has(cacheKey)) {
    console.log('Using cached transcoded video');
    return transcodedCache.get(cacheKey);
  }
  
  try {
    // Initialize FFmpeg if not already loaded
    await ensureFFmpegLoaded();
    
    console.log(`Transcoding video: ${videoUrl}`);
    
    // Extract filename from URL
    const urlParts = videoUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const outputFilename = filename.replace(/\.[^/.]+$/, '') + '.' + outputFormat;
    
    // Download the video file
    console.log('Fetching video file...');
    const videoData = await fetchFile(videoUrl);
    
    // Write the file to FFmpeg's virtual filesystem
    await ffmpeg.writeFile(filename, videoData);
    
    // Set up progress tracking
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress);
      });
    }
    
    // Run FFmpeg command to transcode the video
    console.log('Starting transcoding process...');
    await ffmpeg.exec([
      '-i', filename,               // Input file
      '-c:v', 'libx264',            // Video codec
      '-preset', 'fast',            // Encoding preset (fast)
      '-c:a', 'aac',                // Audio codec
      '-f', outputFormat,           // Force output format
      '-movflags', 'faststart',     // Optimize for web playback
      outputFilename                // Output filename
    ]);
    
    console.log('Transcoding completed successfully');
    
    // Read the result
    const data = await ffmpeg.readFile(outputFilename);
    
    // Create a URL for the transcoded video
    const blob = new Blob([data.buffer], { type: `video/${outputFormat}` });
    const url = URL.createObjectURL(blob);
    
    // Store in cache
    transcodedCache.set(cacheKey, url);
    
    return url;
  } catch (error) {
    console.error('Error transcoding video:', error);
    throw error;
  }
};

/**
 * Release resources for a transcoded video URL
 * 
 * @param {string} url - URL of the transcoded video
 * @returns {void}
 */
export const releaseTranscodedVideo = (url) => {
  if (!url) return;
  
  // Find and remove the URL from cache
  for (const [key, value] of transcodedCache.entries()) {
    if (value === url) {
      transcodedCache.delete(key);
      break;
    }
  }
  
  // Revoke the object URL
  URL.revokeObjectURL(url);
};

/**
 * Check if a video format is likely to need transcoding
 * 
 * @param {string} format - Video format/extension
 * @returns {boolean} - True if the format typically needs transcoding
 */
export const needsTranscoding = (format) => {
  if (!format) return false;
  
  const lowerFormat = format.toLowerCase();
  const problematicFormats = ['mov', 'avi', 'wmv', 'flv'];
  
  return problematicFormats.includes(lowerFormat);
};

const videoTranscoder = {
  transcodeVideo,
  releaseTranscodedVideo,
  needsTranscoding
};

export default videoTranscoder;