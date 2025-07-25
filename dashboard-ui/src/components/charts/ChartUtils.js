import React from 'react';
import colorScheme from '../../utils/colorScheme';

/**
 * Common styling constants for charts
 */
export const ChartStyles = {
  tooltipStyle: {
    backgroundColor: '#fff',
    padding: '5px 10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  tooltipTextStyle: {
    margin: '0px',
    fontFamily: 'sans-serif',
    fontSize: '12px'
  },
  axis: {
    tickSize: 5,
    stroke: '#ccc'
  },
  barCategoryGap: {
    normal: '15%',
    dense: '2%' 
  }
};

/**
 * Custom tooltip component for simple data series
 */
export const SimpleTooltip = ({ active, payload, labelPrefix, dataName = null, valueUnit = 'entries' }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const name = dataName || data.payload.name;
    const color = colorScheme[name] || '#333';
    
    return (
      <div style={ChartStyles.tooltipStyle}>
        <p style={{ ...ChartStyles.tooltipTextStyle, color }}>
          {labelPrefix ? `${labelPrefix}: ` : ''}{name}: {data.value} {valueUnit}
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Custom tooltip component for stacked series
 */
export const StackedTooltip = ({ active, payload, label, labelPrefix, valueUnit = 'entries' }) => {
  if (active && payload && payload.length) {
    // Filter out zero values
    const nonZeroPayload = payload.filter(p => p.value > 0);
    
    if (nonZeroPayload.length === 0) return null;
    
    return (
      <div style={ChartStyles.tooltipStyle}>
        <p style={{ ...ChartStyles.tooltipTextStyle, fontWeight: 'bold' }}>
          {labelPrefix ? `${labelPrefix}: ` : ''}{label}
        </p>
        {nonZeroPayload.map((entry, index) => (
          <p 
            key={`item-${index}`} 
            style={{ ...ChartStyles.tooltipTextStyle, color: entry.color }}
          >
            {entry.name}: {entry.value} {valueUnit}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Get consistent XAxis props for vertical bar charts
 */
export const getVerticalXAxisProps = () => ({
  type: 'number',
  axisLine: true,
  tickLine: true,
  tickCount: 5,
  stroke: ChartStyles.axis.stroke,
  tickSize: ChartStyles.axis.tickSize
});

/**
 * Get consistent YAxis props for vertical bar charts
 */
export const getVerticalYAxisProps = () => ({
  type: 'category',
  dataKey: 'name',
  width: 80,
  axisLine: true,
  tickLine: true,
  tick: { fontSize: 12 },
  tickMargin: 5,
  stroke: ChartStyles.axis.stroke,
  tickSize: ChartStyles.axis.tickSize
});

/**
 * Get consistent XAxis props for horizontal bar charts (timeline)
 */
export const getTimelineXAxisProps = () => ({
  dataKey: 'name',
  tick: { fontSize: 9, angle: -45, textAnchor: 'end' },
  height: 50,
  interval: 0,
  tickMargin: 8,
  axisLine: true,
  tickLine: true,
  stroke: ChartStyles.axis.stroke,
  tickSize: ChartStyles.axis.tickSize
});

/**
 * Get consistent YAxis props for horizontal bar charts (timeline)
 */
export const getTimelineYAxisProps = () => ({
  allowDecimals: false,
  tickCount: 4,
  axisLine: true,
  tickLine: true,
  stroke: ChartStyles.axis.stroke,
  tickSize: ChartStyles.axis.tickSize
});

/**
 * Helper to sort data alphabetically by name
 */
export const sortByName = data => {
  return [...data].sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Get all type keys from color scheme
 */
export const getTypeKeys = () => Object.keys(colorScheme);