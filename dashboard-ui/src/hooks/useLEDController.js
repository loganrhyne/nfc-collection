import { useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useWebSocket } from './useWebSocket';
import { getLEDColor } from '../utils/colorSchemeEnhanced';

/**
 * Hook to manage LED visualization based on app state
 */
export const useLEDController = () => {
  const { entries, selectedEntry, activeFilters, filteredEntries, allEntries } = useData();
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
  
  // Update LED for filtered entries
  const updateFilteredLEDs = useCallback(() => {
    if (!connected) return;
    
    // Use filteredEntries if available, otherwise use all entries
    // This ensures LEDs work even when filteredEntries hasn't been populated yet
    const entriesToDisplay = filteredEntries || entries || [];
    
    // If we have a selected entry but no entries to display, just show the selected one
    if (entriesToDisplay.length === 0 && selectedEntry) {
      updateSelectedLED(selectedEntry);
      return;
    }
    
    // Map entries to their indices and colors
    const ledEntries = entriesToDisplay.map(entry => {
      const index = getEntryIndex(entry);
      const color = entry.type ? getLEDColor(entry.type) : '#FFFFFF';
      
      return {
        index,
        color,
        type: entry.type,
        isSelected: selectedEntry?.uuid === entry.uuid
      };
    }).filter(item => item.index !== null && item.index >= 0);
    
    // Send update for all entries
    sendMessage('led_update', {
      command: 'update_entries',
      entries: ledEntries
    });
    
    console.log('LED Update - Filtered entries:', {
      totalEntries: entries?.length || 0,
      totalFiltered: entriesToDisplay.length,
      ledEntries: ledEntries.length,
      activeFilters,
      hasFilters: !!(activeFilters && Object.keys(activeFilters).length > 0)
    });
  }, [connected, filteredEntries, entries, getEntryIndex, selectedEntry, sendMessage, updateSelectedLED, activeFilters]);
  
  // Effect to update LEDs when filtered entries or selection changes
  useEffect(() => {
    updateFilteredLEDs();
  }, [filteredEntries, selectedEntry, updateFilteredLEDs]);
  
  // Also update when entries change (in case filteredEntries isn't populated yet)
  useEffect(() => {
    if (!filteredEntries && entries) {
      updateFilteredLEDs();
    }
  }, [entries, filteredEntries, updateFilteredLEDs]);
  
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