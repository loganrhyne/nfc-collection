import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useData } from '../../context/DataContext';
import { getQuarterCountsWithTypeSeries } from '../../utils/dataProcessing';
import colorScheme from '../../utils/colorScheme';

const TimelineChart = () => {
  const { allEntries, filters, setFilter } = useData();
  
  // Get quarter counts with type breakdown
  const data = getQuarterCountsWithTypeSeries(allEntries);

  // Get all unique type values
  const types = Object.keys(colorScheme);
  
  // Handle bar click to filter by quarter
  const handleBarClick = (data) => {
    const quarterName = data.name;
    setFilter('quarter', quarterName);
  };

  // Handle legend click to filter by type
  const handleLegendClick = (entry) => {
    setFilter('type', entry.value);
  };
  
  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
        >
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }}
            height={50}
          />
          <YAxis />
          <Tooltip />
          <Legend 
            onClick={handleLegendClick}
            wrapperStyle={{ fontSize: '12px' }}
          />
          {types.map((type) => (
            <Bar
              key={type}
              dataKey={type}
              stackId="a"
              fill={colorScheme[type] || '#999'}
              onClick={handleBarClick}
              className="clickable-bar"
              // Highlight the active filter
              opacity={(filters.type && filters.type !== type) ? 0.3 : 1}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TimelineChart;