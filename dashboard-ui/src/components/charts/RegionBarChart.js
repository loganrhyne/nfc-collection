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
  const { allEntries, filters, setFilter } = useData();
  
  // Get region counts with type breakdown and sort alphabetically
  const data = sortByName(
    getRegionCountsWithTypeSeries(allEntries).filter(item => item.name && item.name !== 'Unknown')
  );

  // Get all unique type values
  const types = getTypeKeys();
  
  // Handle bar click to filter by region
  const handleBarClick = (data) => {
    setFilter('region', data.name);
  };

  // Handle type click (when clicking a segment of a stacked bar)
  const handleTypeClick = (entry, index) => {
    // Find which type this is based on index
    if (index < types.length) {
      setFilter('type', types[index]);
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
              onClick={(data, index) => handleTypeClick(data, index)}
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