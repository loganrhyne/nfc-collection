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
  
  // Get entries filtered by everything except region
  const entriesForChart = getEntriesFilteredExcept('region');
  
  // Get region counts with type breakdown and sort alphabetically
  const data = sortByName(
    getRegionCountsWithTypeSeries(entriesForChart).filter(item => item.name && item.name !== 'Unknown')
  );

  // Get all unique type values
  const types = getTypeKeys();
  
  // Handle bar click to filter by region
  const handleBarClick = (data) => {
    setFilter('region', data.name, 'region-chart');
  };

  // Handle segment click (when clicking a specific segment of a stacked bar)
  const handleSegmentClick = (entry, index) => {
    // Prevent event bubbling to the parent bar click handler
    if (entry && entry.event) {
      entry.event.stopPropagation();
    }
    
    // Extract the region name and find which type this is based on index
    const regionName = entry.payload?.name;
    const typeName = types[index];
    
    if (regionName && typeName) {
      // Apply both filters at once - filter by this region and this type
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
          onClick={handleBarClick}
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