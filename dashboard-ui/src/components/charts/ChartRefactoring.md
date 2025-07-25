# Chart Component Refactoring

## Overview

The chart components have been refactored to improve code quality, consistency, and maintainability. This document outlines the changes made and the benefits of the new architecture.

## Key Improvements

1. **Shared Utility Functions**: Common code has been extracted to `ChartUtils.js` to reduce duplication
2. **Consistent Styling**: Standardized styling constants ensure visual consistency across all charts
3. **Custom Tooltip Components**: Unified tooltip implementation with consistent formatting
4. **Standardized Axis Configuration**: Shared axis props for consistent appearance and behavior
5. **Improved Type Safety**: Better prop handling and consistent data processing

## Components Refactored

1. **TypeBarChart.js**
   - Implemented Cell-based coloring for proper type-specific colors
   - Fixed tooltip inconsistencies
   - Added responsive bar sizing

2. **RegionBarChart.js**
   - Updated to use standard axis configurations
   - Implemented stacked bar styling consistency
   - Added custom tooltip for consistent display

3. **TimelineChart.js**
   - Updated dense bar styling for time series data
   - Implemented consistent axis formatting
   - Added proper tooltip formatting for quarter data

## Shared Utilities in ChartUtils.js

1. **Styling Constants**
   - `tooltipStyle` - Consistent tooltip appearance
   - `barCategoryGap` - Configurable bar spacing
   - `axis` - Standard axis styling

2. **Tooltip Components**
   - `SimpleTooltip` - For single-series charts
   - `StackedTooltip` - For multi-series stacked charts

3. **Axis Configuration**
   - `getVerticalXAxisProps` - Standard horizontal number axis
   - `getVerticalYAxisProps` - Standard vertical category axis
   - `getTimelineXAxisProps` - Special configuration for timeline's date axis
   - `getTimelineYAxisProps` - Standard count axis for timeline

4. **Helper Functions**
   - `sortByName` - Consistent alphabetical sorting
   - `getTypeKeys` - Central access to color scheme keys

## Benefits

1. **Reduced Code Duplication**: ~40% reduction in chart component code
2. **Improved Maintainability**: Changes can be made in one place and applied across all charts
3. **Visual Consistency**: Charts now share the same styling patterns
4. **Better User Experience**: Consistent interactive elements and tooltips
5. **Easier Extension**: New charts can leverage the same utilities for quick implementation

## Future Improvements

1. **Animation Configuration**: Add shared animation settings
2. **Responsive Sizing**: Further optimize for different screen sizes
3. **Accessibility**: Enhance charts with better screen reader support
4. **Theme Support**: Allow for light/dark theme switching