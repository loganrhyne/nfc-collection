/**
 * Utility functions for filtering operations
 */

/**
 * Valid dimensions for filtering
 */
export const FILTER_DIMENSIONS = ['type', 'region', 'quarter', 'search', 'geo'];

/**
 * Check if a dimension is valid for filtering
 * @param {string} dimension - The dimension to check
 * @returns {boolean} - True if the dimension is valid, false otherwise
 */
export const isValidDimension = (dimension) => {
  return FILTER_DIMENSIONS.includes(dimension);
};

/**
 * Apply a single filter to an array of entries
 * @param {Array} entries - The entries to filter
 * @param {string} dimension - The dimension to filter by
 * @param {string} value - The value to filter for
 * @returns {Array} - Filtered entries
 */
export const applyFilter = (entries, dimension, value) => {
  if (!entries || !Array.isArray(entries)) return [];
  if (!isValidDimension(dimension)) return entries;
  if (!value) return entries;
  
  switch (dimension) {
    case 'type':
      return entries.filter(entry => entry.type === value);
    
    case 'region':
      return entries.filter(entry => entry.region === value);
    
    case 'quarter':
      return entries.filter(entry => entry.quarter === value);
    
    case 'search':
      const searchLower = value.toLowerCase();
      return entries.filter(entry => 
        entry.title?.toLowerCase().includes(searchLower) || 
        entry.text?.toLowerCase().includes(searchLower)
      );
    
    case 'geo':
      // Filter entries by geographic bounds
      if (!value || typeof value !== 'object') return entries;
      const { south, west, north, east } = value;
      if (typeof south !== 'number' || typeof west !== 'number' || 
          typeof north !== 'number' || typeof east !== 'number') return entries;

      // Filter entries that have valid locations within the bounds
      return entries.filter(entry => {
        if (!entry.location || typeof entry.location.latitude !== 'number' || 
            typeof entry.location.longitude !== 'number') {
          return false;
        }
        
        const lat = entry.location.latitude;
        const lng = entry.location.longitude;
        
        return lat >= south && lat <= north && lng >= west && lng <= east;
      });
    
    default:
      return entries;
  }
};

/**
 * Apply multiple filters to an array of entries
 * @param {Array} entries - The entries to filter
 * @param {Object} filters - Object with dimensions as keys and values to filter by
 * @returns {Array} - Filtered entries
 */
export const applyFilters = (entries, filters) => {
  if (!entries || !Array.isArray(entries)) return [];
  if (!filters || typeof filters !== 'object') return entries;
  
  let filtered = [...entries];
  
  // Apply each active filter in sequence
  Object.entries(filters).forEach(([dimension, value]) => {
    if (value) {
      filtered = applyFilter(filtered, dimension, value);
    }
  });
  
  return filtered;
};

/**
 * Apply all filters except the specified dimension
 * @param {Array} entries - The entries to filter
 * @param {Object} filters - Object with all filters
 * @param {string} excludeDimension - The dimension to exclude from filtering
 * @returns {Array} - Filtered entries
 */
export const applyFiltersExcept = (entries, filters, excludeDimension) => {
  if (!entries || !Array.isArray(entries)) return [];
  if (!filters || typeof filters !== 'object') return entries;
  if (!isValidDimension(excludeDimension)) return applyFilters(entries, filters);
  
  // Create a new filters object without the excluded dimension
  const applicableFilters = { ...filters };
  delete applicableFilters[excludeDimension];
  
  return applyFilters(entries, applicableFilters);
};

/**
 * Format a filter value for display
 * @param {string} dimension - The filter dimension
 * @param {string} value - The filter value
 * @returns {string} - Formatted display value
 */
export const formatFilterValue = (dimension, value) => {
  if (!value) return '';
  
  switch (dimension) {
    case 'quarter':
      // Quarter values are stored as "Q1-2019" but displayed as "Q1 2019"
      return value.replace('-', ' ');
      
    case 'search':
      // For search, add quotes around the search term
      return `"${value}"`;
    
    case 'geo':
      // For geographic filter, just return a simple indicator
      return 'Selected Area';
      
    default:
      return value;
  }
};

/**
 * Get a human-readable name for a filter dimension
 * @param {string} dimension - The filter dimension
 * @returns {string} - Display name
 */
export const getDimensionDisplayName = (dimension) => {
  switch (dimension) {
    case 'type':
      return 'Type';
    case 'region':
      return 'Region';
    case 'quarter':
      return 'Quarter';
    case 'search':
      return 'Search';
    case 'geo':
      return 'Map Area';
    default:
      return dimension;
  }
};