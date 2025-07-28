import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import MediaErrorDisplay from './MediaErrorDisplay';
import MediaLoading from './MediaLoading';
import mediaService from '../../services/mediaService';
import mediaErrorService from '../../services/mediaErrorService';

/**
 * Component for rendering PDF documents with enhanced error handling
 * 
 * @component
 */
const MediaDocument = ({ mediaPath, mediaItem }) => {
  const [error, setError] = useState(null);
  const [fileExists, setFileExists] = useState(true); // Assume file exists initially
  
  // Check if the PDF file exists when component mounts
  useEffect(() => {
    const checkDocumentExists = async () => {
      try {
        const exists = await mediaService.checkFileExists(mediaPath);
        if (!exists) {
          const notFoundError = mediaErrorService.createNotFoundError(mediaPath, mediaItem);
          mediaErrorService.logMediaError(notFoundError);
          setError(notFoundError);
          setFileExists(false);
        }
      } catch (err) {
        console.error(`Error checking document file: ${mediaPath}`, err);
        setFileExists(false);
        setError(mediaErrorService.createNotFoundError(mediaPath, mediaItem));
      }
    };
    
    // Log some diagnostic info
    console.log(`📄 Processing document: ${mediaPath}`);
    console.log('Document metadata:', { 
      md5: mediaItem?.md5, 
      type: mediaItem?.type 
    });
    
    checkDocumentExists();
  }, [mediaPath, mediaItem]);
  
  // If file doesn't exist or we have an error, show error display
  if (!fileExists || error) {
    return (
      <MediaErrorDisplay 
        error={error} 
        mediaItem={mediaItem} 
        mediaPath={mediaPath}
        downloadable={true}
        openInNewTab={true}
      />
    );
  }
  
  // For PDF documents, we just show a placeholder with a link to open/download
  return (
    <div className="pdf-placeholder" style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      {/* PDF icon */}
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
      
      {/* Title */}
      <div style={{ fontWeight: 500, marginBottom: '8px' }}>
        {mediaItem?.name || 'PDF Document'}
      </div>
      
      {/* File info */}
      <div style={{ fontSize: '12px', marginBottom: '16px', color: '#666' }}>
        {mediaItem?.md5}.{mediaItem?.type || 'pdf'}
      </div>
      
      {/* Action buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '10px', 
        marginTop: '12px' 
      }}>
        {/* Open button */}
        <a 
          href={mediaPath} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none'
          }}
        >
          Open PDF
        </a>
        
        {/* Download button */}
        <a 
          href={mediaPath} 
          download={mediaItem?.name || `${mediaItem?.md5}.pdf`}
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none'
          }}
        >
          Download
        </a>
      </div>
    </div>
  );
};

MediaDocument.propTypes = {
  /** Path to the document file */
  mediaPath: PropTypes.string.isRequired,
  
  /** Media item metadata */
  mediaItem: PropTypes.shape({
    md5: PropTypes.string,
    type: PropTypes.string,
    name: PropTypes.string
  }).isRequired
};

export default MediaDocument;