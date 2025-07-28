/**
 * Utility for checking file existence and diagnosing path issues
 */

/**
 * Check if a file exists by attempting to fetch it
 * 
 * @param {string} url - URL to check
 * @returns {Promise<boolean>} - True if file exists
 */
export const checkFileExists = async (url) => {
  try {
    console.log(`🔍 Checking if file exists at: ${url}`);
    const response = await fetch(url, { method: 'HEAD' });
    
    if (response.ok) {
      console.log(`✅ File exists at: ${url}`);
      return true;
    } else {
      console.error(`❌ File not found at: ${url} (${response.status}: ${response.statusText})`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error checking file at: ${url}`, error);
    return false;
  }
};

/**
 * Attempt to fetch a file with different relative paths to diagnose path issues
 * 
 * @param {string} basePath - Base file path (without leading slash)
 */
export const diagnosePaths = async (basePath) => {
  if (basePath.startsWith('/')) {
    basePath = basePath.substring(1);
  }
  
  console.group(`🔍 Diagnosing paths for: ${basePath}`);
  
  // Try different path variations
  const pathVariations = [
    `/${basePath}`,                  // /data/photos/file.jpg
    `/dashboard-ui/${basePath}`,     // /dashboard-ui/data/photos/file.jpg
    `/${basePath}`,                  // /data/photos/file.jpg
    `/public/${basePath}`,           // /public/data/photos/file.jpg
    `../${basePath}`                 // ../data/photos/file.jpg
  ];
  
  for (const path of pathVariations) {
    await checkFileExists(path);
  }
  
  console.groupEnd();
};

export default {
  checkFileExists,
  diagnosePaths
};