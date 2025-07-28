/**
 * Debug utilities for the application
 */

/**
 * Logs information about the environment and paths
 */
export const logEnvironmentInfo = () => {
  console.group('🔍 Environment Information');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PUBLIC_URL:', process.env.PUBLIC_URL || '(not set)');
  console.log('Base URL:', window.location.origin);
  console.log('Current Path:', window.location.pathname);
  
  // Log browser information
  console.log('User Agent:', navigator.userAgent);
  console.groupEnd();
};

/**
 * Add a message to the debug console
 * 
 * @param {string} message - The message to log
 * @param {object} data - Optional data to log
 */
export const logDebug = (message, data = null) => {
  if (data) {
    console.log(`🔍 DEBUG: ${message}`, data);
  } else {
    console.log(`🔍 DEBUG: ${message}`);
  }
};

export default {
  logEnvironmentInfo,
  logDebug
};