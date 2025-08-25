import { useEffect, useCallback, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useWebSocket } from './useWebSocket';
import { getLEDColor } from '../utils/colorSchemeEnhanced';

/**
 * LED Controller Hook
 * Simple, clean implementation for interactive mode
 */
export const useLEDController = () => {
  const { allEntries, entries, selectedEntry } = useData();
  const { sendMessage, connected } = useWebSocket();
  const lastSentRef = useRef(null);
  
  /**
   * Get the index of an entry based on creation date order
   * This ensures consistent positioning regardless of filters
   */
  const getEntryIndex = useCallback((entry, entriesArray) => {
    if (!entry || !entriesArray || entriesArray.length === 0) return null;
    
    // Always use allEntries for consistent indexing
    const sortedEntries = [...entriesArray].sort((a, b) => 
      new Date(a.creationDate) - new Date(b.creationDate)
    );
    
    return sortedEntries.findIndex(e => e.uuid === entry.uuid);
  }, []);
  
  /**
   * Update LEDs based on current filter state
   * Only illuminates entries that match current filters
   */
  const updateLEDs = useCallback(() => {
    if (!connected || !allEntries) return;
    
    // Get currently filtered entries (or all if no filters)
    const filteredEntries = entries || [];
    
    // Build LED data for filtered entries only
    const ledData = filteredEntries.map(entry => {
      // Always use allEntries for consistent indexing
      const index = getEntryIndex(entry, allEntries);
      const color = entry.type ? getLEDColor(entry.type) : '#FFFFFF';
      const isSelected = selectedEntry?.uuid === entry.uuid;
      
      return {
        index,
        color,
        type: entry.type,
        isSelected
      };
    }).filter(item => item.index !== null && item.index >= 0);
    
    // Create a string representation for comparison
    const dataString = JSON.stringify(ledData);
    
    // Only send if data has changed
    if (dataString !== lastSentRef.current) {
      sendMessage('led_update', {
        command: 'update_interactive',
        entries: ledData
      });
      
      lastSentRef.current = dataString;
      
      console.log('LED Update:', {
        totalEntries: allEntries.length,
        filteredCount: filteredEntries.length,
        ledCount: ledData.length,
        hasSelected: !!selectedEntry
      });
    }
  }, [connected, allEntries, entries, selectedEntry, getEntryIndex, sendMessage]);
  
  // Update LEDs when relevant data changes
  useEffect(() => {
    updateLEDs();
  }, [entries, selectedEntry, updateLEDs]);
  
  // Clear all LEDs
  const clearAllLEDs = useCallback(() => {
    if (!connected) return;
    
    sendMessage('led_update', {
      command: 'clear_all'
    });
    
    lastSentRef.current = null;
  }, [connected, sendMessage]);
  
  return {
    updateLEDs,
    clearAllLEDs,
    getEntryIndex
  };
};