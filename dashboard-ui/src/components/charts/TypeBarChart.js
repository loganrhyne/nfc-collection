import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '../../context/DataContext';
import { getCountsByProperty } from '../../utils/dataProcessing';
import colorScheme from '../../utils/colorScheme';

const TypeBarChart = () => {
  const { allEntries, filters, setFilter } = useData();
  
  // Get type counts and make sure we get all the types for proper coloring
  let data = getCountsByProperty(allEntries, 'type')
    .filter(item => item.name && item.name !== 'Unknown');
    
  // Sort the data to ensure consistent order
  data = data.sort((a, b) => a.name.localeCompare(b.name));

  // Handle bar click to filter by type
  const handleBarClick = (data) => {
    const typeName = data.name;
    setFilter('type', typeName);
  };
  
  // Create individual color bars for each type
  const renderBars = () => {
    // Create one bar per type with its specific color
    return data.map((entry) => (
      <Bar
        key={entry.name}
        dataKey="count"
        name={entry.name}
        fill={colorScheme[entry.name] || '#999'}
        onClick={() => handleBarClick(entry)}
        className="clickable-bar"
        opacity={filters.type && filters.type !== entry.name ? 0.3 : 1}
      />
    ));
  };
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, left: 5, bottom: 5 }}
          layout="vertical"
          barSize={16} // Slightly smaller for better alignment
          barGap={0}
          barCategoryGap={10} // Better spacing between categories
        >
          <XAxis 
            type="number" 
            axisLine={true}
            tickLine={true}
            tickCount={5}
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={80}
            axisLine={true}
            tickLine={true}
            tick={{ fontSize: 12 }}
            tickMargin={5}
          />
          <Tooltip 
            formatter={(value) => [`${value} entries`, 'Count']}
            labelFormatter={(label) => `Type: ${label}`}
          />
          {renderBars()}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TypeBarChart;