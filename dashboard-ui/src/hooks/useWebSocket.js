import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

// In production, use same host as the app but on port 8765
const WEBSOCKET_URL = process.env.REACT_APP_WS_URL || 
  (process.env.NODE_ENV === 'production' 
    ? `http://${window.location.hostname}:8765`
    : 'http://localhost:8765');

console.log('WebSocket URL:', WEBSOCKET_URL, 'Environment:', process.env.NODE_ENV);

export const useWebSocket = () => {
  const socket = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const messageHandlers = useRef(new Map());

  useEffect(() => {
    // Initialize socket connection with more robust settings
    socket.current = io(WEBSOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,  // Keep trying forever
      timeout: 20000,  // 20 second connection timeout
      transports: ['websocket', 'polling']  // Try websocket first, fall back to polling
    });

    socket.current.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      setConnectionError(null);
      setReconnectAttempt(0);
    });

    socket.current.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnected(false);
    });

    socket.current.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      setConnectionError(error.message);
    });

    socket.current.on('reconnect_attempt', (attemptNumber) => {
      console.log(`WebSocket reconnection attempt ${attemptNumber}`);
      setReconnectAttempt(attemptNumber);
    });

    socket.current.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
      setReconnectAttempt(0);
    });

    socket.current.on('connection_status', (data) => {
      console.log('Connection status:', data);
    });

    // Generic message handler for all events
    socket.current.onAny((eventName, data) => {
      console.log(`WebSocket received event '${eventName}':`, data);
      const message = { type: eventName, ...data };
      setLastMessage(message);
      
      // Call registered handlers
      const handler = messageHandlers.current.get(eventName);
      if (handler) {
        console.log(`Calling handler for '${eventName}'`);
        handler(message);
      } else {
        console.log(`No handler registered for '${eventName}'`);
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
    registerHandler,
    connectionError,
    reconnectAttempt
  };
};