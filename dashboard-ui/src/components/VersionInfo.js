import React, { useState } from 'react';
import styled from 'styled-components';
import { BUILD_INFO } from '../version';

const VersionButton = styled.button`
  position: fixed;
  bottom: 20px;
  left: 20px;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  font-family: monospace;
  color: #666;
  background-color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  z-index: 999;
  transition: all 0.2s;
  
  &:hover {
    background-color: rgba(255, 255, 255, 1);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
`;

const VersionModal = styled.div`
  position: fixed;
  bottom: 60px;
  left: 20px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  font-size: 12px;
  font-family: monospace;
  z-index: 1000;
  min-width: 300px;
  
  h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: bold;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  td {
    padding: 4px 8px;
    border-bottom: 1px solid #eee;
  }
  
  td:first-child {
    font-weight: bold;
    color: #666;
    width: 100px;
  }
`;

const VersionInfo = () => {
  const [showDetails, setShowDetails] = useState(false);
  
  // Also log version on mount
  React.useEffect(() => {
    console.log('🚀 NFC Collection Dashboard Build Info:', BUILD_INFO);
  }, []);
  
  return (
    <>
      <VersionButton 
        onClick={() => setShowDetails(!showDetails)}
        title="Click to see build details"
      >
        v{BUILD_INFO.version}
      </VersionButton>
      
      {showDetails && (
        <VersionModal onClick={() => setShowDetails(false)}>
          <h3>Build Information</h3>
          <table>
            <tbody>
              <tr>
                <td>Version:</td>
                <td>{BUILD_INFO.version}</td>
              </tr>
              <tr>
                <td>Built:</td>
                <td>{BUILD_INFO.buildTime}</td>
              </tr>
              <tr>
                <td>Commit:</td>
                <td>{BUILD_INFO.gitCommit}</td>
              </tr>
              <tr>
                <td>Branch:</td>
                <td>{BUILD_INFO.gitBranch}</td>
              </tr>
            </tbody>
          </table>
        </VersionModal>
      )}
    </>
  );
};

export default VersionInfo;