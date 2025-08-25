import React from 'react';
import styled from 'styled-components';
import { useData } from '../../context/DataContext';
import { useLEDController } from '../../hooks/useLEDController';

const DebugContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 600px;
  max-height: 400px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
  z-index: 9999;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(15, 20px);
  gap: 2px;
  margin: 10px 0;
`;

const LED = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${props => props.lit ? props.color : '#222'};
  border: 1px solid ${props => props.selected ? 'white' : '#444'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: ${props => props.lit ? 'black' : '#666'};
`;

const EntryList = styled.div`
  margin-top: 10px;
  max-height: 200px;
  overflow-y: auto;
`;

const Entry = styled.div`
  padding: 2px 0;
  color: ${props => props.isLit ? '#0f0' : '#888'};
`;

const LEDDebugPanel = () => {
  const { allEntries, entries, selectedEntry } = useData();
  const { getEntryIndex } = useLEDController();
  
  if (!allEntries || !entries) return null;
  
  // Sort entries by newest first (matching UI)
  const sortedAll = [...allEntries].sort((a, b) => 
    new Date(b.creationDate) - new Date(a.creationDate)
  );
  
  // Create LED state map
  const ledMap = new Map();
  entries.forEach(entry => {
    const index = getEntryIndex(entry, allEntries);
    if (index !== null) {
      ledMap.set(index, {
        entry,
        isSelected: selectedEntry?.uuid === entry.uuid
      });
    }
  });
  
  // Create grid visualization
  const grid = [];
  for (let i = 0; i < 150; i++) {
    const ledData = ledMap.get(i);
    grid.push({
      index: i,
      lit: !!ledData,
      color: ledData?.entry.type ? `#${ledData.entry.type.substring(0, 6)}` : '#fff',
      selected: ledData?.isSelected || false
    });
  }
  
  return (
    <DebugContainer>
      <h3>LED Debug Panel</h3>
      <div>Total Entries: {allEntries.length} | Filtered: {entries.length}</div>
      
      <h4>LED Grid (Row 0 = Newest)</h4>
      <Grid>
        {grid.map((led, idx) => {
          // Calculate physical position with serpentine
          const row = Math.floor(idx / 15);
          const col = idx % 15;
          const physicalCol = row % 2 === 0 ? col : 14 - col;
          const physicalIndex = row * 15 + physicalCol;
          
          return (
            <LED
              key={idx}
              lit={led.lit}
              color={led.color}
              selected={led.selected}
              title={`Index: ${idx}, Physical: ${physicalIndex}`}
            >
              {led.lit ? idx : ''}
            </LED>
          );
        })}
      </Grid>
      
      <h4>Entry Mapping (First 20)</h4>
      <EntryList>
        {sortedAll.slice(0, 20).map((entry, idx) => {
          const ledIndex = getEntryIndex(entry, allEntries);
          const isLit = ledMap.has(ledIndex);
          
          return (
            <Entry key={entry.uuid} isLit={isLit}>
              {idx}: {entry.title} → LED {ledIndex} {isLit ? '✓' : '✗'}
            </Entry>
          );
        })}
      </EntryList>
    </DebugContainer>
  );
};

export default LEDDebugPanel;