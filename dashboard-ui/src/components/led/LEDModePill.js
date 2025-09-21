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
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  width: 420px;
  overflow: hidden;
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
  padding: 16px 20px;
  background: #6366f1;
  margin: 0;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  color: white;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BodyContent = styled.div`
  padding: 24px;
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  font-size: 18px;
  color: white;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }
`;

const ModeToggle = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
`;

const ModeButton = styled.button`
  flex: 1;
  padding: 12px 20px;
  border: 2px solid ${props => props.$active ? '#6366f1' : '#e0e0e0'};
  border-radius: 8px;
  background: ${props => props.$active ? '#6366f1' : 'white'};
  color: ${props => props.$active ? 'white' : '#666'};
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &:hover:not(:disabled) {
    background: ${props => props.$active ? '#5558dd' : '#f7f7f7'};
    border-color: #6366f1;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const CompactToggle = styled.label`
  position: relative;
  display: inline-block;
  width: 52px;
  height: 26px;
  cursor: pointer;
`;

const CompactToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background-color: rgba(255, 255, 255, 0.3);
  }

  &:checked + span:after {
    content: 'ON';
    left: 5px;
    color: #6366f1;
  }

  &:checked + span:before {
    transform: translateX(26px);
  }

  & + span:after {
    content: 'OFF';
    right: 5px;
    color: white;
  }
`;

const CompactToggleSlider = styled.span`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.2);
  transition: 0.3s;
  border-radius: 13px;

  &:after {
    position: absolute;
    font-size: 9px;
    font-weight: 700;
    top: 50%;
    transform: translateY(-50%);
    transition: 0.3s;
    letter-spacing: 0.5px;
  }

  &:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

const StatusText = styled.div`
  margin-top: 12px;
  font-size: 12px;
  color: #666;
  text-align: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 6px;
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
  background: #e0e0e0;
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #6366f1;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #6366f1;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  }

  &:hover::-webkit-slider-thumb {
    transform: scale(1.15);
    box-shadow: 0 3px 12px rgba(99, 102, 241, 0.4);
  }

  &:hover::-moz-range-thumb {
    transform: scale(1.15);
    box-shadow: 0 3px 12px rgba(99, 102, 241, 0.4);
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
  gap: 4px;
  flex: 1;
`;

const VisualizationName = styled.div`
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.2;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressBar = styled.div`
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 2px;
  width: ${props => props.$progress}%;
  transition: width 0.5s linear;
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

// Removed old PowerToggle components - they're replaced by CompactToggle in the header

const LEDModePill = () => {
  const { sendMessage, connected, lastMessage } = useWebSocket();
  const { allEntries, entries, selectedEntry } = useData();
  const { updateLEDs } = useLEDController();
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('interactive');
  const [lastActiveMode, setLastActiveMode] = useState('interactive'); // Track last active mode for restore
  const [ledsOn, setLedsOn] = useState(true); // Track if LEDs are on or off
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
      try {
        if (lastMessage.type === 'led_status' && lastMessage.data?.status) {
          const serverMode = lastMessage.data.status.current_mode;
          if (serverMode) {
            if (serverMode === 'off') {
              setLedsOn(false);
              // Don't change mode when off, it's preserved
            } else {
              setLedsOn(true);
              setMode(serverMode);
              setLastActiveMode(serverMode); // Remember this as the last active mode
            }
          }

          // Update visualization info if present
          if (lastMessage.data.status.visualization) {
            setVisualizationInfo(lastMessage.data.status.visualization);
            setAvailableVisualizations(
              lastMessage.data.status.visualization.available_visualizations || []
            );
            // Update duration if provided
            if (lastMessage.data.status.visualization.duration) {
              setVisualizationDuration(lastMessage.data.status.visualization.duration);
            }
          }
        } else if (lastMessage.type === 'visualization_status') {
          // Direct visualization status update
          if (lastMessage.data) {
            setVisualizationInfo(lastMessage.data);
            setAvailableVisualizations(lastMessage.data.available_visualizations || []);
            // Update duration if provided
            if (lastMessage.data.duration) {
              setVisualizationDuration(lastMessage.data.duration);
            }
          }
        }
      } catch (error) {
        console.error('Error processing LED status message:', error);
      }
    }
  }, [lastMessage, mode]);

  // Function to change mode
  const changeMode = useCallback((newMode, reason = 'unknown') => {
    // Skip if already in this mode UNLESS we're restoring from off state
    if (newMode === mode && newMode !== 'off' && reason !== 'restore') return;

    // Handle OFF mode specially
    if (newMode === 'off') {
      setLedsOn(false);
      sendMessage('led_update', {
        command: 'set_mode',
        mode: 'off'
      });
      return;
    }


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
    if (newMode !== 'off') {
      setLastActiveMode(newMode); // Remember the last active mode
    }

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
  }, [mode, sendMessage, allEntries, entries, selectedEntry]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Only set timer if in interactive mode and LEDs are on
    if (mode === 'interactive' && ledsOn) {
      inactivityTimerRef.current = setTimeout(() => {
        changeMode('visualization', 'inactivity');
      }, INACTIVITY_TIMEOUT);
    }
  }, [mode, ledsOn, changeMode, INACTIVITY_TIMEOUT]);

  // Handle LED on/off toggle
  const handleLedToggle = useCallback((isOn) => {
    setLedsOn(isOn);

    if (isOn) {
      // Turn LEDs back on with the LAST ACTIVE mode, not current mode
      // This fixes the issue where mode might still be 'interactive' when LEDs are off
      const modeToRestore = lastActiveMode || 'interactive';
      changeMode(modeToRestore, 'restore');  // Use 'restore' reason to force update

      // For interactive mode, also trigger an LED update after a short delay
      // This ensures the LEDs get data after the mode is set
      if (modeToRestore === 'interactive') {
        setTimeout(() => {
          updateLEDs();
        }, 100);
      }

      // Reset inactivity timer
      resetInactivityTimer();
    } else {
      // Turn LEDs off
      changeMode('off', 'manual');
      // Clear inactivity timer when turning off
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    }
  }, [lastActiveMode, mode, changeMode, resetInactivityTimer, updateLEDs]);

  // Handle manual mode change from UI
  const handleManualModeChange = useCallback((newMode) => {
    // Don't change mode if LEDs are off
    if (!ledsOn) return;

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
  }, [ledsOn, changeMode, resetInactivityTimer, entries, selectedEntry, sendMessage]);

  // Handle brightness change
  const handleBrightnessChange = useCallback((newBrightness) => {
    try {
      setBrightness(newBrightness);

      // Send brightness update to server
      if (connected) {
        sendMessage('led_brightness', {
          brightness: newBrightness / 100  // Convert to 0-1 range
        });
      }
    } catch (error) {
      console.error('Error changing brightness:', error);
    }
  }, [connected, sendMessage]);

  // Handle visualization duration change
  const handleDurationChange = useCallback((newDuration) => {
    try {
      setVisualizationDuration(newDuration);

      // Send duration update to server
      if (connected) {
        sendMessage('visualization_control', {
          command: 'set_duration',
          duration: newDuration
        });
      }
    } catch (error) {
      console.error('Error changing visualization duration:', error);
    }
  }, [connected, sendMessage]);

  // Handle visualization selection
  const handleVisualizationSelect = useCallback((vizType) => {
    try {
      if (!vizType) return;

      // Send selection to server
      if (connected) {
        sendMessage('visualization_control', {
          command: 'select',
          visualization_type: vizType
        });
      }
    } catch (error) {
      console.error('Error selecting visualization:', error);
    }
  }, [connected, sendMessage]);

  // Handle data activity (filter/selection changes)
  const handleDataActivity = useCallback(() => {
    // Don't handle activity if LEDs are off
    if (!ledsOn) return;

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
  }, [mode, ledsOn, changeMode, resetInactivityTimer, entries, selectedEntry]);


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
        style={{
          backgroundColor: !ledsOn ? '#666' : mode === 'visualization' ? '#2196F3' : '#9C27B0',
          opacity: !ledsOn ? 0.8 : 1
        }}
      >
        <StatusDot $visualizationMode={mode === 'visualization'} />
        {!ledsOn ? (
          'LEDs Off'
        ) : mode === 'interactive' ? (
          'Interactive Mode'
        ) : (
          <VisualizationInfo>
            <VisualizationName>
              {visualizationInfo?.visualization_name || 'Visualization'}
            </VisualizationName>
            {visualizationInfo?.time_remaining !== undefined && visualizationInfo?.duration && (
              <ProgressBarContainer>
                <ProgressBar
                  $progress={(visualizationInfo.time_remaining / visualizationInfo.duration) * 100}
                />
              </ProgressBarContainer>
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
              <Title>
                💡 LED Control
              </Title>
              <HeaderControls>
                <CompactToggle>
                  <CompactToggleInput
                    type="checkbox"
                    checked={ledsOn}
                    onChange={(e) => handleLedToggle(e.target.checked)}
                  />
                  <CompactToggleSlider />
                </CompactToggle>
                <CloseButton onClick={() => setShowModal(false)}>✕</CloseButton>
              </HeaderControls>
            </Header>

            <BodyContent>
              <ModeToggle>
                <ModeButton
                  $active={mode === 'interactive'}
                  onClick={() => handleManualModeChange('interactive')}
                  disabled={!ledsOn}
                >
                  Interactive
                </ModeButton>
                <ModeButton
                  $active={mode === 'visualization'}
                  onClick={() => handleManualModeChange('visualization')}
                  disabled={!ledsOn}
                >
                  Visualization
                </ModeButton>
              </ModeToggle>

              <StatusText>
                {!ledsOn
                  ? 'LEDs are turned off. Toggle on to activate.'
                  : mode === 'interactive'
                  ? 'LEDs show filtered entries. Selected entry appears brighter.'
                  : 'Cycling through data visualizations.'
                }
              </StatusText>

                <SliderContainer style={{ opacity: ledsOn ? 1 : 0.4, pointerEvents: ledsOn ? 'auto' : 'none' }}>
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

              {mode === 'visualization' && ledsOn && (
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
            </BodyContent>
          </ControlPanel>
        </Modal>
      )}
    </>
  );
};

export default LEDModePill;