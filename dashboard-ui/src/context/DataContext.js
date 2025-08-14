import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
// Will load journal data dynamically from the public directory
import { processEntries } from '../utils/dataProcessing';
import { debugDataLoading } from '../utils/debugDataLoading';
import { 
  isValidDimension, 
  applyFilter,
  applyFilters,
  applyFiltersExcept,
  formatFilterValue,
  getDimensionDisplayName
} from '../utils/filterUtils';
import { createFilterMetadata, FilterTypes, getFilterDescription } from '../utils/filterMetadata';
import { 
  validateFilterLogic,
  validateFilters,
  sanitizeFilterValue
} from '../utils/filterValidation';
import {
  logFilterChange,
  logFilterResult,
  logPerformance,
  logFilterMetadata,
  logFilterHistory,
  logValidation,
  setLoggingEnabled
} from '../utils/filterLogger';

// Create context
const DataContext = createContext();

// Context provider component
export const DataProvider = ({ children, entryIdFromUrl }) => {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [filters, setFilters] = useState({
    type: null,
    region: null,
    quarter: null,
    search: '',
    geo: null  // New geographic filter
  });
  
  // Track which chart set each filter to better communicate the source
  const [filterSources, setFilterSources] = useState({});
  
  // Enhanced metadata for each active filter
  const [filterMetadata, setFilterMetadata] = useState({});
  
  // Track filter history for potential undo/redo functionality
  const [filterHistory, setFilterHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Performance metrics for filter operations
  const [filterPerformance, setFilterPerformance] = useState({
    lastFilterTime: 0,     // Time taken for last filter operation (ms)
    averageFilterTime: 0,  // Rolling average of filter operation times
    filterCount: 0         // Total number of filter operations performed
  });
  const [gridMapping, setGridMapping] = useState({});
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Process journal data on component mount - load dynamically from public directory
  useEffect(() => {
    // Fetch journal data from the public directory
    const loadJournalData = async () => {
      try {
        // Add cache busting to prevent stale data
        const timestamp = Date.now();
        const url = `/data/journal.json?t=${timestamp}`;
        
        debugDataLoading.log(`Loading journal data from: ${url}`);
        
        const response = await fetch(url, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.error('Failed to load journal data:', response.status, response.statusText);
          return;
        }
        
        const journalData = await response.json();
        console.log('✅ Journal data loaded successfully');
        console.log(`📊 Total entries: ${journalData.entries ? journalData.entries.length : 0}`);
        console.log(`📅 First entry: ${journalData.entries?.[0]?.creationDate || 'N/A'}`);
        console.log(`📅 Last entry: ${journalData.entries?.[journalData.entries.length - 1]?.creationDate || 'N/A'}`);
        
        const processed = processEntries(journalData.entries);
        setEntries(processed);
        setFilteredEntries(processed);
        
        // If an entry ID was provided in the URL, find and select that entry
        if (entryIdFromUrl) {
          const entryFromUrl = processed.find(entry => entry.uuid === entryIdFromUrl);
          if (entryFromUrl) {
            setSelectedEntry(entryFromUrl);
          }
        }
      } catch (error) {
        console.error('Error loading journal data:', error);
      }
    };
    
    loadJournalData();
    
    // TODO: Load grid mapping from storage or API
    // For now we'll use an empty object
  }, [entryIdFromUrl]);

  /**
   * Apply active filters to produce filtered entries
   * This is now implemented as a useMemo for better performance
   * Uses the shared filterUtils for better consistency
   */
  useMemo(() => {
    // Skip if entries array is empty (initial load)
    if (entries.length === 0) return;

    // Measure performance of filter operation
    const startTime = performance.now();
    
    // Validate filters before applying
    const validationResult = validateFilters(filters, entries);
    if (!validationResult.isValid) {
      logValidation('applyFilters', validationResult);
    }
    
    // Apply all active filters using the utility function
    const filtered = applyFilters(entries, filters);
    
    // Log the filter result
    logFilterResult(filtered, entries, filters);
    
    // Update filtered entries
    setFilteredEntries(filtered);
    
    // Calculate and store performance metrics
    const endTime = performance.now();
    const filterTime = endTime - startTime;
    
    // Log performance metrics
    logPerformance(filterTime, 'applyFilters');
    
    // Update performance metrics state
    setFilterPerformance(prev => {
      const newCount = prev.filterCount + 1;
      const newAverage = (prev.averageFilterTime * prev.filterCount + filterTime) / newCount;
      
      return {
        lastFilterTime: filterTime,
        averageFilterTime: newAverage,
        filterCount: newCount
      };
    });
  }, [filters, entries]);
  
  /**
   * Get entries filtered by everything except one dimension
   * Uses the shared filterUtils for better consistency
   * 
   * @param {string} excludeDimension - The dimension to exclude from filtering
   * @param {boolean} showOnlyFilteredForOwn - If true, will apply the filter for the excluded dimension as well
   * @returns {Array} - Filtered entries
   */
  const getEntriesFilteredExcept = useCallback((excludeDimension, showOnlyFilteredForOwn = false) => {
    // Input validation
    if (!isValidDimension(excludeDimension)) {
      logValidation('getEntriesFilteredExcept', { 
        isValid: false, 
        issues: [{ message: `Invalid dimension: ${excludeDimension}` }] 
      });
      return [...entries]; // Return unfiltered data as fallback
    }
    
    // Measure performance
    const startTime = performance.now();
    
    let result;
    
    // If showing only filtered results for own dimension,
    // then don't exclude any dimensions - apply all filters
    if (showOnlyFilteredForOwn) {
      result = applyFilters(entries, filters);
    } else {
      // Otherwise, apply all filters except the excluded dimension
      result = applyFiltersExcept(entries, filters, excludeDimension);
    }
    
    // Calculate performance metrics
    const endTime = performance.now();
    const filterTime = endTime - startTime;
    
    // Log performance if significant
    if (filterTime > 10) {
      logPerformance(filterTime, `getEntriesFilteredExcept(${excludeDimension}, ${showOnlyFilteredForOwn})`);
    }
    
    // For debugging, count applied filters
    const appliedFilters = Object.keys(filters).filter(dim => 
      dim !== excludeDimension && filters[dim]);
      
    // Only log when there's something interesting to log
    if (appliedFilters.length > 0) {
      logFilterResult(
        result, 
        entries, 
        showOnlyFilteredForOwn ? filters : appliedFilters.reduce((acc, dim) => {
          acc[dim] = filters[dim];
          return acc;
        }, {})
      );
    }
    
    return result;
  }, [entries, filters]);

  /**
   * Save current filter state to history
   * Enhanced with metadata tracking
   * @private
   * @param {Object} metadata - Optional metadata about the filter operation
   */
  const saveFilterHistory = (metadata = null) => {
    // Get the current filters and sources
    const historyEntry = {
      filters: { ...filters },
      sources: { ...filterSources },
      metadata: metadata ? { ...metadata } : null,
      timestamp: Date.now()
    };
    
    // If we're not at the end of history, truncate
    const newHistory = filterHistory.slice(0, historyIndex + 1);
    
    // Add the new entry and update the index
    setFilterHistory([...newHistory, historyEntry]);
    setHistoryIndex(newHistory.length);
  };

  /**
   * Set filter for a specific dimension
   * Enhanced with better validation, history tracking, and metadata
   * 
   * @param {string} dimension - The dimension to filter by (type, region, quarter, search)
   * @param {string} value - The value to filter for
   * @param {string} source - The source of the filter (which chart or control)
   * @param {string} eventType - The type of event that triggered this filter
   * @returns {boolean} - True if filter was changed, false otherwise
   */
  const setFilter = useCallback((dimension, value, source = null, eventType = FilterTypes.EVENT.CLICK) => {
    // Input validation
    if (!isValidDimension(dimension)) {
      console.warn(`Invalid dimension: ${dimension}. Must be one of: type, region, quarter, search`);
      return false;
    }
    
    // Determine operation type and create metadata
    let operationType;
    if (value === filters[dimension]) {
      operationType = FilterTypes.OPERATION.REMOVE;
    } else {
      operationType = filters[dimension] ? 
        FilterTypes.OPERATION.UPDATE : 
        FilterTypes.OPERATION.ADD;
    }
    
    // Create metadata for this filter operation
    const metadata = createFilterMetadata(
      dimension,
      value,
      operationType,
      source,
      eventType
    );
    
    // Save current state to history with metadata before making changes
    saveFilterHistory(metadata);
    
    // Validate the filter value before applying
    const sanitizedValue = sanitizeFilterValue(dimension, value);
    if (sanitizedValue === null && value !== null) {
      logValidation('setFilter', { 
        isValid: false, 
        issues: [{ message: `Invalid value for ${dimension}: ${value}` }] 
      });
      return false;
    }
    
    // Log the filter change
    logFilterChange(
      value === filters[dimension] ? 'Remove' : 'Set', 
      { [dimension]: value }, 
      { [dimension]: filters[dimension] }
    );
    
    logFilterMetadata(metadata);
    
    // If toggling off, remove the filter
    if (value === filters[dimension]) {
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
      
      // Remove metadata for this dimension
      setFilterMetadata(prev => {
        const newMetadata = {...prev};
        delete newMetadata[dimension];
        return newMetadata;
      });
    } else {
      // Otherwise set the filter and track its source
      setFilters(prev => ({
        ...prev,
        [dimension]: sanitizedValue || value
      }));
      
      // Track which chart set this filter
      if (source) {
        setFilterSources(prev => ({
          ...prev,
          [dimension]: source
        }));
      }
      
      // Store metadata for this filter
      setFilterMetadata(prev => ({
        ...prev,
        [dimension]: metadata
      }));
    }
    
    return true;
  }, [filters, saveFilterHistory]);
  
  /**
   * Set filter for multiple dimensions at once (for segment clicks on stacked bars)
   * Enhanced with better validation, history tracking, and metadata
   * 
   * @param {Object} newFilters - Object with dimensions as keys and values to filter by
   * @param {string} source - The source of the filter (which chart or control)
   * @param {string} eventType - The type of event that triggered this filter
   * @returns {boolean} - True if filters were changed, false otherwise
   */
  const setMultiFilter = useCallback((newFilters, source = null, eventType = FilterTypes.EVENT.SELECTION) => {
    // Input validation
    if (!newFilters || typeof newFilters !== 'object' || Object.keys(newFilters).length === 0) {
      console.warn('Invalid filters object provided to setMultiFilter');
      return false;
    }
    
    // Validate each dimension using the utility function
    const invalidDimensions = Object.keys(newFilters).filter(dim => !isValidDimension(dim));
    
    if (invalidDimensions.length > 0) {
      console.warn(`Invalid dimensions in setMultiFilter: ${invalidDimensions.join(', ')}`);
      return false;
    }
    
    // Create a combined metadata object for all dimensions
    const combinedMetadata = {
      dimensions: Object.keys(newFilters),
      values: Object.values(newFilters),
      operation: FilterTypes.OPERATION.ADD,
      source,
      event: eventType,
      timestamp: Date.now(),
      isMulti: true
    };
    
    // Save current state to history with metadata before making changes
    saveFilterHistory(combinedMetadata);
    
    // Sanitize all filter values
    const sanitizedFilters = {};
    Object.entries(newFilters).forEach(([dim, val]) => {
      sanitizedFilters[dim] = sanitizeFilterValue(dim, val) || val;
    });
    
    // Log the filter change and metadata
    logFilterChange('SetMulti', sanitizedFilters, filters);
    logFilterMetadata(combinedMetadata);
    
    // Update all the specified filters
    setFilters(prev => {
      const result = {
        ...prev,
        ...sanitizedFilters
      };
      return result;
    });
    
    // Track sources and metadata for all dimensions
    const newSources = {};
    const newMetadataEntries = {};
    
    Object.entries(newFilters).forEach(([dimension, value]) => {
      if (source) {
        newSources[dimension] = source;
      }
      
      // Create individual metadata for each dimension
      newMetadataEntries[dimension] = createFilterMetadata(
        dimension,
        value,
        FilterTypes.OPERATION.ADD,
        source,
        eventType
      );
    });
    
    // Update sources
    if (source) {
      setFilterSources(prev => ({
        ...prev,
        ...newSources
      }));
    }
    
    // Update metadata
    setFilterMetadata(prev => ({
      ...prev,
      ...newMetadataEntries
    }));
    
    return true;
  }, [filters, saveFilterHistory]);

  /**
   * Reset all filters
   * Enhanced with history tracking and metadata
   * 
   * @param {string} source - The source of the reset (which control triggered it)
   * @returns {boolean} - True if filters were reset, false otherwise
   */
  const resetFilters = useCallback((source = 'reset-control') => {
    // No need to reset if there are no active filters
    const hasActiveFilters = Object.values(filters).some(val => 
      val !== null && val !== '');
    
    if (!hasActiveFilters) {
      console.log('No active filters to reset');
      return false;
    }
    
    // Create metadata for the reset operation
    const resetMetadata = {
      operation: FilterTypes.OPERATION.RESET,
      source,
      event: FilterTypes.EVENT.RESET,
      timestamp: Date.now(),
      previousFilters: { ...filters }
    };
    
    // Save current state to history with metadata before making changes
    saveFilterHistory(resetMetadata);
    
    // Reset to initial state
    setFilters({
      type: null,
      region: null,
      quarter: null,
      search: '',
      geo: null
    });
    
    // Clear all filter sources and metadata
    setFilterSources({});
    setFilterMetadata({});
    
    // Log the reset operation
    logFilterChange('Reset', {}, filters);
    logFilterMetadata(resetMetadata);
    return true;
  }, [filters, saveFilterHistory]);
  
  /**
   * Undo the last filter change
   * @returns {boolean} - True if undo was successful, false otherwise
   */
  const undoFilterChange = () => {
    // Check if we can undo
    if (historyIndex <= 0) {
      console.log('Nothing to undo');
      return false;
    }
    
    // Go back one step in history
    const previousState = filterHistory[historyIndex - 1];
    setFilters(previousState.filters);
    setFilterSources(previousState.sources);
    setHistoryIndex(historyIndex - 1);
    
    console.log('Undo to previous filter state:', previousState);
    return true;
  };
  
  /**
   * Redo the last undone filter change
   * @returns {boolean} - True if redo was successful, false otherwise
   */
  const redoFilterChange = () => {
    // Check if we can redo
    if (historyIndex >= filterHistory.length - 1) {
      console.log('Nothing to redo');
      return false;
    }
    
    // Go forward one step in history
    const nextState = filterHistory[historyIndex + 1];
    setFilters(nextState.filters);
    setFilterSources(nextState.sources);
    setHistoryIndex(historyIndex + 1);
    
    console.log('Redo to next filter state:', nextState);
    return true;
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

  /**
   * Check if a specific filter is active
   * @param {string} dimension - The dimension to check
   * @returns {boolean} - True if filter is active, false otherwise
   */
  const hasActiveFilter = (dimension) => {
    if (!isValidDimension(dimension)) {
      return false;
    }
    
    if (dimension === 'search') {
      return !!filters.search && filters.search.length > 0;
    }
    
    return filters[dimension] !== null;
  };
  
  /**
   * Get all active filters as an object
   * @returns {Object} - Object with active filters
   */
  const getActiveFilters = () => {
    const active = {};
    
    if (filters.type) active.type = filters.type;
    if (filters.region) active.region = filters.region;
    if (filters.quarter) active.quarter = filters.quarter;
    if (filters.search) active.search = filters.search;
    
    return active;
  };
  
  /**
   * Get count of active filters
   * @returns {number} - Number of active filters
   */
  const getActiveFilterCount = () => {
    return Object.keys(getActiveFilters()).length;
  };

  // Get description for current filters
  const getFilterDescriptions = useCallback(() => {
    return Object.entries(filterMetadata).map(([dimension, metadata]) => {
      return {
        dimension,
        description: getFilterDescription(metadata)
      };
    });
  }, [filterMetadata]);

  // Check if there are any performance issues with filters
  const hasPerformanceIssues = useMemo(() => {
    return filterPerformance.lastFilterTime > 100; // Consider filters taking >100ms as slow
  }, [filterPerformance]);

  return (
    <DataContext.Provider
      value={{
        // Data access
        allEntries: entries,
        entries: filteredEntries,
        
        // Filter state
        filters,
        filterSources,
        filterMetadata,
        filterPerformance,
        
        // Filter operations
        setFilter,
        setMultiFilter,
        resetFilters,
        undoFilterChange,
        redoFilterChange,
        
        // Filter utilities
        hasActiveFilter,
        getActiveFilters,
        getActiveFilterCount,
        getFilterDescriptions,
        getEntriesFilteredExcept,
        formatFilterValue,
        getDimensionDisplayName,
        hasPerformanceIssues,
        
        // Entry manipulation
        selectedEntry,
        setSelectedEntry,
        getEntryByUUID,
        
        // Grid functionality
        getGridPositionByUUID,
        setGridPositionForUUID,
        highlightTypeOnGrid
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