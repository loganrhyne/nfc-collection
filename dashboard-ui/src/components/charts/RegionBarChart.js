import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '../../context/DataContext';
import { getRegionCountsWithTypeSeries } from '../../utils/dataProcessing';
import colorScheme from '../../utils/colorScheme';
import {
  StackedTooltip,
  getVerticalXAxisProps,
  getVerticalYAxisProps,
  sortByName,
  getTypeKeys,
  ChartStyles,
  isSegmentClick,
  extractBarInfo
} from './ChartUtils';

const RegionBarChart = () => {
  const { getEntriesFilteredExcept, filters, setFilter, setMultiFilter } = useData();
  
  // If a region filter is active, show only that region
  // Otherwise show all regions with other filters applied
  const showSingleRegion = !!filters.region;
  
  // Get entries with appropriate filtering
  const entriesForChart = getEntriesFilteredExcept('region', showSingleRegion);
  
  console.log('RegionChart rendering with:', { 
    showSingleRegion, 
    activeRegionFilter: filters.region,
    entriesCount: entriesForChart.length 
  });
  
  // Get region counts with type breakdown and sort alphabetically
  const data = sortByName(
    getRegionCountsWithTypeSeries(entriesForChart).filter(item => item.name && item.name !== 'Unknown')
  );

  // Get all unique type values
  const types = getTypeKeys();
  
  /**
   * Universal click handler for the RegionBarChart
   * Handles both bar clicks (filter by region only) and segment clicks (filter by region + type)
   */
  const handleChartClick = (event) => {
    console.log('Region chart - click event:', event);
    
    // Extract information from the click event
    const { categoryName: regionName, typeName, isSegment } = extractBarInfo(event, data);
    console.log('Region click extracted:', { regionName, typeName, isSegment });
    
    if (!regionName) return;
    
    // If clicking a segment, apply both region and type filters
    if (isSegment && typeName && !filters.type) {
      console.log('Setting region+type filter:', regionName, typeName);
      setMultiFilter({
        region: regionName,
        type: typeName
      }, 'region-chart-segment');
    } 
    // Otherwise just filter by region
    else {
      console.log('Setting region filter only:', regionName);
      setFilter('region', regionName, 'region-chart');
    }
  };
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
          barGap={0}
          barCategoryGap={ChartStyles.barCategoryGap.normal}
          onClick={handleChartClick}
        >
          {/* X axis (horizontal) */}
          <XAxis {...getVerticalXAxisProps()} />
          
          {/* Y axis (categories) */}
          <YAxis {...getVerticalYAxisProps()} />
          
          {/* Custom tooltip component */}
          <Tooltip content={props => <StackedTooltip {...props} labelPrefix="Region" />} />
          {/* Create a stacked bar for each type */}
          {types.map((type, index) => (
            <Bar
              key={type}
              dataKey={type}
              stackId="a"
              fill={colorScheme[type] || '#999'}
              onClick={(data, index) => {
                // Add event to stop propagation
                if (data && data.event) {
                  data.event.stopPropagation();
                }
                handleChartClick(data);
              }}
              // Highlight active filter
              opacity={filters.type && filters.type !== type ? 0.3 : 1}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RegionBarChart;