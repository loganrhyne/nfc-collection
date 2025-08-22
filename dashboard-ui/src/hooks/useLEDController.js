import { useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useWebSocket } from './useWebSocket';
import { getLEDColor } from '../utils/colorSchemeEnhanced';

/**
 * Hook to manage LED visualization based on app state
 */
export const useLEDController = () => {
  const { entries, selectedEntry, activeFilters } = useData();
  const { sendMessage, registerHandler, connected } = useWebSocket();
  
  // Find the index of an entry in the sorted entries array
  const getEntryIndex = useCallback((entry) => {
    if (!entry || !entries.length) return null;
    
    // Sort entries by creation date (oldest first for grid position)
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.creationDate) - new Date(b.creationDate)
    );
    
    return sortedEntries.findIndex(e => e.uuid === entry.uuid);
  }, [entries]);
  
  // Send LED update for selected entry
  const updateSelectedLED = useCallback((entry) => {
    if (!connected) return;
    
    const index = entry ? getEntryIndex(entry) : null;
    
    // Get LED-optimized color from entry type
    const color = entry && entry.type 
      ? getLEDColor(entry.type)
      : '#FFFFFF';
    
    sendMessage('led_update', {
      command: 'set_selected',
      index: index,
      color: entry ? color : null
    });
    
    console.log('LED Update - Selected:', { 
      entry: entry?.uuid, 
      type: entry?.type,
      index,
      color: entry ? color : null
    });
  }, [connected, sendMessage, getEntryIndex]);
  
  // Update LED for filtered entries (future use)
  const updateFilteredLEDs = useCallback(() => {
    if (!connected) return;
    
    // For now, just log what would be sent
    console.log('LED Update - Filtered entries:', {
      totalEntries: entries.length,
      activeFilters
    });
    
    // TODO: Implement filtered entries display
  }, [connected, entries, activeFilters]);
  
  // Effect to update LED when selected entry changes
  useEffect(() => {
    updateSelectedLED(selectedEntry);
  }, [selectedEntry, updateSelectedLED]);
  
  // Register handler for LED status responses
  useEffect(() => {
    const cleanup = registerHandler('led_status', (data) => {
      console.log('LED Status:', data);
    });
    
    return cleanup;
  }, [registerHandler]);
  
  // Clear all LEDs
  const clearAllLEDs = useCallback(() => {
    if (!connected) return;
    
    sendMessage('led_update', {
      command: 'clear_all'
    });
  }, [connected, sendMessage]);
  
  return {
    updateSelectedLED,
    updateFilteredLEDs,
    clearAllLEDs,
    getEntryIndex
  };
};