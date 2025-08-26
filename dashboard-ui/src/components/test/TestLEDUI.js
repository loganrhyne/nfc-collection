import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  padding: 20px;
  font-family: Arial, sans-serif;
`;

const MockPill = styled.div`
  position: fixed;
  bottom: ${props => props.bottom}px;
  right: 20px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  background-color: ${props => props.color};
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Dot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgba(255,255,255,0.8);
`;

const TestLEDUI = () => {
  return (
    <Container>
      <h1>LED UI Test Page</h1>
      <p>This page shows how the pills stack in the lower right corner.</p>
      
      {/* Mock NFC Status Pill */}
      <MockPill bottom={20} color="#4CAF50">
        <Dot />
        NFC Scanner Connected
      </MockPill>
      
      {/* Mock LED Mode Pill - Interactive */}
      <MockPill bottom={60} color="#9C27B0">
        <Dot />
        Interactive Mode
      </MockPill>
      
      {/* Alternative: Visualization Running */}
      {/* <MockPill bottom={60} color="#2196F3">
        <Dot />
        Visualizing: Type Distribution
      </MockPill> */}
      
      <div style={{ marginTop: '200px' }}>
        <h2>Pill States:</h2>
        <ul>
          <li><strong>Interactive Mode:</strong> Purple (#9C27B0)</li>
          <li><strong>Visualization Mode:</strong> Blue (#2196F3)</li>
          <li><strong>NFC Connected:</strong> Green (#4CAF50)</li>
        </ul>
        
        <h2>Text Variations:</h2>
        <ul>
          <li>"Interactive Mode" - when in interactive mode</li>
          <li>"Visualization Mode" - when in viz mode but not running</li>
          <li>"Visualizing: Type Distribution" - when actively running a visualization</li>
        </ul>
      </div>
    </Container>
  );
};

export default TestLEDUI;