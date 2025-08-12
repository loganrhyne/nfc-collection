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
  const { connected, lastMessage } = useWebSocket();
  
  // Log WebSocket activity
  React.useEffect(() => {
    if (lastMessage) {
      console.log('WebSocket last message:', lastMessage);
    }
  }, [lastMessage]);
  
  return (
    <StatusIndicator $connected={connected}>
      <StatusDot $connected={connected} />
      {connected ? 'NFC Scanner Connected' : 'NFC Scanner Disconnected'}
    </StatusIndicator>
  );
};

export default WebSocketStatus;