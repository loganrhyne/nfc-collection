import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useWebSocket } from '../../hooks/useWebSocket';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 8px;
  padding: 32px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  text-align: center;
`;

const ModalTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 1.5rem;
  color: #333;
`;

const ModalMessage = styled.p`
  margin: 0 0 24px 0;
  font-size: 1.1rem;
  color: #666;
  line-height: 1.5;
`;

const StatusIcon = styled.div`
  font-size: 64px;
  margin: 24px 0;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin: 24px 0;
`;

const ProgressFill = styled.div`
  height: 100%;
  background-color: #4a90e2;
  transition: width 0.3s ease;
  width: ${props => props.progress}%;
`;

const Button = styled.button`
  padding: 10px 24px;
  font-size: 1rem;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  
  &.primary {
    background-color: #4a90e2;
    color: white;
    
    &:hover {
      background-color: #3a80d2;
    }
  }
  
  &.secondary {
    background-color: #e0e0e0;
    color: #333;
    margin-right: 12px;
    
    &:hover {
      background-color: #d0d0d0;
    }
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #d32f2f;
  background-color: #ffebee;
  padding: 12px;
  border-radius: 4px;
  margin: 16px 0;
  font-size: 0.9rem;
`;

const NFCRegistrationModal = ({ entry, onClose, onSuccess }) => {
  const { connected, sendMessage, registerHandler } = useWebSocket();
  const [status, setStatus] = useState('idle'); // idle, waiting, writing, success, error
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!connected) {
      setStatus('error');
      setErrorMessage('WebSocket not connected. Please check the server is running.');
      return;
    }

    // Register message handlers
    const unsubscribers = [
      registerHandler('awaiting_tag', (message) => {
        setStatus('waiting');
        setProgress(10);
      }),
      
      registerHandler('tag_write_progress', (message) => {
        setStatus('writing');
        setProgress(message.progress || 50);
      }),
      
      registerHandler('tag_registered', (message) => {
        setStatus('success');
        setProgress(100);
        // Close modal after showing success
        setTimeout(() => {
          onClose();
          onSuccess(message);
        }, 2000);
      }),
      
      registerHandler('error', (message) => {
        setStatus('error');
        setErrorMessage(message.message || 'An error occurred');
      })
    ];

    // Start registration process
    const entryData = {
      coordinates: entry.location ? 
        [entry.location.latitude, entry.location.longitude] : 
        [0, 0],
      timestamp: entry.creationDate
    };

    sendMessage('register_tag_start', {
      entry_id: entry.uuid,
      entry_data: entryData
    });

    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
      sendMessage('register_tag_cancel', {});
    };
  }, [connected, entry, sendMessage, registerHandler, onSuccess]);

  const handleClose = () => {
    if (status !== 'writing') {
      onClose();
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'idle':
        return (
          <>
            <StatusIcon>⏳</StatusIcon>
            <ModalMessage>Initializing NFC writer...</ModalMessage>
          </>
        );
        
      case 'waiting':
        return (
          <>
            <StatusIcon>📱</StatusIcon>
            <ModalTitle>Place Sample on Reader</ModalTitle>
            <ModalMessage>
              Please place the NFC tag on the reader to register this sample.
            </ModalMessage>
            <ProgressBar>
              <ProgressFill progress={progress} />
            </ProgressBar>
          </>
        );
        
      case 'writing':
        return (
          <>
            <StatusIcon>✍️</StatusIcon>
            <ModalTitle>Writing Data</ModalTitle>
            <ModalMessage>
              Please keep the tag in place while data is being written...
            </ModalMessage>
            <ProgressBar>
              <ProgressFill progress={progress} />
            </ProgressBar>
          </>
        );
        
      case 'success':
        return (
          <>
            <StatusIcon>✅</StatusIcon>
            <ModalTitle>Success!</ModalTitle>
            <ModalMessage>
              The NFC tag has been successfully registered to this journal entry.
            </ModalMessage>
            <ProgressBar>
              <ProgressFill progress={progress} />
            </ProgressBar>
          </>
        );
        
      case 'error':
        return (
          <>
            <StatusIcon>❌</StatusIcon>
            <ModalTitle>Registration Failed</ModalTitle>
            <ErrorMessage>{errorMessage}</ErrorMessage>
            <Button className="primary" onClick={handleClose}>
              Close
            </Button>
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        {renderContent()}
        {status !== 'success' && status !== 'error' && status !== 'writing' && (
          <div style={{ marginTop: '24px' }}>
            <Button className="secondary" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default NFCRegistrationModal;