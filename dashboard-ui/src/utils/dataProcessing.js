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
 * @returns {Array} - Array with quarter counts broken down by type, including empty quarters
 */
export const getQuarterCountsWithTypeSeries = (entries) => {
  if (!entries || !Array.isArray(entries)) return [];
  
  // Sort entries by date first
  const sortedEntries = [...entries].sort((a, b) => a.date - b.date);
  
  const quarterGroups = groupEntriesBy(sortedEntries, 'quarter');
  
  // Get all types for the legend
  const allTypes = [...new Set(entries.map(entry => entry.type).filter(Boolean))];
  
  // Find the earliest and latest quarters
  let minYear = 9999, maxYear = 0;
  let minQuarter = 'Q4', maxQuarter = 'Q1';
  
  Object.keys(quarterGroups).forEach(quarter => {
    const [q, y] = quarter.split('-');
    const year = parseInt(y);
    
    if (year < minYear || (year === minYear && q < minQuarter)) {
      minYear = year;
      minQuarter = q;
    }
    
    if (year > maxYear || (year === maxYear && q > maxQuarter)) {
      maxYear = year;
      maxQuarter = q;
    }
  });
  
  // Generate all quarters between min and max
  const allQuarters = [];
  for (let year = minYear; year <= maxYear; year++) {
    for (let q = 1; q <= 4; q++) {
      const quarterKey = `Q${q}`;
      
      // Skip quarters before the min or after the max
      if (
        (year === minYear && quarterKey < minQuarter) || 
        (year === maxYear && quarterKey > maxQuarter)
      ) {
        continue;
      }
      
      const fullQuarterKey = `${quarterKey}-${year}`;
      const displayName = `${quarterKey} ${year}`;
      
      const quarterData = {
        name: displayName,
        rawQuarter: fullQuarterKey
      };
      
      // Initialize all types to zero
      allTypes.forEach(type => {
        quarterData[type] = 0;
      });
      
      // Fill in actual data if it exists
      if (quarterGroups[fullQuarterKey]) {
        const typeGroups = groupEntriesBy(quarterGroups[fullQuarterKey], 'type');
        
        Object.keys(typeGroups).forEach(type => {
          quarterData[type] = typeGroups[type].length;
        });
      }
      
      allQuarters.push(quarterData);
    }
  }
  
  // Sort by year and quarter
  return allQuarters.sort((a, b) => {
    const [qa, ya] = a.rawQuarter.split('-');
    const [qb, yb] = b.rawQuarter.split('-');
    return parseInt(ya) !== parseInt(yb) ? 
      parseInt(ya) - parseInt(yb) : 
      parseInt(qa.substring(1)) - parseInt(qb.substring(1));
  });
};