import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
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
  width: ${props => (props.indeterminate ? '40%' : `${props.progress || 0}%`)};
  ${props => props.indeterminate && `
    animation: nfcSlide 1.2s ease-in-out infinite;
    @keyframes nfcSlide {
      0%   { margin-left: 0%; }
      50%  { margin-left: 60%; }
      100% { margin-left: 0%; }
    }
  `}
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

const PlacementCell = styled.div`
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin: 0.75rem 0;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
`;

const NFCRegistrationModal = ({ entry, onClose, onSuccess }) => {
  const { connected, sendMessage, registerHandler } = useWebSocket();
  const [status, setStatus] = useState('idle'); // idle, waiting, writing, success, error
  const [placement, setPlacement] = useState(null);
  // Guards against the effect re-running and firing a second registration when
  // the parent re-renders (notably when the just-written tag is scanned and the
  // app navigates, which changes the `entry` object identity).
  const startedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!connected) {
      setStatus('error');
      setErrorMessage('WebSocket not connected. Please check the server is running.');
      return;
    }

    // useWebSocket wraps every payload as { type, data }, so handlers must
    // read message.data -- reading message.message is why every failure used
    // to surface as the generic 'An error occurred'.
    const unsubscribers = [
      registerHandler('awaiting_tag', () => {
        setStatus('waiting');
      }),

      registerHandler('tag_registered', (message) => {
        const data = message.data || {};
        setStatus('success');
        setPlacement(data.placement || null);
        // Hold longer when there is a cell to go find, so the number is
        // readable before the modal closes.
        const dwell = data.placement ? 6000 : 2000;
        setTimeout(() => {
          onClose();
          onSuccess(data);
        }, dwell);
      }),

      registerHandler('registration_error', (message) => {
        setStatus('error');
        setErrorMessage((message.data && message.data.message) ||
                        'Registration failed. Please try again.');
      })
    ];

    // The server reads coordinates from the journal rather than trusting the
    // client, so only the entry id is required here.
    if (!startedRef.current) {
      startedRef.current = true;
      sendMessage('register_tag_start', {
        entry_id: entry.uuid,
        entry_data: { timestamp: entry.creationDate }
      });
    }

    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
      if (startedRef.current) {
        sendMessage('register_tag_cancel', {});
      }
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
              <ProgressFill indeterminate />
            </ProgressBar>
          </>
        );
        
      case 'success':
        return (
          <>
            <StatusIcon>✅</StatusIcon>
            <ModalTitle>Success!</ModalTitle>
            {placement ? (
              <>
                <ModalMessage>
                  Registered. Place this sample in the lit cell:
                </ModalMessage>
                <PlacementCell>
                  Row {placement.row + 1}, Column {placement.col + 1}
                </PlacementCell>
                <ModalMessage style={{ fontSize: '0.85rem', opacity: 0.75 }}>
                  {placement.beacon
                    ? 'That cell is lit on the grid.'
                    : 'LED grid unavailable - use the row and column above.'}
                </ModalMessage>
              </>
            ) : (
              <ModalMessage>
                The NFC tag has been registered to this journal entry.
              </ModalMessage>
            )}
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

NFCRegistrationModal.propTypes = {
  entry: PropTypes.shape({
    uuid: PropTypes.string.isRequired,
    location: PropTypes.shape({
      latitude: PropTypes.number,
      longitude: PropTypes.number
    }),
    creationDate: PropTypes.string
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired
};

export default NFCRegistrationModal;