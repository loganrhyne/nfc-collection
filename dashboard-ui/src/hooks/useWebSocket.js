import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

// Configuration
const CONFIG = {
  WEBSOCKET_URL: process.env.REACT_APP_WS_URL || 
    (process.env.NODE_ENV === 'production' 
      ? `http://${window.location.hostname}:8765`
      : 'http://localhost:8765'),
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 10000,
  CONNECTION_TIMEOUT: 20000,
  HEARTBEAT_INTERVAL: 30000,
  MESSAGE_QUEUE_MAX_SIZE: 100
};

// Message queue for offline support
class MessageQueue {
  constructor(maxSize = CONFIG.MESSAGE_QUEUE_MAX_SIZE) {
    this.queue = [];
    this.maxSize = maxSize;
  }

  enqueue(message) {
    if (this.queue.length >= this.maxSize) {
      this.queue.shift(); // Remove oldest
    }
    this.queue.push({
      ...message,
      queuedAt: Date.now()
    });
  }

  dequeueAll() {
    const messages = [...this.queue];
    this.queue = [];
    return messages;
  }

  size() {
    return this.queue.length;
  }
}

export const useWebSocket = () => {
  const socket = useRef(null);
  const messageQueue = useRef(new MessageQueue());
  const heartbeatInterval = useRef(null);
  const messageHandlers = useRef(new Map());
  
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [queuedMessageCount, setQueuedMessageCount] = useState(0);

  // Heartbeat mechanism
  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    
    heartbeatInterval.current = setInterval(() => {
      if (socket.current && socket.current.connected) {
        socket.current.emit('ping', { timestamp: Date.now() });
      }
    }, CONFIG.HEARTBEAT_INTERVAL);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, []);

  // Process queued messages when reconnected
  const processQueuedMessages = useCallback(() => {
    const messages = messageQueue.current.dequeueAll();
    console.log(`Processing ${messages.length} queued messages`);
    
    messages.forEach(({ type, data, queuedAt }) => {
      const age = Date.now() - queuedAt;
      // Skip messages older than 5 minutes
      if (age < 5 * 60 * 1000) {
        socket.current.emit(type, data);
      }
    });
    
    setQueuedMessageCount(0);
  }, []);

  useEffect(() => {
    console.log('Initializing WebSocket connection to:', CONFIG.WEBSOCKET_URL);
    
    // Initialize socket with enhanced configuration
    socket.current = io(CONFIG.WEBSOCKET_URL, {
      reconnection: true,
      reconnectionDelay: CONFIG.RECONNECTION_DELAY,
      reconnectionDelayMax: CONFIG.RECONNECTION_DELAY_MAX,
      reconnectionAttempts: Infinity,
      timeout: CONFIG.CONNECTION_TIMEOUT,
      transports: ['websocket'],  // Only use WebSocket to avoid polling delays
      upgrade: false,  // Don't upgrade from polling since we start with WebSocket
      // Security: Add auth token when available
      auth: {
        token: localStorage.getItem('wsAuthToken') || undefined
      }
    });

    // Connection event handlers
    socket.current.on('connect', () => {
      console.log('WebSocket connected:', socket.current.id);
      setConnected(true);
      setConnectionError(null);
      setReconnectAttempt(0);
      startHeartbeat();
      processQueuedMessages();
    });

    socket.current.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnected(false);
      stopHeartbeat();
      
      // Store reason for better error handling
      if (reason === 'io server disconnect') {
        setConnectionError('Server terminated connection');
      } else if (reason === 'transport close') {
        setConnectionError('Connection lost');
      }
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

    socket.current.on('error', (error) => {
      console.error('WebSocket error:', error);
      setConnectionError(error.message || 'Unknown error');
    });

    // Heartbeat response
    socket.current.on('pong', (data) => {
      const latency = Date.now() - data.timestamp;
      if (latency > 1000) {
        console.warn(`High WebSocket latency: ${latency}ms`);
      }
    });

    // Connection status from server
    socket.current.on('connection_status', (data) => {
      console.log('Connection status:', data);
    });

    // Generic message handler with error protection
    socket.current.onAny((eventName, data) => {
      try {
        console.log(`WebSocket received '${eventName}':`, data);
        const message = { type: eventName, ...data };
        setLastMessage(message);
        
        // Call registered handlers with error protection
        const handler = messageHandlers.current.get(eventName);
        if (handler) {
          try {
            handler(message);
          } catch (error) {
            console.error(`Error in handler for '${eventName}':`, error);
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    // Cleanup function
    return () => {
      console.log('Cleaning up WebSocket connection');
      stopHeartbeat();
      
      // Remove all listeners before disconnecting
      socket.current.removeAllListeners();
      socket.current.disconnect();
      socket.current = null;
    };
  }, []); // Empty deps - only run once on mount

  const sendMessage = useCallback((type, data = {}) => {
    const message = {
      timestamp: new Date().toISOString(),
      ...data
    };

    if (socket.current && socket.current.connected) {
      console.log(`Sending ${type}:`, message);
      socket.current.emit(type, message);
    } else {
      console.warn(`Cannot send message '${type}' - WebSocket not connected. Queuing...`);
      messageQueue.current.enqueue({ type, data: message });
      setQueuedMessageCount(messageQueue.current.size());
    }
  }, []);

  const registerHandler = useCallback((messageType, handler) => {
    if (typeof handler !== 'function') {
      console.error(`Handler for ${messageType} must be a function`);
      return () => {};
    }

    messageHandlers.current.set(messageType, handler);
    console.log(`Registered handler for ${messageType}`);
    
    // Return unsubscribe function
    return () => {
      messageHandlers.current.delete(messageType);
      console.log(`Unregistered handler for ${messageType}`);
    };
  }, []);

  // Force reconnect method
  const reconnect = useCallback(() => {
    if (socket.current) {
      console.log('Forcing WebSocket reconnection');
      socket.current.disconnect();
      socket.current.connect();
    }
  }, []);

  return {
    connected,
    sendMessage,
    lastMessage,
    registerHandler,
    connectionError,
    reconnectAttempt,
    queuedMessageCount,
    reconnect,
    socketId: socket.current?.id
  };
};