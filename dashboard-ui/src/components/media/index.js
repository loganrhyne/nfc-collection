/**
 * Media Components - Centralized export of all media-related components
 * 
 * This index file allows for simplified imports:
 * import { MediaRenderer, MediaImage, MediaVideo } from '../components/media';
 */

// Main component for rendering collections of media
export { default as MediaRenderer } from './MediaRenderer';

// Media type components
export { default as MediaImage } from './MediaImage';
export { default as MediaVideo } from './MediaVideo';
export { default as MediaDocument } from './MediaDocument';

// Video player component
export { default as VideoPlayer } from './VideoPlayer';

// UI components
export { default as MediaErrorDisplay } from './MediaErrorDisplay';
export { default as MediaLoading } from './MediaLoading';

// Default export for backwards compatibility
export { default } from './MediaRenderer';