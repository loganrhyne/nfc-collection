import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useData } from '../../context/DataContext';
import { getCountsByProperty } from '../../utils/dataProcessing';
import colorScheme from '../../utils/colorScheme';

const TypeBarChart = () => {
  const { allEntries, filters, setFilter } = useData();
  
  // Get type counts as a simple array of objects with name and count
  const data = getCountsByProperty(allEntries, 'type')
    .filter(item => item.name && item.name !== 'Unknown')
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically for consistency
  
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
        >
          <XAxis 
            type="number"
            tickCount={5}
          />
          <YAxis 
            type="category"
            dataKey="name"
            width={80}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            // Simple formatter showing just the count
            formatter={(value) => `${value} entries`}
            // No need for additional label formatting
          />
          <Bar 
            dataKey="count"
            // No fill here - we'll use individual cells
            onClick={handleBarClick}
          >
            {/* Create a cell for each data point with the right color */}
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colorScheme[entry.name] || '#999'}
                // Highlight the active filter
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