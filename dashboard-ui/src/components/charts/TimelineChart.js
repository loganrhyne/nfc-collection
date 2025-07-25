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
  ChartStyles,
  isSegmentClick,
  extractBarInfo
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
  
  /**
   * Universal click handler for the TimelineChart
   * Handles both bar clicks (filter by quarter only) and segment clicks (filter by quarter + type)
   */
  const handleChartClick = (event) => {
    console.log('Timeline chart - click event:', event);
    
    // Extract information from the click event
    let quarterName = null;
    
    // First, try to get the direct quarter name from activeLabel
    if (event && event.activeLabel) {
      // We need to find the quarter object that matches this displayed name
      const quarterObj = data.find(item => item.name === event.activeLabel);
      if (quarterObj) {
        quarterName = quarterObj.rawQuarter;
      }
    }
    
    // If that didn't work, try to get it from the payload
    if (!quarterName && event && event.payload) {
      quarterName = event.payload.rawQuarter;
    }
    
    // Get the type from tooltipPayload for segment clicks
    const isSegment = isSegmentClick(event);
    let typeName = null;
    if (isSegment && event.tooltipPayload && event.tooltipPayload[0]) {
      typeName = event.tooltipPayload[0].dataKey;
    }
    
    console.log('Timeline click extracted:', { quarterName, typeName, isSegment });
    
    if (!quarterName) return;
    
    // If clicking a segment, apply both quarter and type filters
    if (isSegment && typeName && !filters.type) {
      console.log('Setting quarter+type filter:', quarterName, typeName);
      setMultiFilter({
        quarter: quarterName,
        type: typeName
      }, 'timeline-chart-segment');
    } 
    // Otherwise just filter by quarter
    else {
      console.log('Setting quarter filter only:', quarterName);
      setFilter('quarter', quarterName, 'timeline-chart');
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
          onClick={handleChartClick}
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

export default TimelineChart;