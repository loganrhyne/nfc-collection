import React, { useState, useRef, useEffect } from 'react';

// Test component to verify activity detection logic
function TestActivityDetection() {
  const [entries, setEntries] = useState(['a', 'b', 'c']);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  
  const lastEntriesRef = useRef(entries);
  const lastSelectedEntryRef = useRef(selectedEntry);
  
  // Simulate the activity detection logic
  useEffect(() => {
    const entriesChanged = entries !== lastEntriesRef.current;
    const selectionChanged = selectedEntry !== lastSelectedEntryRef.current;
    
    if (!entriesChanged && !selectionChanged) {
      console.log('No activity detected');
      return;
    }
    
    // Update refs
    lastEntriesRef.current = entries;
    lastSelectedEntryRef.current = selectedEntry;
    
    // Log activity
    const activity = {
      time: new Date().toLocaleTimeString(),
      entriesChanged,
      selectionChanged,
      entries: [...entries],
      selectedEntry
    };
    
    console.log('Activity detected:', activity);
    setActivityLog(prev => [...prev, activity]);
  }, [entries, selectedEntry]);
  
  const clearHistory = () => {
    console.log('Clearing history');
    lastEntriesRef.current = entries;
    lastSelectedEntryRef.current = selectedEntry;
    setActivityLog(prev => [...prev, { 
      time: new Date().toLocaleTimeString(), 
      action: 'HISTORY CLEARED' 
    }]);
  };
  
  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h2>Activity Detection Test</h2>
      
      <div style={{ marginBottom: 20 }}>
        <h3>Actions:</h3>
        <button onClick={() => setEntries(['a', 'b', 'c', 'd'])}>
          Change Entries
        </button>
        <button onClick={() => setSelectedEntry('item-1')} style={{ marginLeft: 10 }}>
          Select Item 1
        </button>
        <button onClick={() => setSelectedEntry('item-2')} style={{ marginLeft: 10 }}>
          Select Item 2
        </button>
        <button onClick={() => setSelectedEntry(null)} style={{ marginLeft: 10 }}>
          Clear Selection
        </button>
        <button onClick={clearHistory} style={{ marginLeft: 10, background: '#4CAF50', color: 'white' }}>
          Clear History (Manual Mode Change)
        </button>
      </div>
      
      <div style={{ marginBottom: 20 }}>
        <h3>Current State:</h3>
        <div>Entries: {JSON.stringify(entries)}</div>
        <div>Selected: {selectedEntry || 'none'}</div>
      </div>
      
      <div>
        <h3>Activity Log:</h3>
        <div style={{ 
          background: '#f5f5f5', 
          padding: 10, 
          borderRadius: 4,
          maxHeight: 300,
          overflow: 'auto'
        }}>
          {activityLog.map((log, i) => (
            <div key={i} style={{ marginBottom: 5 }}>
              [{log.time}] {log.action || `Activity: entries=${log.entriesChanged}, selection=${log.selectionChanged}`}
            </div>
          ))}
          {activityLog.length === 0 && <div>No activity yet</div>}
        </div>
      </div>
    </div>
  );
}

export default TestActivityDetection;