# Media Components

A modular, robust system for rendering various media types (images, videos, PDFs) with enhanced error handling and fallbacks.

## Components

### MediaRenderer

The main component for rendering collections of media items in a responsive grid layout.

```jsx
import { MediaRenderer } from '../components/media';

// Usage
<MediaRenderer 
  mediaItems={entryMediaItems} 
  onMediaClick={handleMediaClick}
/>
```

### Individual Media Components

These can be used directly for specific media types:

- `MediaImage` - For rendering images with error handling
- `MediaVideo` - For rendering videos with format compatibility handling
- `MediaDocument` - For rendering PDF documents
- `VideoPlayer` - Enhanced video player based on Video.js

### Utility Components

- `MediaErrorDisplay` - Standardized error display for media items
- `MediaLoading` - Loading indicators for media content

## Services

### mediaService

Utilities for media path generation, type detection, and compatibility checking.

```js
import mediaService from '../../services/mediaService';

// Get path to media file
const path = mediaService.getMediaPath(mediaItem);

// Check if a format is problematic
if (mediaService.isProblematicFormat(type)) {
  // Handle special case
}
```

### mediaErrorService

Standardized error handling for media components.

```js
import mediaErrorService from '../../services/mediaErrorService';

// Create a standard error
const error = mediaErrorService.createNotFoundError(path, mediaItem);

// Log error with standard format
mediaErrorService.logMediaError(error);
```

## Features

- **Responsive Grid Layout**: Automatically arranges media in visually appealing grids based on count
- **Format Compatibility**: Special handling for problematic formats like MOV files
- **Graceful Degradation**: Fallbacks when media can't be displayed
- **Error Standardization**: Consistent error handling and display
- **Enhanced Video Support**: Leverages Video.js with format detection

## Media Support

Currently supports:
- **Images**: jpg, jpeg, png, gif, webp, heic
- **Videos**: mp4, mov, avi, webm, mkv, wmv
- **Documents**: pdf