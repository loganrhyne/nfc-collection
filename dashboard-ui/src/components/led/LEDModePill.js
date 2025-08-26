import React, { useState, useEffect } from 'react';
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
  animation: ${props => props.$running ? 'pulse 2s infinite' : 'none'};
  
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

const VisualizationSelect = styled.select`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 12px;
`;

const StartButton = styled.button`
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  background: #2196F3;
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;

  &:hover {
    background: #1976D2;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const StatusText = styled.div`
  margin-top: 12px;
  font-size: 12px;
  color: #666;
  text-align: center;
`;

const LEDModePill = () => {
  const { sendMessage, connected } = useWebSocket();
  const { allEntries } = useData();
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('interactive');
  const [selectedVisualization, setSelectedVisualization] = useState('type_distribution');
  const [isRunning, setIsRunning] = useState(false);

  const visualizations = [
    { id: 'type_distribution', name: 'Type Distribution', description: 'Cycles through sand types with brightness ramping' },
    { id: 'geographic_heat', name: 'Geographic Heatmap', description: 'Shows intensity by region (Coming soon)', disabled: true },
    { id: 'timeline_wave', name: 'Timeline Wave', description: 'Temporal patterns (Coming soon)', disabled: true },
    { id: 'color_waves', name: 'Color Waves', description: 'Artistic color patterns (Coming soon)', disabled: true },
  ];

  const currentVisualization = visualizations.find(v => v.id === selectedVisualization);

  // Stop visualization when component unmounts
  useEffect(() => {
    return () => {
      if (mode === 'visualization' && isRunning) {
        sendMessage('led_update', {
          command: 'stop_visualization'
        });
      }
    };
  }, [mode, isRunning, sendMessage]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    
    if (newMode === 'interactive') {
      // Stop visualization
      sendMessage('led_update', {
        command: 'stop_visualization'
      });
      setIsRunning(false);
    } else {
      // Set visualization mode
      sendMessage('led_update', {
        command: 'set_mode',
        mode: 'visualization'
      });
    }
  };

  const handleStartVisualization = () => {
    if (!connected || !allEntries) return;

    // Send all entries data for visualization
    sendMessage('led_update', {
      command: 'start_visualization',
      visualization: selectedVisualization,
      allEntries: allEntries.map(entry => ({
        type: entry.type,
        title: entry.title,
        location: entry.location,
        creationDate: entry.creationDate
      }))
    });

    setIsRunning(true);
  };

  const handleStopVisualization = () => {
    sendMessage('led_update', {
      command: 'stop_visualization'
    });
    setIsRunning(false);
  };

  const handleModalClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowModal(false);
    }
  };

  if (!connected) return null;

  const pillText = mode === 'interactive' 
    ? 'Interactive Mode' 
    : isRunning 
      ? `Visualizing: ${currentVisualization?.name || 'None'}`
      : `Visualization Mode`;

  return (
    <>
      <StatusPill 
        $visualizationMode={mode === 'visualization'}
        $stacked={true}
        onClick={() => setShowModal(true)}
        title="Click to configure LED mode"
      >
        <StatusDot 
          $visualizationMode={mode === 'visualization'}
          $running={isRunning}
        />
        {pillText}
      </StatusPill>

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
                onClick={() => handleModeChange('interactive')}
              >
                Interactive
              </ModeButton>
              <ModeButton 
                $active={mode === 'visualization'} 
                onClick={() => handleModeChange('visualization')}
              >
                Visualization
              </ModeButton>
            </ModeToggle>

            {mode === 'visualization' && (
              <>
                <VisualizationSelect 
                  value={selectedVisualization} 
                  onChange={(e) => setSelectedVisualization(e.target.value)}
                  disabled={isRunning}
                >
                  {visualizations.map(viz => (
                    <option key={viz.id} value={viz.id} disabled={viz.disabled}>
                      {viz.name} {viz.disabled ? '(Coming soon)' : ''}
                    </option>
                  ))}
                </VisualizationSelect>

                {isRunning ? (
                  <StartButton onClick={handleStopVisualization}>
                    Stop Visualization
                  </StartButton>
                ) : (
                  <StartButton 
                    onClick={handleStartVisualization}
                    disabled={!allEntries || allEntries.length === 0}
                  >
                    Start Visualization
                  </StartButton>
                )}

                <StatusText>
                  {isRunning 
                    ? `Running: ${currentVisualization?.description}`
                    : currentVisualization?.description
                  }
                </StatusText>
              </>
            )}

            {mode === 'interactive' && (
              <StatusText>
                LEDs show filtered entries. Selected entry appears brighter.
              </StatusText>
            )}
          </ControlPanel>
        </Modal>
      )}
    </>
  );
};

export default LEDModePill;