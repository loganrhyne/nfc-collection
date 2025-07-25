// Utility functions for processing journal data

/**
 * Extracts type and region from tags array
 * @param {Array} tags - Array of tags in format "Type: X" or "Region: Y"
 * @returns {Object} - Object with type and region properties
 */
export const extractTypeAndRegion = (tags = []) => {
  let type = '';
  let region = '';
  
  if (!tags || !Array.isArray(tags)) return { type, region };
  
  tags.forEach(tag => {
    if (tag.startsWith('Type:')) {
      type = tag.replace('Type:', '').trim();
    } else if (tag.startsWith('Region:')) {
      region = tag.replace('Region:', '').trim();
    }
  });
  
  return { type, region };
};

/**
 * Process journal entries to add derived data
 * @param {Array} entries - Raw journal entries
 * @returns {Array} - Processed entries with additional properties
 */
export const processEntries = (entries = []) => {
  if (!entries || !Array.isArray(entries)) return [];
  
  return entries.map(entry => {
    const { type, region } = extractTypeAndRegion(entry.tags);
    const date = new Date(entry.creationDate);
    
    // Calculate quarter for timeline chart
    const quarter = `Q${Math.floor((date.getMonth() / 3) + 1)}-${date.getFullYear()}`;
    
    return {
      ...entry,
      type,
      region,
      quarter,
      date,
      // Extract title from the first h1 in richText or use placeholder
      title: entry.text?.split('\n')[0]?.replace('# ', '') || 'Untitled Entry'
    };
  });
};

/**
 * Group entries by a specific property
 * @param {Array} entries - Processed journal entries
 * @param {String} property - Property to group by (e.g., 'type', 'region', 'quarter')
 * @returns {Object} - Entries grouped by property
 */
export const groupEntriesBy = (entries, property) => {
  if (!entries || !Array.isArray(entries)) return {};
  
  return entries.reduce((acc, entry) => {
    const key = entry[property] || 'Unknown';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(entry);
    return acc;
  }, {});
};

/**
 * Get counts of entries by a specific property
 * @param {Array} entries - Processed journal entries
 * @param {String} property - Property to count by (e.g., 'type', 'region')
 * @returns {Array} - Array of {name, count} objects
 */
export const getCountsByProperty = (entries, property) => {
  if (!entries || !Array.isArray(entries)) return [];
  
  const grouped = groupEntriesBy(entries, property);
  return Object.keys(grouped).map(key => ({
    name: key,
    count: grouped[key].length
  }));
};

/**
 * Get nested counts for region with breakdown by type
 * @param {Array} entries - Processed journal entries
 * @returns {Array} - Array with region counts broken down by type
 */
export const getRegionCountsWithTypeSeries = (entries) => {
  if (!entries || !Array.isArray(entries)) return [];
  
  const regionGroups = groupEntriesBy(entries, 'region');
  
  return Object.keys(regionGroups).map(region => {
    const regionEntries = regionGroups[region];
    const typeGroups = groupEntriesBy(regionEntries, 'type');
    
    // Create an object with region name and type counts
    const result = { name: region };
    
    // Add each type count to the result object
    Object.keys(typeGroups).forEach(type => {
      result[type] = typeGroups[type].length;
    });
    
    return result;
  });
};

/**
 * Get counts by quarter with breakdown by type
 * @param {Array} entries - Processed journal entries 
 * @returns {Array} - Array with quarter counts broken down by type
 */
export const getQuarterCountsWithTypeSeries = (entries) => {
  if (!entries || !Array.isArray(entries)) return [];
  
  // Sort entries by date first
  const sortedEntries = [...entries].sort((a, b) => a.date - b.date);
  
  const quarterGroups = groupEntriesBy(sortedEntries, 'quarter');
  
  return Object.keys(quarterGroups).map(quarter => {
    const quarterEntries = quarterGroups[quarter];
    const typeGroups = groupEntriesBy(quarterEntries, 'type');
    
    // Create an object with quarter name and type counts
    const result = { name: quarter };
    
    // Add each type count to the result object
    Object.keys(typeGroups).forEach(type => {
      result[type] = typeGroups[type].length;
    });
    
    return result;
  }).sort((a, b) => {
    // Ensure proper sorting by year and quarter
    const [qa, ya] = a.name.split('-');
    const [qb, yb] = b.name.split('-');
    return ya !== yb ? ya - yb : qa.localeCompare(qb);
  });
};