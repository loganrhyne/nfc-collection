import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useData } from '../../context/DataContext';

const ControlPanel = styled.div`
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
`;

const Title = styled.h3`
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
`;

const ModeToggle = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
`;

const ModeButton = styled.button`
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: ${props => props.active ? '#4CAF50' : 'white'};
  color: ${props => props.active ? 'white' : '#333'};
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? '#45a049' : '#f5f5f5'};
  }
`;

const VisualizationSelect = styled.select`
  width: 100%;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 8px;
`;

const StartButton = styled.button`
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 4px;
  background: #2196F3;
  color: white;
  cursor: pointer;
  font-size: 12px;
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
  margin-top: 8px;
  font-size: 11px;
  color: #666;
  text-align: center;
`;

const LEDVisualizationControl = () => {
  const { sendMessage, connected } = useWebSocket();
  const { allEntries } = useData();
  const [mode, setMode] = useState('interactive');
  const [selectedVisualization, setSelectedVisualization] = useState('type_distribution');
  const [isRunning, setIsRunning] = useState(false);

  const visualizations = [
    { id: 'type_distribution', name: 'Type Distribution', description: 'Cycles through sand types with brightness ramping' },
    { id: 'geographic_heat', name: 'Geographic Heatmap', description: 'Shows intensity by region (Coming soon)', disabled: true },
    { id: 'timeline_wave', name: 'Timeline Wave', description: 'Temporal patterns (Coming soon)', disabled: true },
    { id: 'color_waves', name: 'Color Waves', description: 'Artistic color patterns (Coming soon)', disabled: true },
  ];

  const handleModeChange = (newMode) => {
    setMode(newMode);
    
    if (newMode === 'interactive') {
      // Stop visualization
      sendMessage('led_update', {
        command: 'stop_visualization'
      });
      setIsRunning(false);
    } else {
      // Just set mode, don't start visualization yet
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

  if (!connected) return null;

  return (
    <ControlPanel>
      <Title>LED Control</Title>
      
      <ModeToggle>
        <ModeButton 
          active={mode === 'interactive'} 
          onClick={() => handleModeChange('interactive')}
        >
          Interactive
        </ModeButton>
        <ModeButton 
          active={mode === 'visualization'} 
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
              ? `Running: ${visualizations.find(v => v.id === selectedVisualization)?.description}`
              : visualizations.find(v => v.id === selectedVisualization)?.description
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
  );
};

export default LEDVisualizationControl;