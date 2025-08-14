import React from 'react';
import styled from 'styled-components';
import { useWebSocket } from '../hooks/useWebSocket';

const StatusContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: ${props => props.connected ? '#4CAF50' : '#f44336'};
  color: white;
  padding: 10px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  transition: all 0.3s ease;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.connected ? '#8BC34A' : '#FF5252'};
  animation: ${props => props.connected ? 'none' : 'pulse 2s infinite'};

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

const ConnectionStatus = () => {
  const { connected, connectionError, reconnectAttempt } = useWebSocket();

  let statusText = 'Scanner Connected';
  if (!connected) {
    if (reconnectAttempt > 0) {
      statusText = `Reconnecting... (attempt ${reconnectAttempt})`;
    } else if (connectionError) {
      statusText = 'Scanner Disconnected';
    } else {
      statusText = 'Connecting to Scanner...';
    }
  }

  return (
    <StatusContainer connected={connected}>
      <StatusDot connected={connected} />
      <span>{statusText}</span>
    </StatusContainer>
  );
};

export default ConnectionStatus;