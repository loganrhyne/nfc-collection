import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useData } from '../../context/DataContext';
import { getRegionCountsWithTypeSeries } from '../../utils/dataProcessing';
import colorScheme from '../../utils/colorScheme';

const RegionBarChart = () => {
  const { allEntries, filters, setFilter } = useData();
  
  // Get region counts with type breakdown
  let data = getRegionCountsWithTypeSeries(allEntries)
    .filter(item => item.name && item.name !== 'Unknown');

  // Sort regions alphabetically for consistency
  data = data.sort((a, b) => a.name.localeCompare(b.name));

  // Get all unique type values
  const types = Object.keys(colorScheme);
  
  // Handle bar click to filter by region
  const handleBarClick = (data) => {
    const regionName = data.name;
    setFilter('region', regionName);
  };

  // Handle type click through bar segments
  const handleTypeClick = (entry, type) => {
    setFilter('type', type);
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