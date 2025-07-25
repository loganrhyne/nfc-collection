import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useData } from '../../context/DataContext';
import { getRegionCountsWithTypeSeries } from '../../utils/dataProcessing';
import colorScheme from '../../utils/colorScheme';

const RegionBarChart = () => {
  const { allEntries, filters, setFilter } = useData();
  
  // Get region counts with type breakdown
  const data = getRegionCountsWithTypeSeries(allEntries)
    .filter(item => item.name && item.name !== 'Unknown');

  // Get all unique type values
  const types = Object.keys(colorScheme);
  
  // Handle bar click to filter by region
  const handleBarClick = (data) => {
    const regionName = data.name;
    setFilter('region', regionName);
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
          layout="vertical"
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
            label={{ value: 'Regions', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' }, fontSize: 11 }}
          />
          <Tooltip 
            formatter={(value, name) => [`${value} entries`, name]}
            labelFormatter={(label) => `Region: ${label}`}
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

export default RegionBarChart;