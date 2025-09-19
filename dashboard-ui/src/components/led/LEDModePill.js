import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useData } from '../../context/DataContext';
import { useLEDController } from '../../hooks/useLEDController';
import { getLEDColor } from '../../utils/colorSchemeEnhanced';

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
  min-width: ${props => props.$visualizationMode ? '180px' : '150px'};

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

const SliderContainer = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
`;

const SliderLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 14px;
  color: #333;
`;

const Slider = styled.input`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #4CAF50;
    cursor: pointer;
    transition: all 0.2s;
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #4CAF50;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  &:hover::-webkit-slider-thumb {
    transform: scale(1.1);
  }

  &:hover::-moz-range-thumb {
    transform: scale(1.1);
  }
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

const VisualizationInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  flex: 1;
`;

const VisualizationName = styled.div`
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.2;
`;

const TimeRemaining = styled.div`
  font-size: 10px;
  opacity: 0.9;
  white-space: nowrap;
`;

const Select = styled.select`
  width: 100%;
  padding: 8px;
  margin-top: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #2196F3;
  }
`;

const SectionDivider = styled.div`
  margin: 20px 0;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
`;

const VisualizationControl = styled.div`
  margin-bottom: 16px;
`;

const ControlLabel = styled.label`
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 500;
`;

const LEDModePill = () => {
  const { sendMessage, connected, lastMessage } = useWebSocket();
  const { allEntries, entries, selectedEntry } = useData();
  const { updateLEDs } = useLEDController();
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('interactive');
  const [autoSwitchMessage, setAutoSwitchMessage] = useState('');
  const [brightness, setBrightness] = useState(50); // Default 50% brightness
  const [visualizationInfo, setVisualizationInfo] = useState(null);
  const [visualizationDuration, setVisualizationDuration] = useState(60); // Default 60s
  const [availableVisualizations, setAvailableVisualizations] = useState([]);
  
  // Refs for managing state
  const inactivityTimerRef = useRef(null);
  const lastEntriesRef = useRef(entries);
  const lastSelectedEntryRef = useRef(selectedEntry);
  const INACTIVITY_TIMEOUT = window.location.search.includes('debug=led') 
    ? 30 * 1000  // 30 seconds for testing
    : 5 * 60 * 1000; // 5 minutes

  // Handle LED status updates from server
  useEffect(() => {
    if (lastMessage) {
      console.log('LEDModePill received message:', lastMessage.type, lastMessage.data);

      if (lastMessage.type === 'led_status' && lastMessage.data?.status) {
        const serverMode = lastMessage.data.status.current_mode;
        if (serverMode && serverMode !== mode) {
          setMode(serverMode);
        }

        // Update visualization info if present
        if (lastMessage.data.status.visualization) {
          console.log('LED status has visualization info:', lastMessage.data.status.visualization);
          setVisualizationInfo(lastMessage.data.status.visualization);
          setAvailableVisualizations(
            lastMessage.data.status.visualization.available_visualizations || []
          );
          // Update duration if provided
          if (lastMessage.data.status.visualization.duration) {
            setVisualizationDuration(lastMessage.data.status.visualization.duration);
          }
        } else if (serverMode === 'visualization') {
          // We're in visualization mode but no viz info yet
          console.log('In visualization mode but no viz info in status');
        }
      } else if (lastMessage.type === 'visualization_status') {
        // Direct visualization status update
        console.log('Received visualization_status:', lastMessage.data);
        if (lastMessage.data) {
          setVisualizationInfo(lastMessage.data);
          setAvailableVisualizations(lastMessage.data.available_visualizations || []);
          // Update duration if provided
          if (lastMessage.data.duration) {
            setVisualizationDuration(lastMessage.data.duration);
          }
        }
      }
    }
  }, [lastMessage, mode]);

  // Function to change mode
  const changeMode = useCallback((newMode, reason = 'unknown') => {
    if (newMode === mode) return;


    // Build the complete mode change message
    const modeChangeMsg = {
      command: 'set_mode',
      mode: newMode,
      allEntries: allEntries.map(entry => ({
        type: entry.type,
        title: entry.title,
        location: entry.location,
        region: entry.region,  // Include region field for visualization
        creationDate: entry.creationDate
      }))
    };

    // If switching to interactive mode, include the current LED state
    if (newMode === 'interactive') {
      // Get currently filtered entries (use allEntries if no filter is active)
      const filteredEntries = entries && entries.length > 0 ? entries : allEntries;


      // Build LED data for filtered entries
      const ledData = filteredEntries.map(entry => {
        // Always use allEntries for consistent indexing
        const sortedEntries = [...allEntries].sort((a, b) =>
          new Date(a.creationDate) - new Date(b.creationDate)
        );
        const index = sortedEntries.findIndex(e => e.uuid === entry.uuid);

        return {
          index,
          color: entry.type ? getLEDColor(entry.type) : '#FFFFFF',
          type: entry.type,
          isSelected: selectedEntry?.uuid === entry.uuid
        };
      }).filter(item => item.index !== null && item.index >= 0);

      // Include LED data in the mode change message
      modeChangeMsg.interactiveLedData = ledData;
    } else if (newMode === 'visualization') {
      // Request visualization status after a short delay
      setTimeout(() => {
        sendMessage('visualization_control', {
          command: 'get_status'
        });
      }, 500);
    }

    // Update local state optimistically
    setMode(newMode);

    // Send combined mode change + LED data to server
    sendMessage('led_update', modeChangeMsg);

    // Show notification for auto switches
    if (reason === 'inactivity') {
      setAutoSwitchMessage('No activity for 5 minutes - starting visualization');
      setTimeout(() => setAutoSwitchMessage(''), 3000);
    } else if (reason === 'activity') {
      setAutoSwitchMessage('Activity detected - switching to interactive mode');
      setTimeout(() => setAutoSwitchMessage(''), 3000);
    }
  }, [mode, sendMessage, allEntries, entries, selectedEntry, updateLEDs]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Only set timer if in interactive mode
    if (mode === 'interactive') {
      inactivityTimerRef.current = setTimeout(() => {
        changeMode('visualization', 'inactivity');
      }, INACTIVITY_TIMEOUT);
    }
  }, [mode, changeMode, INACTIVITY_TIMEOUT]);

  // Handle manual mode change from UI
  const handleManualModeChange = useCallback((newMode) => {
    // Clear interaction history so we don't immediately switch back
    lastEntriesRef.current = entries;
    lastSelectedEntryRef.current = selectedEntry;

    // Change mode
    changeMode(newMode, 'manual');

    // Reset timer if going to interactive
    if (newMode === 'interactive') {
      resetInactivityTimer();
    } else if (newMode === 'visualization') {
      // Request visualization status when switching to visualization mode
      setTimeout(() => {
        sendMessage('visualization_control', {
          command: 'get_status'
        });
      }, 500); // Small delay to ensure mode is fully switched
    }
  }, [changeMode, resetInactivityTimer, entries, selectedEntry, sendMessage]);

  // Handle brightness change
  const handleBrightnessChange = useCallback((newBrightness) => {
    setBrightness(newBrightness);

    // Send brightness update to server
    if (connected) {
      sendMessage('led_brightness', {
        brightness: newBrightness / 100  // Convert to 0-1 range
      });
    }
  }, [connected, sendMessage]);

  // Handle visualization duration change
  const handleDurationChange = useCallback((newDuration) => {
    setVisualizationDuration(newDuration);

    // Send duration update to server
    if (connected) {
      sendMessage('visualization_control', {
        command: 'set_duration',
        duration: newDuration
      });
    }
  }, [connected, sendMessage]);

  // Handle visualization selection
  const handleVisualizationSelect = useCallback((vizType) => {
    if (!vizType) return;

    // Send selection to server
    if (connected) {
      sendMessage('visualization_control', {
        command: 'select',
        visualization_type: vizType
      });
    }
  }, [connected, sendMessage]);

  // Handle data activity (filter/selection changes)
  const handleDataActivity = useCallback(() => {
    // Check if there's actual change in data
    const entriesChanged = entries !== lastEntriesRef.current;
    const selectionChanged = selectedEntry !== lastSelectedEntryRef.current;
    
    if (!entriesChanged && !selectionChanged) {
      // No actual change, don't trigger activity
      return;
    }
    
    // Update our tracked values
    lastEntriesRef.current = entries;
    lastSelectedEntryRef.current = selectedEntry;
    
    
    // If in visualization mode, switch back to interactive
    if (mode === 'visualization') {
      changeMode('interactive', 'activity');
    }
    
    // Reset inactivity timer
    resetInactivityTimer();
  }, [mode, changeMode, resetInactivityTimer, entries, selectedEntry]);


  // Monitor filter and selection changes
  useEffect(() => {
    handleDataActivity();
  }, [entries, selectedEntry, handleDataActivity]);

  // Initialize on mount
  useEffect(() => {
    // Set initial values to prevent first render from triggering activity
    lastEntriesRef.current = entries;
    lastSelectedEntryRef.current = selectedEntry;
    
    // Start inactivity timer
    resetInactivityTimer();
    
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []); // Empty deps - only run on mount

  // Reset timer when mode changes
  useEffect(() => {
    resetInactivityTimer();
  }, [mode, resetInactivityTimer]);

  const handleModalClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowModal(false);
    }
  };

  // Helper to format time remaining
  const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds < 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  if (!connected) return null;

  return (
    <>
      <StatusPill
        $visualizationMode={mode === 'visualization'}
        $stacked={true}
        onClick={() => setShowModal(true)}
        title="Click to configure LED mode"
      >
        <StatusDot $visualizationMode={mode === 'visualization'} />
        {mode === 'interactive' ? (
          'Interactive Mode'
        ) : (
          <VisualizationInfo>
            <VisualizationName>
              {(() => {
                console.log('Rendering visualization pill, info:', visualizationInfo);
                return visualizationInfo?.visualization_name || 'Visualization';
              })()}
            </VisualizationName>
            {visualizationInfo?.time_remaining !== undefined && (
              <TimeRemaining>
                {formatTimeRemaining(visualizationInfo.time_remaining)}
              </TimeRemaining>
            )}
          </VisualizationInfo>
        )}
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
                onClick={() => handleManualModeChange('interactive')}
              >
                Interactive
              </ModeButton>
              <ModeButton 
                $active={mode === 'visualization'} 
                onClick={() => handleManualModeChange('visualization')}
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

            <SliderContainer>
              <SliderLabel>
                <span>Brightness</span>
                <span>{brightness}%</span>
              </SliderLabel>
              <Slider
                type="range"
                min="5"
                max="100"
                value={brightness}
                onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
              />
            </SliderContainer>

            {mode === 'visualization' && (
              <>
                <SectionDivider />

                <VisualizationControl>
                  <ControlLabel>Visualization Type</ControlLabel>
                  <Select
                    value={visualizationInfo?.current_visualization || ''}
                    onChange={(e) => handleVisualizationSelect(e.target.value)}
                  >
                    {availableVisualizations && availableVisualizations.length > 0 ? (
                      availableVisualizations.map((viz) => (
                        <option key={viz.type} value={viz.type}>
                          {viz.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="type_distribution">Type Distribution</option>
                        <option value="chronology">Timeline</option>
                        <option value="region_map">Geographic Regions</option>
                      </>
                    )}
                  </Select>
                </VisualizationControl>

                <VisualizationControl>
                  <SliderLabel>
                    <span>Duration</span>
                    <span>{visualizationDuration}s</span>
                  </SliderLabel>
                  <Slider
                    type="range"
                    min="10"
                    max="300"
                    step="10"
                    value={visualizationDuration}
                    onChange={(e) => handleDurationChange(parseInt(e.target.value))}
                  />
                </VisualizationControl>
              </>
            )}
          </ControlPanel>
        </Modal>
      )}
    </>
  );
};

export default LEDModePill;