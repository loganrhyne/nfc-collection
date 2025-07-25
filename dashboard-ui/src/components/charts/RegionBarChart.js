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
  ChartStyles
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
  
  // Handle bar click to filter by region
  const handleBarClick = (data) => {
    // Check if we have valid data with a name property
    if (data && data.name) {
      console.log('Region chart - handleBarClick:', data.name);
      // Check if this is a click on the bar itself, not a segment
      // Only set region filter
      setFilter('region', data.name, 'region-chart');
    }
  };

  // Handle segment click (when clicking a specific segment of a stacked bar)
  const handleSegmentClick = (entry, index) => {
    // Log what we received
    console.log('Region chart - handleSegmentClick:', entry, index);
    
    // Prevent event bubbling to the parent bar click handler
    if (entry && entry.event) {
      entry.event.stopPropagation();
    }
    
    // Extract the region name from the payload
    const regionName = entry && entry.payload ? entry.payload.name : null;
    
    // Get the actual dataKey that this Bar represents
    // This is the correct way to determine the type, not using the index
    const typeName = entry && entry.tooltipPayload && entry.tooltipPayload[0] ?
      entry.tooltipPayload[0].dataKey : null;
    
    console.log('Region values extracted:', { regionName, typeName });
    
    // If there's already a type filter active, respect it and just set the region
    if (filters.type) {
      if (regionName) {
        console.log('Setting region filter only (type already set):', regionName);
        setFilter('region', regionName, 'region-chart');
      }
    } else if (regionName && typeName) {
      // Otherwise, set both region and type filters
      console.log('Setting multi filter for region segment:', regionName, typeName);
      setMultiFilter({
        region: regionName,
        type: typeName
      }, 'region-chart-segment');
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
          onClick={(data) => {
            console.log('Region chart - direct bar click:', data);
            // Try to handle click even if activePayload is not set
            // This happens when clicking on bar areas
            if (data && data.activeLabel) {
              console.log('Region chart - using activeLabel:', data.activeLabel);
              handleBarClick({ name: data.activeLabel });
            } else if (data && data.activePayload && data.activePayload[0]) {
              handleBarClick(data.activePayload[0].payload);
            }
          }}
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
              onClick={(data, index) => handleSegmentClick(data, index)}
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