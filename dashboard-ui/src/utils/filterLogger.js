/**
 * Logger utilities for filter operations
 * 
 * This module provides controlled logging for filter operations.
 * It allows for enabling/disabling different types of logs and provides
 * consistent formatting for filter-related logging.
 */

// Configuration for the logger
const config = {
  // Whether logging is enabled at all
  enabled: process.env.NODE_ENV !== 'production',
  
  // Specific log types that can be enabled/disabled
  logTypes: {
    filterChange: true,       // Log when filters change
    filterResult: true,       // Log the results of filter operations
    performance: true,        // Log performance metrics
    filterMetadata: false,    // Log detailed filter metadata
    filterHistory: false,     // Log filter history changes
    validation: true          // Log validation issues
  },
  
  // Minimum log level to show (0=debug, 1=info, 2=warn, 3=error)
  minLevel: process.env.NODE_ENV === 'production' ? 2 : 0
};

// Log level definitions
const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

/**
 * Enable or disable specific log types
 * @param {Object} logTypes - Object with log type keys and boolean values
 */
export const configureLogger = (logTypes) => {
  if (!logTypes || typeof logTypes !== 'object') return;
  
  Object.entries(logTypes).forEach(([key, value]) => {
    if (key in config.logTypes && typeof value === 'boolean') {
      config.logTypes[key] = value;
    }
  });
};

/**
 * Set the minimum log level
 * @param {number} level - Minimum log level (0=debug, 1=info, 2=warn, 3=error)
 */
export const setLogLevel = (level) => {
  if (typeof level === 'number' && level >= 0 && level <= 3) {
    config.minLevel = level;
  }
};

/**
 * Enable or disable all logging
 * @param {boolean} enabled - Whether logging is enabled
 */
export const setLoggingEnabled = (enabled) => {
  config.enabled = enabled;
};

/**
 * Format a log message with a prefix indicating the log type
 * @param {string} type - The log type
 * @param {string} message - The log message
 * @returns {string} - Formatted log message
 */
const formatLogMessage = (type, message) => {
  return `[Filter:${type}] ${message}`;
};

/**
 * Internal log function that respects configuration
 * @param {number} level - The log level
 * @param {string} type - The log type
 * @param {string} message - The log message
 * @param {...any} args - Additional arguments to log
 */
const log = (level, type, message, ...args) => {
  if (!config.enabled || level < config.minLevel) return;
  if (type in config.logTypes && !config.logTypes[type]) return;
  
  const formattedMessage = formatLogMessage(type, message);
  
  switch (level) {
    case LOG_LEVEL.DEBUG:
      console.debug(formattedMessage, ...args);
      break;
    case LOG_LEVEL.INFO:
      console.log(formattedMessage, ...args);
      break;
    case LOG_LEVEL.WARN:
      console.warn(formattedMessage, ...args);
      break;
    case LOG_LEVEL.ERROR:
      console.error(formattedMessage, ...args);
      break;
  }
};

/**
 * Log filter changes
 * @param {string} operation - The operation being performed
 * @param {Object} filters - The current filters
 * @param {Object} previousFilters - The previous filters
 */
export const logFilterChange = (operation, filters, previousFilters) => {
  log(
    LOG_LEVEL.INFO, 
    'filterChange',
    `${operation} filters:`, 
    { current: filters, previous: previousFilters }
  );
};

/**
 * Log filter results
 * @param {Array} filtered - The filtered entries
 * @param {Array} original - The original entries
 * @param {Object} filters - The filters applied
 */
export const logFilterResult = (filtered, original, filters) => {
  log(
    LOG_LEVEL.DEBUG, 
    'filterResult',
    `Filter result: ${filtered.length}/${original.length} entries match filters:`,
    filters
  );
};

/**
 * Log performance metrics
 * @param {number} time - The time taken for the operation
 * @param {string} operation - The operation performed
 */
export const logPerformance = (time, operation) => {
  const level = time > 100 ? LOG_LEVEL.WARN : LOG_LEVEL.DEBUG;
  
  log(
    level,
    'performance',
    `${operation} took ${time.toFixed(2)}ms`
  );
};

/**
 * Log filter metadata
 * @param {Object} metadata - The filter metadata
 */
export const logFilterMetadata = (metadata) => {
  log(
    LOG_LEVEL.DEBUG,
    'filterMetadata',
    'Filter metadata:',
    metadata
  );
};

/**
 * Log filter history changes
 * @param {Array} history - The filter history
 * @param {number} index - The current index in history
 */
export const logFilterHistory = (history, index) => {
  log(
    LOG_LEVEL.DEBUG,
    'filterHistory',
    `Filter history (${index + 1}/${history.length})`,
    history
  );
};

/**
 * Log validation issues
 * @param {string} operation - The operation that triggered validation
 * @param {Object} validationResult - The validation result
 */
export const logValidation = (operation, validationResult) => {
  if (!validationResult.isValid) {
    log(
      LOG_LEVEL.WARN,
      'validation',
      `Validation issues during ${operation}:`,
      validationResult.issues
    );
  }
};

// Export the logger config for testing
export const getLoggerConfig = () => ({ ...config });