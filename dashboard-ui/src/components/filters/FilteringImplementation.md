# Dashboard Filtering Implementation

## Overview

The dashboard filtering system has been redesigned to implement a proper compound filtering approach, where each chart displays data filtered by other dimensions while still showing the full range of its own dimension. This creates a powerful drill-down experience where users can progressively add filters to narrow down the data displayed across all dashboard components.

The system now supports both single-dimension filtering (clicking on chart bars) and multi-dimension filtering (clicking on segments within stacked bars) to provide maximum flexibility in data exploration.

## Key Concepts

### 1. Filter Context

The filter state is managed centrally in the `DataContext`, which tracks active filters for:
- Type (sand type)
- Region (geographic region)
- Quarter (time period)
- Search (text search)

### 2. Dimension-Specific Filtering

Each chart component now receives data that is:
- Filtered by all other active dimensions
- NOT filtered by its own dimension

This enables each chart to show the complete distribution for its dimension while respecting other active filters.

### 3. Additive Filtering

Filters are cumulative - selecting a type and then a region will show data matching BOTH criteria. This allows for progressive drill-down through the dataset.

### 4. Multi-Dimension Selection

Stacked bar charts (Region and Timeline) now support segment selection, which allows users to filter by both the bar's dimension (region/quarter) AND the segment's dimension (type) simultaneously. This enables precise data selection with a single click.

### 5. Filter Toggling

Any active filter can be toggled off by clicking it again, which will remove that particular constraint while maintaining others.

### 6. Filter Source Tracking

The system now tracks which chart component applied each filter, providing visual feedback about the source of each active filter in the UI.

## Implementation Details

### DataContext Enhancements

The core of the filtering system includes several key components in `DataContext.js`:

#### 1. Filtered Data Access with Self-Filtering Mode

A key feature of the filtering system is the ability for charts to show either:
- All possible values for their dimension (ignoring their own dimension's filter)
- Only the currently filtered value for their dimension (applying their own filter)

This is controlled through the `showOnlyFilteredForOwn` parameter:

```javascript
/**
 * Get entries filtered by everything except one dimension
 * @param {string} excludeDimension - The dimension to exclude from filtering
 * @param {boolean} showOnlyFilteredForOwn - If true, will apply the filter for the excluded dimension as well
 * @returns {Array} - Filtered entries
 */
const getEntriesFilteredExcept = (excludeDimension, showOnlyFilteredForOwn = false) => {
  let filtered = [...entries];
  
  // Apply all filters except the excluded dimension (unless showOnlyFilteredForOwn is true)
  if ((excludeDimension !== 'type' || showOnlyFilteredForOwn) && filters.type) {
    filtered = filtered.filter(entry => entry.type === filters.type);
  }
  
  if ((excludeDimension !== 'region' || showOnlyFilteredForOwn) && filters.region) {
    filtered = filtered.filter(entry => entry.region === filters.region);
  }
  
  if ((excludeDimension !== 'quarter' || showOnlyFilteredForOwn) && filters.quarter) {
    filtered = filtered.filter(entry => entry.quarter === filters.quarter);
  }
  
  if ((excludeDimension !== 'search' || showOnlyFilteredForOwn) && filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(entry => 
      entry.title?.toLowerCase().includes(searchLower) || 
      entry.text?.toLowerCase().includes(searchLower)
    );
  }
  
  return filtered;
};
```

This function allows each chart to get data that respects all filters except its own dimension.

#### 2. Multi-dimension Filter Support

```javascript
// Set filter for multiple dimensions at once (for segment clicks on stacked bars)
const setMultiFilter = (filters, source = null) => {
  // Update all the specified filters
  setFilters(prev => ({
    ...prev,
    ...filters
  }));
  
  // Track sources for all dimensions
  if (source) {
    const newSources = {};
    Object.keys(filters).forEach(dimension => {
      newSources[dimension] = source;
    });
    
    setFilterSources(prev => ({
      ...prev,
      ...newSources
    }));
  }
};
```

#### 3. Filter Source Tracking

```javascript
// Track which chart set each filter to better communicate the source
const [filterSources, setFilterSources] = useState({});
```

### Chart Component Changes

Each chart component now uses the filtered data specific to its needs, with intelligent handling of its own dimension's filter state:

```javascript
// TypeBarChart.js - showing only filtered type when a type filter is active
const showSingleType = !!filters.type;
const entriesForChart = getEntriesFilteredExcept('type', showSingleType);

// RegionBarChart.js - showing only filtered region when a region filter is active
const showSingleRegion = !!filters.region;
const entriesForChart = getEntriesFilteredExcept('region', showSingleRegion);

// TimelineChart.js - showing only filtered quarter when a quarter filter is active 
const showSingleQuarter = !!filters.quarter;
const entriesForChart = getEntriesFilteredExcept('quarter', showSingleQuarter);
```

### Enhanced Active Filters UI

An improved `ActiveFilters` component visually displays the currently active filters with additional context:
- See which filters are currently applied
- Visual indicators for filter dimensions (icons)
- Source tracking to show which chart applied each filter
- Remove individual filters by clicking on them
- Clear all filters at once

## User Experience Benefits

1. **Intuitive Exploration**: Users can naturally drill down into the data by applying multiple filters
2. **Progressive Discovery**: Each selection narrows the data while still showing all possibilities for the next selection
3. **Immediate Feedback**: All visualizations update instantly to reflect the current filter state
4. **Reversible Actions**: Any filter can be easily removed or toggled
5. **Filter Visibility**: Active filters are clearly displayed and can be managed directly

## Future Enhancements

1. **Filter Presets**: Allow saving and loading of common filter combinations
2. **URL Parameter Integration**: Encode filter state in URL to enable bookmarking and sharing
3. **Filter History**: Implement undo/redo for filter actions
4. **Advanced Filtering**: Support more complex filter conditions (AND/OR logic between dimensions)
5. **Filter Analytics**: Track which filters are commonly used together to improve the interface
6. **Feedback Visualization**: Show visual cues in charts to indicate which elements contributed to current filters
7. **Filter Dependencies**: Implement more sophisticated handling of interdependent filters
8. **Filter Impact Preview**: Show preview of how many items would match if a filter was applied