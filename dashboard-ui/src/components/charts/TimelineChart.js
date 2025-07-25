import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '../../context/DataContext';
import { getQuarterCountsWithTypeSeries } from '../../utils/dataProcessing';
import colorScheme from '../../utils/colorScheme';
import {
  StackedTooltip,
  getTimelineXAxisProps,
  getTimelineYAxisProps,
  getTypeKeys,
  ChartStyles
} from './ChartUtils';

const TimelineChart = () => {
  const { allEntries, filters, setFilter } = useData();
  
  // Get quarter counts with type breakdown
  const data = getQuarterCountsWithTypeSeries(allEntries);

  // Get all unique type values
  const types = getTypeKeys();
  
  // Handle bar click to filter by quarter
  const handleBarClick = (data) => {
    setFilter('quarter', data.rawQuarter);
  };

  // Handle type click (when clicking a segment of a stacked bar)
  const handleTypeClick = (entry, index) => {
    // Find which type this is based on index
    if (index < types.length) {
      setFilter('type', types[index]);
    }
  };
  
  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: 5, bottom: 20 }}
          barGap={0}
          barCategoryGap={ChartStyles.barCategoryGap.dense}
          onClick={handleBarClick}
        >
          {/* X axis (time periods) */}
          <XAxis {...getTimelineXAxisProps()} />
          
          {/* Y axis (counts) */}
          <YAxis {...getTimelineYAxisProps()} />
          
          {/* Custom tooltip component */}
          <Tooltip content={props => <StackedTooltip {...props} labelPrefix="Period" />} />
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

export default TimelineChart;