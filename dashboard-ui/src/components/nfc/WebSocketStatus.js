import React from 'react';
import styled from 'styled-components';
import { useWebSocket } from '../../hooks/useWebSocket';

const StatusIndicator = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  background-color: ${props => props.$connected ? '#4CAF50' : '#f44336'};
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.$connected ? '#81C784' : '#ff7961'};
  animation: ${props => props.$connected ? 'pulse 2s infinite' : 'none'};
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

const WebSocketStatus = () => {
  const { 
    connected, 
    lastMessage, 
    connectionError, 
    reconnectAttempt, 
    queuedMessageCount,
    reconnect 
  } = useWebSocket();
  
  // Log WebSocket activity
  React.useEffect(() => {
    if (lastMessage) {
      console.log('WebSocket last message:', lastMessage);
    }
  }, [lastMessage]);
  
  // Determine status text
  let statusText = 'NFC Scanner Connected';
  if (!connected) {
    if (reconnectAttempt > 0) {
      statusText = `Reconnecting... (${reconnectAttempt})`;
    } else if (connectionError) {
      statusText = 'NFC Scanner Disconnected';
    } else {
      statusText = 'Connecting to NFC Scanner...';
    }
  }
  
  // Add queued message count if any
  if (queuedMessageCount > 0) {
    statusText += ` (${queuedMessageCount} queued)`;
  }
  
  return (
    <StatusIndicator 
      $connected={connected}
      onClick={() => !connected && reconnect()}
      style={{ cursor: !connected ? 'pointer' : 'default' }}
      title={!connected ? 'Click to reconnect' : statusText}
    >
      <StatusDot $connected={connected} />
      {statusText}
    </StatusIndicator>
  );
};

export default WebSocketStatus;