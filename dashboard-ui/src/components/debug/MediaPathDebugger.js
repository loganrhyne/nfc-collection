import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const DebugContainer = styled.div`
  border: 1px solid #f0ad4e;
  padding: 16px;
  margin: 16px 0;
  background-color: #fff8e1;
  border-radius: 4px;
  max-width: 800px;
`;

const DebugTitle = styled.h3`
  margin-top: 0;
  color: #f0ad4e;
`;

const DebugInfo = styled.pre`
  background-color: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
  white-space: pre-wrap;
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
`;

const Button = styled.button`
  padding: 8px 12px;
  background-color: #f0ad4e;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
  margin-bottom: 8px;
  
  &:hover {
    background-color: #ec971f;
  }
`;

/**
 * Component to debug media file path issues
 * @param {Object} props 
 * @param {string} props.md5 - MD5 hash of file to check
 * @param {string} props.type - File type
 */
const MediaPathDebugger = ({ md5, type }) => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [checking, setChecking] = useState(false);
  
  const checkPath = async (path) => {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      return {
        path,
        exists: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      return {
        path,
        exists: false,
        error: error.message
      };
    }
  };
  
  const runDiagnostics = async () => {
    if (!md5 || !type) {
      setDebugInfo({ error: 'Missing md5 or type' });
      return;
    }
    
    setChecking(true);
    
    const info = {
      environment: process.env.NODE_ENV,
      publicUrl: process.env.PUBLIC_URL || '',
      baseUrl: window.location.origin,
      md5,
      type,
      pathsChecked: []
    };
    
    // Create different path variations to test
    const pathVariations = [
      `/data/photos/${md5}.${type}`,
      `/data/videos/${md5}.${type}`,
      `/data/pdfs/${md5}.${type}`,
      `./data/photos/${md5}.${type}`,
      `./data/videos/${md5}.${type}`,
      `./data/pdfs/${md5}.${type}`,
      `${process.env.PUBLIC_URL}/data/photos/${md5}.${type}`,
      `${process.env.PUBLIC_URL}/data/videos/${md5}.${type}`,
      `${process.env.PUBLIC_URL}/data/pdfs/${md5}.${type}`
    ];
    
    // Check each path
    for (const path of pathVariations) {
      const result = await checkPath(path);
      info.pathsChecked.push(result);
    }
    
    setDebugInfo(info);
    setChecking(false);
  };
  
  return (
    <DebugContainer>
      <DebugTitle>Media Path Debugger</DebugTitle>
      <div>
        <strong>MD5:</strong> {md5}<br />
        <strong>Type:</strong> {type}
      </div>
      
      <div style={{ margin: '16px 0' }}>
        <Button onClick={runDiagnostics} disabled={checking}>
          {checking ? 'Checking Paths...' : 'Run Path Diagnostics'}
        </Button>
      </div>
      
      {debugInfo && (
        <DebugInfo>
          {JSON.stringify(debugInfo, null, 2)}
        </DebugInfo>
      )}
    </DebugContainer>
  );
};

export default MediaPathDebugger;