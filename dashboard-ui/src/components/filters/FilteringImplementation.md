# Dashboard Filtering Implementation

## Overview

The dashboard filtering system has been redesigned to implement a proper compound filtering approach, where each chart displays data filtered by other dimensions while still showing the full range of its own dimension. This creates a powerful drill-down experience where users can progressively add filters to narrow down the data displayed across all dashboard components.

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

### 4. Filter Toggling

Any active filter can be toggled off by clicking it again, which will remove that particular constraint while maintaining others.

## Implementation Details

### DataContext Enhancements

The core of the filtering system is the new `getEntriesFilteredExcept` function in `DataContext.js`:

```javascript
// Get entries filtered by everything except one dimension
const getEntriesFilteredExcept = (excludeDimension) => {
  let filtered = [...entries];
  
  // Apply all filters except the excluded dimension
  if (excludeDimension !== 'type' && filters.type) {
    filtered = filtered.filter(entry => entry.type === filters.type);
  }
  
  if (excludeDimension !== 'region' && filters.region) {
    filtered = filtered.filter(entry => entry.region === filters.region);
  }
  
  if (excludeDimension !== 'quarter' && filters.quarter) {
    filtered = filtered.filter(entry => entry.quarter === filters.quarter);
  }
  
  if (excludeDimension !== 'search' && filters.search) {
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

### Chart Component Changes

Each chart component now uses the filtered data specific to its needs:

```javascript
// TypeBarChart.js
const entriesForChart = getEntriesFilteredExcept('type');

// RegionBarChart.js
const entriesForChart = getEntriesFilteredExcept('region');

// TimelineChart.js
const entriesForChart = getEntriesFilteredExcept('quarter');
```

### Active Filters UI

A new `ActiveFilters` component visually displays the currently active filters and allows users to:
- See which filters are currently applied
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