import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useData } from '../../context/DataContext';

const StatusPill = styled.div`
  position: fixed;
  bottom: ${props => props.$stacked ? '60px' : '20px'};
  right: 20px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  background-color: ${props => props.$visualizationMode ? '#2196F3' : '#9C27B0'};
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  }
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.$visualizationMode ? '#64B5F6' : '#BA68C8'};
  animation: ${props => props.$visualizationMode ? 'pulse 2s infinite' : 'none'};
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ControlPanel = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  min-width: 300px;
  max-width: 400px;
  animation: slideIn 0.2s ease;
  
  @keyframes slideIn {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 18px;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  
  &:hover {
    background: #f5f5f5;
    color: #333;
  }
`;

const ModeToggle = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
`;

const ModeButton = styled.button`
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: ${props => props.$active ? '#4CAF50' : 'white'};
  color: ${props => props.$active ? 'white' : '#333'};
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$active ? '#45a049' : '#f5f5f5'};
  }
`;

const StatusText = styled.div`
  margin-top: 12px;
  font-size: 12px;
  color: #666;
  text-align: center;
`;

const AutoSwitchNotification = styled.div`
  position: fixed;
  bottom: 110px;
  right: 20px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 4px;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
  z-index: 1001;
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

const LEDModePill = () => {
  const { sendMessage, connected, lastMessage } = useWebSocket();
  const { allEntries, entries, selectedEntry } = useData();
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('interactive');
  const [autoSwitchMessage, setAutoSwitchMessage] = useState('');
  
  // Auto-switch timeout management
  const inactivityTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const manualOverrideRef = useRef(false);
  const INACTIVITY_TIMEOUT = window.location.search.includes('debug=led') 
    ? 30 * 1000  // 30 seconds for testing
    : 5 * 60 * 1000; // 5 minutes

  // Handle LED status updates from server
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'led_status' && lastMessage.data?.status) {
      const serverMode = lastMessage.data.status.current_mode;
      if (serverMode && serverMode !== mode) {
        console.log(`LED mode sync: ${mode} -> ${serverMode}`);
        setMode(serverMode);
      }
    }
  }, [lastMessage, mode]);

  // Function to change mode (handles both manual and auto switches)
  const changeMode = useCallback((newMode, isManual = false) => {
    if (newMode === mode) return;
    
    console.log(`Changing LED mode to ${newMode} (${isManual ? 'manual' : 'auto'})`);
    
    // Set manual override flag if user initiated
    if (isManual) {
      manualOverrideRef.current = true;
      // Clear override after a delay to allow auto-switch again
      setTimeout(() => {
        manualOverrideRef.current = false;
      }, 30000); // 30 seconds
    }
    
    // Update local state immediately
    setMode(newMode);
    
    // Send mode change to server with entries data
    sendMessage('led_update', {
      command: 'set_mode',
      mode: newMode,
      allEntries: allEntries.map(entry => ({
        type: entry.type,
        title: entry.title,
        location: entry.location,
        creationDate: entry.creationDate
      }))
    });
    
    // Show notification for auto switches
    if (!isManual) {
      const message = newMode === 'visualization' 
        ? 'No activity for 5 minutes - starting visualization'
        : 'Activity detected - switching to interactive mode';
      setAutoSwitchMessage(message);
      setTimeout(() => setAutoSwitchMessage(''), 3000);
    }
  }, [mode, sendMessage, allEntries]);

  // Record user activity
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // If in visualization mode and not manually set, switch back to interactive
    if (mode === 'visualization' && !manualOverrideRef.current) {
      changeMode('interactive', false);
    }
    
    // Reset inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Start new timer for auto-visualization (only if not manually overridden)
    if (mode === 'interactive' && !manualOverrideRef.current) {
      inactivityTimerRef.current = setTimeout(() => {
        if (!manualOverrideRef.current) {
          changeMode('visualization', false);
        }
      }, INACTIVITY_TIMEOUT);
    }
  }, [mode, changeMode, INACTIVITY_TIMEOUT]);

  // Monitor filter and selection changes
  useEffect(() => {
    recordActivity();
  }, [entries, selectedEntry, recordActivity]);

  // Initialize on mount
  useEffect(() => {
    recordActivity();
    
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [recordActivity]);

  const handleModalClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowModal(false);
    }
  };

  if (!connected) return null;

  const pillText = mode === 'interactive' 
    ? 'Interactive Mode' 
    : 'Visualization Mode';

  return (
    <>
      <StatusPill 
        $visualizationMode={mode === 'visualization'}
        $stacked={true}
        onClick={() => setShowModal(true)}
        title="Click to configure LED mode"
      >
        <StatusDot $visualizationMode={mode === 'visualization'} />
        {pillText}
      </StatusPill>

      {autoSwitchMessage && (
        <AutoSwitchNotification>
          {autoSwitchMessage}
        </AutoSwitchNotification>
      )}

      {showModal && (
        <Modal onClick={handleModalClick}>
          <ControlPanel>
            <Header>
              <Title>LED Control</Title>
              <CloseButton onClick={() => setShowModal(false)}>×</CloseButton>
            </Header>
            
            <ModeToggle>
              <ModeButton 
                $active={mode === 'interactive'} 
                onClick={() => changeMode('interactive', true)}
              >
                Interactive
              </ModeButton>
              <ModeButton 
                $active={mode === 'visualization'} 
                onClick={() => changeMode('visualization', true)}
              >
                Visualization
              </ModeButton>
            </ModeToggle>

            <StatusText>
              {mode === 'interactive' 
                ? 'LEDs show filtered entries. Selected entry appears brighter.'
                : 'Cycling through data visualizations.'
              }
            </StatusText>
          </ControlPanel>
        </Modal>
      )}
    </>
  );
};

export default LEDModePill;