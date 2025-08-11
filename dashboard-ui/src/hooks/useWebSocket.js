import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

const WEBSOCKET_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8765';

export const useWebSocket = () => {
  const socket = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const messageHandlers = useRef(new Map());

  useEffect(() => {
    // Initialize socket connection
    socket.current = io(WEBSOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socket.current.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
    });

    socket.current.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    socket.current.on('connection_status', (data) => {
      console.log('Connection status:', data);
    });

    // Generic message handler for all events
    socket.current.onAny((eventName, data) => {
      console.log(`Received ${eventName}:`, data);
      const message = { type: eventName, ...data };
      setLastMessage(message);
      
      // Call registered handlers
      const handler = messageHandlers.current.get(eventName);
      if (handler) {
        handler(message);
      }
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  const sendMessage = useCallback((type, data) => {
    if (socket.current && connected) {
      console.log(`Sending ${type}:`, data);
      socket.current.emit(type, {
        timestamp: new Date().toISOString(),
        ...data
      });
    } else {
      console.warn('Cannot send message - WebSocket not connected');
    }
  }, [connected]);

  const registerHandler = useCallback((messageType, handler) => {
    messageHandlers.current.set(messageType, handler);
    console.log(`Registered handler for ${messageType}`);
    
    // Return unsubscribe function
    return () => {
      messageHandlers.current.delete(messageType);
      console.log(`Unregistered handler for ${messageType}`);
    };
  }, []);

  return {
    connected,
    sendMessage,
    lastMessage,
    registerHandler
  };
};