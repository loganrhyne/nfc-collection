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
  
  // If a quarter filter is active, show only that quarter
  // Otherwise show all quarters with other filters applied
  const showSingleQuarter = !!filters.quarter;
  
  // Get entries with appropriate filtering
  const entriesForChart = getEntriesFilteredExcept('quarter', showSingleQuarter);
  
  console.log('TimelineChart rendering with:', { 
    showSingleQuarter, 
    activeQuarterFilter: filters.quarter,
    entriesCount: entriesForChart.length 
  });
  
  // Get quarter counts with type breakdown
  const data = getQuarterCountsWithTypeSeries(entriesForChart);

  // Get all unique type values
  const types = getTypeKeys();
  
  // Handle bar click to filter by quarter
  const handleBarClick = (data) => {
    // Check if we have valid data with a rawQuarter property
    if (data && data.rawQuarter) {
      console.log('Timeline chart - handleBarClick:', data.rawQuarter);
      // Only set quarter filter
      setFilter('quarter', data.rawQuarter, 'timeline-chart');
    }
  };

  // Handle segment click (when clicking a specific segment of a stacked bar)
  const handleSegmentClick = (entry, index) => {
    // Log what we received
    console.log('Timeline chart - handleSegmentClick:', entry, index);
    
    // Prevent event bubbling to the parent bar click handler
    if (entry && entry.event) {
      entry.event.stopPropagation();
    }
    
    // Extract the quarter name from the payload
    const quarterName = entry && entry.payload ? entry.payload.rawQuarter : null;
    
    // Get the actual dataKey that this Bar represents
    // This is the correct way to determine the type, not using the index
    const typeName = entry && entry.tooltipPayload && entry.tooltipPayload[0] ?
      entry.tooltipPayload[0].dataKey : null;
    
    console.log('Timeline values extracted:', { quarterName, typeName });
    
    // If there's already a type filter active, respect it and just set the quarter
    if (filters.type) {
      if (quarterName) {
        console.log('Setting quarter filter only (type already set):', quarterName);
        setFilter('quarter', quarterName, 'timeline-chart');
      }
    } else if (quarterName && typeName) {
      // Otherwise, set both quarter and type filters
      console.log('Setting multi filter for timeline segment:', quarterName, typeName);
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
          onClick={(data) => {
            console.log('Timeline chart - direct bar click:', data);
            if (data && data.activePayload && data.activePayload[0]) {
              handleBarClick(data.activePayload[0].payload);
            }
          }}
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