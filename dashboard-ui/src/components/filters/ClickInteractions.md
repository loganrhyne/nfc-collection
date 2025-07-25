# Chart Click Interaction Documentation

## Overview

The dashboard charts feature two distinct click interaction patterns to provide an intuitive and flexible data exploration experience:

1. **Bar Clicks**: Clicking on a bar or its label applies a filter for just that dimension
2. **Segment Clicks**: Clicking on a colored segment within a stacked bar applies filters for both the bar's dimension AND the segment's type

## Interaction Details

### Bar Clicks

When clicking on a bar (not a segment) or axis label:

- **Type Chart**: Filters data to show only entries of the selected type
- **Region Chart**: Filters data to show only entries from the selected region
- **Timeline Chart**: Filters data to show only entries from the selected quarter

Bar clicks set a single filter dimension, allowing for broad categorical filtering.

### Segment Clicks

When clicking on a colored segment within a stacked bar:

- **Region Chart**: Filters by both the selected region AND the segment's type
- **Timeline Chart**: Filters by both the selected quarter AND the segment's type

Segment clicks set multiple filter dimensions at once, enabling precise data selection with a single interaction.

## Implementation

The implementation uses a unified click handler approach with segment detection:

```javascript
const handleChartClick = (event) => {
  // Extract information from the click event
  const { categoryName, typeName, isSegment } = extractBarInfo(event, data);
  
  // If clicking a segment, apply both dimension and type filters
  if (isSegment && typeName && !filters.type) {
    setMultiFilter({
      region: categoryName,  // or quarter: categoryName
      type: typeName
    });
  } 
  // Otherwise just filter by primary dimension
  else {
    setFilter('region', categoryName);  // or 'quarter', etc.
  }
};
```

## Utility Functions

To support these interactions, we've added several utility functions to `ChartUtils.js`:

### isSegmentClick

Determines if a click event occurred on a segment rather than the main bar:

```javascript
export const isSegmentClick = (event) => {
  // Check if we have tooltipPayload which indicates a segment was clicked
  return event && event.tooltipPayload && event.tooltipPayload.length > 0;
};
```

### extractBarInfo

Extracts relevant information from a click event:

```javascript
export const extractBarInfo = (event, data) => {
  // Check if this is a segment click
  const isSegment = isSegmentClick(event);
  
  // Get category name (region or quarter)
  let categoryName = null;
  if (event.activeLabel) {
    categoryName = event.activeLabel;
  } else if (event.payload && event.payload.name) {
    categoryName = event.payload.name;
  }
  
  // Get type name (for segment clicks)
  let typeName = null;
  if (isSegment && event.tooltipPayload && event.tooltipPayload[0]) {
    typeName = event.tooltipPayload[0].dataKey;
  }
  
  return { categoryName, typeName, isSegment };
};
```

## Best Practices

When working with the chart click interactions:

1. Always check for the existence of required properties before accessing them
2. Use the `isSegmentClick` utility to differentiate between bar and segment clicks
3. Stop event propagation when handling segment clicks to prevent double handling
4. Respect existing filters when applying new ones
5. Use console logging during development to understand the click event structure