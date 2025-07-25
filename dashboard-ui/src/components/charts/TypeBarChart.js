import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useData } from '../../context/DataContext';
import { getCountsByProperty } from '../../utils/dataProcessing';
import colorScheme from '../../utils/colorScheme';
import { 
  SimpleTooltip, 
  getVerticalXAxisProps, 
  getVerticalYAxisProps,
  sortByName,
  ChartStyles
} from './ChartUtils';

/**
 * TypeBarChart displays the count of entries by type
 * Each type gets a single bar with its distinct color from the colorScheme
 */
const TypeBarChart = () => {
  const { allEntries, filters, setFilter } = useData();
  
  // Get type counts and sort alphabetically
  const data = sortByName(
    getCountsByProperty(allEntries, 'type').filter(item => item.name && item.name !== 'Unknown')
  );
  
  // Handle bar click to filter by type
  const handleBarClick = (entry) => {
    setFilter('type', entry.name);
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
        >
          {/* X axis (horizontal) */}
          <XAxis {...getVerticalXAxisProps()} />
          
          {/* Y axis (categories) */}
          <YAxis {...getVerticalYAxisProps()} />
          
          {/* Custom tooltip component */}
          <Tooltip content={props => <SimpleTooltip {...props} />} />
          
          {/* Single bar series with colored cells */}
          <Bar 
            dataKey="count"
            onClick={handleBarClick}
          >
            {/* Create a cell for each data point with the right color */}
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colorScheme[entry.name] || '#999'}
                opacity={filters.type && filters.type !== entry.name ? 0.3 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TypeBarChart;