/**
 * Validation utilities for filter operations
 */

import { isValidDimension } from './filterUtils';

/**
 * Validates a filter value based on its dimension
 * @param {string} dimension - The filter dimension
 * @param {string} value - The filter value to validate
 * @returns {boolean} - True if the value is valid, false otherwise
 */
export const isValidFilterValue = (dimension, value) => {
  if (!isValidDimension(dimension)) return false;
  if (value === null || value === undefined) return false;
  
  switch (dimension) {
    case 'type':
    case 'region':
      // Type and region must be non-empty strings
      return typeof value === 'string' && value.trim().length > 0;
      
    case 'quarter':
      // Quarter must be in format "Q1-2019"
      return typeof value === 'string' && 
             /^Q[1-4]-\d{4}$/.test(value);
      
    case 'search':
      // Search can be any non-empty string
      return typeof value === 'string' && value.trim().length > 0;
      
    case 'geo':
      // Geo filter must be an object with south, west, north, east numeric coordinates
      return typeof value === 'object' && 
             value !== null &&
             typeof value.south === 'number' &&
             typeof value.west === 'number' &&
             typeof value.north === 'number' &&
             typeof value.east === 'number';
      
    default:
      return false;
  }
};

/**
 * Validates that a dimension and value pair makes logical sense together
 * @param {string} dimension - The filter dimension
 * @param {string} value - The filter value
 * @param {Array} entries - The entries to check against
 * @returns {Object} - Object with isValid and message properties
 */
export const validateFilterLogic = (dimension, value, entries) => {
  if (!isValidDimension(dimension) || !isValidFilterValue(dimension, value)) {
    return { 
      isValid: false, 
      message: `Invalid filter: ${dimension}=${value}`
    };
  }
  
  // Skip further validation if no entries
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return { isValid: true };
  }
  
  // Check if the filter would return any results
  let matchingEntries = [];
  
  switch (dimension) {
    case 'type':
      matchingEntries = entries.filter(entry => entry.type === value);
      break;
    
    case 'region':
      matchingEntries = entries.filter(entry => entry.region === value);
      break;
    
    case 'quarter':
      matchingEntries = entries.filter(entry => entry.quarter === value);
      break;
    
    case 'search':
      const searchLower = value.toLowerCase();
      matchingEntries = entries.filter(entry => 
        entry.title?.toLowerCase().includes(searchLower) || 
        entry.text?.toLowerCase().includes(searchLower)
      );
      break;
      
    case 'geo':
      // Filter entries by geographic bounds
      const { south, west, north, east } = value;
      
      matchingEntries = entries.filter(entry => {
        if (!entry.location || typeof entry.location.latitude !== 'number' || 
            typeof entry.location.longitude !== 'number') {
          return false;
        }
        
        const lat = entry.location.latitude;
        const lng = entry.location.longitude;
        
        return lat >= south && lat <= north && lng >= west && lng <= east;
      });
      break;
  }
  
  if (matchingEntries.length === 0) {
    return {
      isValid: false,
      message: `Filter would return no results: ${dimension}=${value}`
    };
  }
  
  return { 
    isValid: true, 
    matchCount: matchingEntries.length 
  };
};

/**
 * Validates a complete set of filters
 * @param {Object} filters - The filters to validate
 * @param {Array} entries - The entries to check against
 * @returns {Object} - Object with isValid and issues properties
 */
export const validateFilters = (filters, entries) => {
  if (!filters || typeof filters !== 'object') {
    return { 
      isValid: false, 
      issues: [{ message: 'Filters must be an object' }]
    };
  }
  
  const issues = [];
  
  // Check each filter dimension
  Object.entries(filters).forEach(([dimension, value]) => {
    // Skip null/undefined values (inactive filters)
    if (value === null || value === undefined || value === '') return;
    
    // Check dimension validity
    if (!isValidDimension(dimension)) {
      issues.push({
        dimension,
        message: `Invalid dimension: ${dimension}`
      });
      return;
    }
    
    // Check value validity
    if (!isValidFilterValue(dimension, value)) {
      issues.push({
        dimension,
        value,
        message: `Invalid value for ${dimension}: ${value}`
      });
      return;
    }
    
    // Check logical validity (results exist)
    if (entries && entries.length > 0) {
      const logicCheck = validateFilterLogic(dimension, value, entries);
      if (!logicCheck.isValid) {
        issues.push({
          dimension,
          value,
          message: logicCheck.message
        });
      }
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

/**
 * Sanitizes filter inputs to prevent edge cases and issues
 * @param {string} dimension - The filter dimension
 * @param {string} value - The filter value to sanitize
 * @returns {string|null} - Sanitized value or null if invalid
 */
export const sanitizeFilterValue = (dimension, value) => {
  if (!isValidDimension(dimension)) return null;
  if (value === null || value === undefined) return null;
  
  switch (dimension) {
    case 'type':
    case 'region':
      // Trim whitespace and ensure it's a string
      return typeof value === 'string' ? value.trim() : null;
      
    case 'quarter':
      // Ensure quarter format is correct
      if (typeof value !== 'string') return null;
      const match = value.match(/^Q([1-4])-(\d{4})$/);
      if (!match) return null;
      return value;
      
    case 'search':
      // Trim and sanitize search input
      if (typeof value !== 'string') return null;
      // Remove potentially problematic characters
      return value.trim().replace(/[<>]/g, '');
    
    case 'geo':
      // Validate geo filter object
      if (typeof value !== 'object' || value === null) return null;
      
      // Ensure all required properties are numbers
      const { south, west, north, east } = value;
      if (typeof south !== 'number' || typeof west !== 'number' ||
          typeof north !== 'number' || typeof east !== 'number') {
        return null;
      }
      
      // Validate coordinate ranges
      if (south < -90 || south > 90 || north < -90 || north > 90 ||
          west < -180 || west > 180 || east < -180 || east > 180) {
        return null;
      }
      
      // Ensure south is less than north
      if (south > north) {
        return null;
      }
      
      return { south, west, north, east };
      
    default:
      return null;
  }
};