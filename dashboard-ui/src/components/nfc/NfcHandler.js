import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useData } from '../../context/DataContext';

const NfcContainer = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
`;

const NfcButton = styled.button`
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, background-color 0.2s;
  
  &:hover {
    background-color: #3a80d2;
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const NfcModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  
  &:hover {
    color: #333;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
`;

const Select = styled.select`
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 1rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 1rem;
`;

const ActionButton = styled.button`
  padding: 10px 16px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background-color: #3a80d2;
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const NfcStatus = styled.div`
  margin-top: 16px;
  padding: 12px;
  border-radius: 4px;
  text-align: center;
  
  ${props => props.status === 'success' && `
    background-color: #e6f4ea;
    color: #137333;
  `}
  
  ${props => props.status === 'error' && `
    background-color: #fce8e8;
    color: #c53929;
  `}
  
  ${props => props.status === 'info' && `
    background-color: #e8f0fe;
    color: #1a73e8;
  `}
`;

// This is a mock implementation - the real implementation would use the 
// Web NFC API or communicate with the PN532 via a backend service
const NfcHandler = () => {
  const { allEntries, getEntryByUUID, setSelectedEntry, getGridPositionByUUID, setGridPositionForUUID } = useData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('read'); // 'read' or 'register'
  const [status, setStatus] = useState(null); // null, 'success', 'error', 'info'
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [gridPosition, setGridPosition] = useState('');
  
  // Open NFC modal
  const openModal = () => {
    setIsModalOpen(true);
    setStatus(null);
  };
  
  // Close NFC modal
  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  // Switch modal mode between read and register
  const switchModalMode = (mode) => {
    setModalMode(mode);
    setStatus(null);
  };
  
  // Handle reading NFC tag
  const handleReadNfc = () => {
    // In a real implementation, this would use the Web NFC API or a backend service
    // For now, we'll simulate reading a tag
    
    setStatus('info');
    setStatusMessage('Reading NFC tag...');
    
    // Simulate a 2-second delay
    setTimeout(() => {
      // Simulate reading a UUID from an NFC tag
      // In a real implementation, this would come from the actual NFC tag
      const uuid = allEntries.length > 0 ? allEntries[Math.floor(Math.random() * allEntries.length)].uuid : null;
      
      if (uuid) {
        const entry = getEntryByUUID(uuid);
        if (entry) {
          setSelectedEntry(entry);
          setStatus('success');
          setStatusMessage(`Success! Found entry: ${entry.title}`);
          closeModal();
        } else {
          setStatus('error');
          setStatusMessage(`Error: Entry with UUID ${uuid} not found in journal data.`);
        }
      } else {
        setStatus('error');
        setStatusMessage('Error: No UUID found on NFC tag or no entries available.');
      }
    }, 2000);
  };
  
  // Handle writing NFC tag for registration
  const handleRegisterNfc = () => {
    // In a real implementation, this would use the Web NFC API or a backend service
    // For now, we'll simulate writing a tag
    
    if (!selectedEntryId || !gridPosition) {
      setStatus('error');
      setStatusMessage('Please select an entry and specify a grid position.');
      return;
    }
    
    setStatus('info');
    setStatusMessage('Writing NFC tag...');
    
    // Simulate a 2-second delay
    setTimeout(() => {
      // Simulate writing UUID to an NFC tag
      // In a real implementation, this would write to the actual NFC tag
      
      // Store the grid position mapping
      setGridPositionForUUID(selectedEntryId, gridPosition);
      
      setStatus('success');
      setStatusMessage('Success! NFC tag registered and grid position recorded.');
      
      // Reset form
      setSelectedEntryId('');
      setGridPosition('');
    }, 2000);
  };
  
  return (
    <>
      <NfcContainer>
        <NfcButton onClick={openModal} title="NFC Options">
          <span role="img" aria-label="NFC">📱</span>
        </NfcButton>
      </NfcContainer>
      
      {isModalOpen && (
        <NfcModal>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>
                {modalMode === 'read' ? 'Read NFC Tag' : 'Register NFC Tag'}
              </ModalTitle>
              <CloseButton onClick={closeModal}>&times;</CloseButton>
            </ModalHeader>
            
            <div>
              <div style={{ marginBottom: '16px' }}>
                <ActionButton 
                  onClick={() => switchModalMode('read')}
                  style={{ 
                    marginRight: '8px',
                    backgroundColor: modalMode === 'read' ? '#4a90e2' : '#eee',
                    color: modalMode === 'read' ? 'white' : '#333'
                  }}
                >
                  Read Tag
                </ActionButton>
                <ActionButton 
                  onClick={() => switchModalMode('register')}
                  style={{ 
                    backgroundColor: modalMode === 'register' ? '#4a90e2' : '#eee',
                    color: modalMode === 'register' ? 'white' : '#333'
                  }}
                >
                  Register Tag
                </ActionButton>
              </div>
              
              {modalMode === 'read' ? (
                <div>
                  <p>
                    Place an NFC tag near the reader to view the associated journal entry.
                  </p>
                  <ActionButton onClick={handleReadNfc}>
                    Start Reading
                  </ActionButton>
                </div>
              ) : (
                <div>
                  <FormGroup>
                    <Label htmlFor="entry-select">Select Journal Entry:</Label>
                    <Select 
                      id="entry-select"
                      value={selectedEntryId}
                      onChange={(e) => setSelectedEntryId(e.target.value)}
                    >
                      <option value="">Select an entry...</option>
                      {allEntries.map(entry => (
                        <option key={entry.uuid} value={entry.uuid}>
                          {new Date(entry.creationDate).toLocaleDateString()} - {entry.title}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>
                  
                  <FormGroup>
                    <Label htmlFor="grid-position">Grid Position:</Label>
                    <Input 
                      id="grid-position"
                      type="text"
                      placeholder="e.g., A3 or 1,4"
                      value={gridPosition}
                      onChange={(e) => setGridPosition(e.target.value)}
                    />
                  </FormGroup>
                  
                  <ActionButton 
                    onClick={handleRegisterNfc}
                    disabled={!selectedEntryId || !gridPosition}
                  >
                    Write to Tag
                  </ActionButton>
                </div>
              )}
              
              {status && (
                <NfcStatus status={status}>
                  {statusMessage}
                </NfcStatus>
              )}
            </div>
          </ModalContent>
        </NfcModal>
      )}
    </>
  );
};

export default NfcHandler;