import React, { createContext, useContext, useState, useEffect } from 'react';
import journalData from '../data/journal.json';
import { processEntries } from '../utils/dataProcessing';

// Create context
const DataContext = createContext();

// Context provider component
export const DataProvider = ({ children }) => {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [filters, setFilters] = useState({
    type: null,
    region: null,
    quarter: null,
    search: ''
  });
  
  // Track which chart set each filter to better communicate the source
  const [filterSources, setFilterSources] = useState({});
  const [gridMapping, setGridMapping] = useState({});
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Process journal data on component mount
  useEffect(() => {
    const processed = processEntries(journalData.entries);
    setEntries(processed);
    setFilteredEntries(processed);
    
    // TODO: Load grid mapping from storage or API
    // For now we'll use an empty object
  }, []);

  // Apply filters whenever filters change
  useEffect(() => {
    let filtered = [...entries];
    
    if (filters.type) {
      filtered = filtered.filter(entry => entry.type === filters.type);
    }
    
    if (filters.region) {
      filtered = filtered.filter(entry => entry.region === filters.region);
    }
    
    if (filters.quarter) {
      filtered = filtered.filter(entry => entry.quarter === filters.quarter);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.title?.toLowerCase().includes(searchLower) || 
        entry.text?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredEntries(filtered);
  }, [filters, entries]);
  
  // Get entries filtered by everything except one dimension
  // This is used to feed charts the right data while respecting other filters
  const getEntriesFilteredExcept = (excludeDimension) => {
    let filtered = [...entries];
    
    // Apply all filters except the excluded dimension
    if (excludeDimension !== 'type' && filters.type) {
      filtered = filtered.filter(entry => entry.type === filters.type);
    }
    
    if (excludeDimension !== 'region' && filters.region) {
      filtered = filtered.filter(entry => entry.region === filters.region);
    }
    
    if (excludeDimension !== 'quarter' && filters.quarter) {
      filtered = filtered.filter(entry => entry.quarter === filters.quarter);
    }
    
    if (excludeDimension !== 'search' && filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.title?.toLowerCase().includes(searchLower) || 
        entry.text?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  };

  // Set filter for a specific dimension
  const setFilter = (dimension, value, source = null) => {
    console.log(`Setting filter: ${dimension} = ${value} (source: ${source})`);
    
    // If toggling off, remove the filter
    if (value === filters[dimension]) {
      console.log(`Removing filter: ${dimension}`);
      setFilters(prev => ({
        ...prev,
        [dimension]: null
      }));
      
      // Also remove the source tracking
      setFilterSources(prev => {
        const newSources = {...prev};
        delete newSources[dimension];
        return newSources;
      });
    } else {
      // Otherwise set the filter and track its source
      console.log(`Adding filter: ${dimension} = ${value}`);
      setFilters(prev => ({
        ...prev,
        [dimension]: value
      }));
      
      // Track which chart set this filter
      if (source) {
        setFilterSources(prev => ({
          ...prev,
          [dimension]: source
        }));
      }
    }
  };
  
  // Set filter for multiple dimensions at once (for segment clicks on stacked bars)
  const setMultiFilter = (newFilters, source = null) => {
    console.log('Setting multiple filters:', newFilters, 'source:', source);
    
    // Update all the specified filters
    setFilters(prev => {
      const result = {
        ...prev,
        ...newFilters
      };
      console.log('Updated filters state:', result);
      return result;
    });
    
    // Track sources for all dimensions
    if (source) {
      const newSources = {};
      Object.keys(newFilters).forEach(dimension => {
        newSources[dimension] = source;
      });
      
      setFilterSources(prev => ({
        ...prev,
        ...newSources
      }));
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      type: null,
      region: null,
      quarter: null,
      search: ''
    });
    
    // Clear all filter sources
    setFilterSources({});
  };

  // Find entry by UUID
  const getEntryByUUID = (uuid) => {
    return entries.find(entry => entry.uuid === uuid) || null;
  };

  // Get grid position for UUID
  const getGridPositionByUUID = (uuid) => {
    return gridMapping[uuid] || null;
  };

  // Set grid position for UUID
  const setGridPositionForUUID = (uuid, position) => {
    setGridMapping(prev => ({
      ...prev,
      [uuid]: position
    }));
    // TODO: Save mapping to storage or API
  };

  // Highlight all entries of a specific type on the grid
  const highlightTypeOnGrid = (type) => {
    // This function will be implemented when we create the LED control system
    console.log(`Highlighting all ${type} entries on grid`);
    // Return entries of the given type
    return entries.filter(entry => entry.type === type);
  };

  return (
    <DataContext.Provider
      value={{
        allEntries: entries,
        entries: filteredEntries,
        filters,
        filterSources,
        setFilter,
        setMultiFilter,
        resetFilters,
        selectedEntry,
        setSelectedEntry,
        getEntryByUUID,
        getGridPositionByUUID,
        setGridPositionForUUID,
        highlightTypeOnGrid,
        getEntriesFilteredExcept
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

// Custom hook for using the data context
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export default DataContext;