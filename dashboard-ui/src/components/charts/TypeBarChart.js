import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '../../context/DataContext';
import { getCountsByProperty } from '../../utils/dataProcessing';
import colorScheme from '../../utils/colorScheme';

const TypeBarChart = () => {
  const { allEntries, filters, setFilter } = useData();
  
  // Get type counts
  const data = getCountsByProperty(allEntries, 'type')
    .filter(item => item.name && item.name !== 'Unknown');

  // Handle bar click to filter by type
  const handleBarClick = (data) => {
    const typeName = data.name;
    setFilter('type', typeName);
  };
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
          layout="vertical"
          barSize={20} // Set fixed bar height
        >
          <XAxis 
            type="number" 
            label={{ value: 'Entries', position: 'insideBottom', offset: -5, fontSize: 11 }}
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={80} 
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value) => [`${value} entries`, 'Count']}
            labelFormatter={(label) => `Type: ${label}`}
          />
          {data.map((entry) => (
            <Bar
              key={entry.name}
              dataKey="count"
              name={entry.name}
              fill={colorScheme[entry.name] || '#999'}
              onClick={() => handleBarClick(entry)}
              className="clickable-bar"
              // Highlight the active filter
              opacity={filters.type && filters.type !== entry.name ? 0.3 : 1}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TypeBarChart;