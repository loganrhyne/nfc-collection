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
  const { getEntriesFilteredExcept, filters, setFilter, setMultiFilter } = useData();
  
  // Get entries filtered by everything except quarter
  const entriesForChart = getEntriesFilteredExcept('quarter');
  
  // Get quarter counts with type breakdown
  const data = getQuarterCountsWithTypeSeries(entriesForChart);

  // Get all unique type values
  const types = getTypeKeys();
  
  // Handle bar click to filter by quarter
  const handleBarClick = (data) => {
    setFilter('quarter', data.rawQuarter, 'timeline-chart');
  };

  // Handle segment click (when clicking a specific segment of a stacked bar)
  const handleSegmentClick = (entry, index) => {
    // Prevent event bubbling to the parent bar click handler
    if (entry && entry.event) {
      entry.event.stopPropagation();
    }
    
    // Extract the quarter name and find which type this is based on index
    const quarterName = entry.payload?.rawQuarter;
    const typeName = types[index];
    
    if (quarterName && typeName) {
      // Apply both filters at once - filter by this quarter and this type
      setMultiFilter({
        quarter: quarterName,
        type: typeName
      }, 'timeline-chart-segment');
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

export default TimelineChart;