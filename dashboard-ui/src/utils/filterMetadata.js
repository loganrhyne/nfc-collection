/**
 * Metadata enrichment for filter operations
 */

/**
 * Type definitions for filter metadata
 */
const FilterTypes = {
  // Filter operation types
  OPERATION: {
    ADD: 'add',
    REMOVE: 'remove',
    TOGGLE: 'toggle',
    UPDATE: 'update',
    RESET: 'reset',
  },
  
  // Filter source types (where the filter was applied from)
  SOURCE: {
    TYPE_CHART: 'type-chart',
    REGION_CHART: 'region-chart',
    REGION_SEGMENT: 'region-chart-segment',
    TIMELINE_CHART: 'timeline-chart',
    TIMELINE_SEGMENT: 'timeline-chart-segment',
    FILTER_CONTROL: 'filter-control',
    SEARCH: 'search-box',
    MAP: 'map-component',
  },

  // Filter event types
  EVENT: {
    CLICK: 'click',
    SEARCH: 'search',
    SELECTION: 'selection',
    RESET: 'reset',
  }
};

/**
 * Creates metadata for a filter operation
 * @param {string} dimension - The dimension being filtered
 * @param {string} value - The filter value
 * @param {string} operation - The operation type (ADD, REMOVE, etc.)
 * @param {string} source - The source of the filter (chart, control, etc.)
 * @param {string} event - The event that triggered the filter (click, search, etc.)
 * @returns {Object} - Filter metadata object
 */
export const createFilterMetadata = (
  dimension, 
  value, 
  operation = FilterTypes.OPERATION.ADD,
  source = FilterTypes.SOURCE.FILTER_CONTROL,
  event = FilterTypes.EVENT.CLICK
) => {
  return {
    dimension,
    value,
    operation,
    source,
    event,
    timestamp: Date.now(),
  };
};

/**
 * Extracts the source type from a source identifier
 * @param {string} source - The source identifier
 * @returns {string} - The source type
 */
export const getSourceType = (source) => {
  if (!source) return 'unknown';
  
  if (source.includes('region-chart')) {
    return source.includes('segment') ? 
      FilterTypes.SOURCE.REGION_SEGMENT : 
      FilterTypes.SOURCE.REGION_CHART;
  }
  
  if (source.includes('timeline-chart')) {
    return source.includes('segment') ? 
      FilterTypes.SOURCE.TIMELINE_SEGMENT : 
      FilterTypes.SOURCE.TIMELINE_CHART;
  }
  
  if (source.includes('type-chart')) {
    return FilterTypes.SOURCE.TYPE_CHART;
  }
  
  if (source.includes('search')) {
    return FilterTypes.SOURCE.SEARCH;
  }
  
  if (source.includes('map')) {
    return FilterTypes.SOURCE.MAP;
  }
  
  return FilterTypes.SOURCE.FILTER_CONTROL;
};

/**
 * Gets a human-readable description of a filter operation
 * @param {Object} metadata - Filter metadata object
 * @returns {string} - Human-readable description
 */
export const getFilterDescription = (metadata) => {
  const { dimension, value, operation, source } = metadata;
  
  if (operation === FilterTypes.OPERATION.RESET) {
    return 'All filters cleared';
  }
  
  if (operation === FilterTypes.OPERATION.REMOVE) {
    return `Removed ${dimension} filter: ${value}`;
  }
  
  // For dimension-specific messages
  switch (dimension) {
    case 'type':
      return `Filtered to show only ${value} samples`;
      
    case 'region':
      return `Filtered to samples from ${value}`;
      
    case 'quarter':
      // Format quarter value for display (Q1-2019 → Q1 2019)
      const displayValue = value.replace('-', ' ');
      return `Filtered to samples from ${displayValue}`;
      
    case 'search':
      return `Search results for "${value}"`;
      
    default:
      return `Applied ${dimension} filter: ${value}`;
  }
};

// Export filter type definitions
export { FilterTypes };