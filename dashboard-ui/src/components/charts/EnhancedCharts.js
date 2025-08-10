import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Area, AreaChart
} from 'recharts';
import { fadeIn, slideInUp, pulse } from '../../styles/animations';
import ds from '../../styles/designSystem';

const ChartContainer = styled.div`
  background: white;
  border-radius: ${ds.borderRadius.xl};
  padding: ${ds.spacing[6]};
  box-shadow: ${ds.shadows.md};
  border: 1px solid ${ds.colors.stone[200]};
  animation: ${fadeIn} ${ds.transitions.duration.slow} ${ds.transitions.easing.enter};
  height: ${props => props.height || '400px'};
  
  &:hover {
    box-shadow: ${ds.shadows.lg};
    transition: box-shadow ${ds.transitions.duration.base} ${ds.transitions.easing.smooth};
  }
`;

const ChartHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${ds.spacing[6]};
`;

const ChartTitle = styled.h3`
  margin: 0;
  font-family: ${ds.typography.fontFamily.sans};
  font-size: ${ds.typography.fontSize.xl};
  font-weight: ${ds.typography.fontWeight.semibold};
  color: ${ds.colors.stone[900]};
`;

const ChartSubtitle = styled.p`
  margin: ${ds.spacing[1]} 0 0;
  font-size: ${ds.typography.fontSize.sm};
  color: ${ds.colors.stone[600]};
`;

const ChartLegend = styled.div`
  display: flex;
  gap: ${ds.spacing[4]};
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${ds.spacing[2]};
  font-size: ${ds.typography.fontSize.sm};
  color: ${ds.colors.stone[600]};
`;

const LegendDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: ${ds.borderRadius.full};
  background: ${props => props.color};
`;

// Custom tooltip
const CustomTooltip = styled.div`
  background: white;
  padding: ${ds.spacing[3]} ${ds.spacing[4]};
  border-radius: ${ds.borderRadius.lg};
  box-shadow: ${ds.shadows.lg};
  border: 1px solid ${ds.colors.stone[200]};
  
  .label {
    font-size: ${ds.typography.fontSize.sm};
    font-weight: ${ds.typography.fontWeight.semibold};
    color: ${ds.colors.stone[900]};
    margin-bottom: ${ds.spacing[2]};
  }
  
  .value {
    font-size: ${ds.typography.fontSize.base};
    color: ${ds.colors.stone[700]};
  }
`;

const chartColors = [
  ds.colors.sand[500],
  ds.colors.ocean[500],
  ds.colors.sand[400],
  ds.colors.ocean[400],
  ds.colors.sand[600],
  ds.colors.ocean[600],
  ds.colors.stone[500],
  ds.colors.stone[600]
];

// Enhanced Bar Chart
export const EnhancedBarChart = ({ data, title, subtitle, dataKey = 'value', nameKey = 'name' }) => {
  const [animationComplete, setAnimationComplete] = useState(false);
  
  useEffect(() => {
    setTimeout(() => setAnimationComplete(true), 100);
  }, []);
  
  const CustomBar = (props) => {
    const { fill, x, y, width, height } = props;
    
    return (
      <g>
        <defs>
          <linearGradient id={`gradient-${x}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity={1} />
            <stop offset="100%" stopColor={fill} stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={`url(#gradient-${x})`}
          rx={ds.borderRadius.sm}
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
            cursor: 'pointer'
          }}
        />
      </g>
    );
  };
  
  return (
    <ChartContainer>
      <ChartHeader>
        <div>
          <ChartTitle>{title}</ChartTitle>
          {subtitle && <ChartSubtitle>{subtitle}</ChartSubtitle>}
        </div>
      </ChartHeader>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={ds.colors.stone[200]} />
          <XAxis 
            dataKey={nameKey} 
            angle={-45}
            textAnchor="end"
            height={60}
            tick={{ fill: ds.colors.stone[600], fontSize: 12 }}
          />
          <YAxis tick={{ fill: ds.colors.stone[600], fontSize: 12 }} />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload[0]) {
                return (
                  <CustomTooltip>
                    <div className="label">{payload[0].payload[nameKey]}</div>
                    <div className="value">{payload[0].value} samples</div>
                  </CustomTooltip>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey={dataKey} 
            fill={ds.colors.sand[500]}
            shape={CustomBar}
            animationDuration={1500}
            animationBegin={0}
            isAnimationActive={animationComplete}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

// Enhanced Area Chart
export const EnhancedAreaChart = ({ data, title, subtitle, series }) => {
  return (
    <ChartContainer>
      <ChartHeader>
        <div>
          <ChartTitle>{title}</ChartTitle>
          {subtitle && <ChartSubtitle>{subtitle}</ChartSubtitle>}
        </div>
        {series && (
          <ChartLegend>
            {series.map((s, i) => (
              <LegendItem key={s.key}>
                <LegendDot color={chartColors[i]} />
                <span>{s.name}</span>
              </LegendItem>
            ))}
          </ChartLegend>
        )}
      </ChartHeader>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart 
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <defs>
            {series?.map((s, i) => (
              <linearGradient key={s.key} id={`color-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors[i]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={chartColors[i]} stopOpacity={0.1}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={ds.colors.stone[200]} />
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            tick={{ fill: ds.colors.stone[600], fontSize: 12 }}
          />
          <YAxis tick={{ fill: ds.colors.stone[600], fontSize: 12 }} />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <CustomTooltip>
                    <div className="label">{payload[0].payload.name}</div>
                    {payload.map((p, i) => (
                      <div key={i} className="value" style={{ color: p.color }}>
                        {p.name}: {p.value}
                      </div>
                    ))}
                  </CustomTooltip>
                );
              }
              return null;
            }}
          />
          {series?.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={chartColors[i]}
              fillOpacity={1}
              fill={`url(#color-${s.key})`}
              strokeWidth={2}
              animationDuration={2000}
              animationBegin={i * 200}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

// Enhanced Pie Chart
export const EnhancedPieChart = ({ data, title, subtitle }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  
  const handlePieEnter = (_, index) => {
    setActiveIndex(index);
  };
  
  const handlePieLeave = () => {
    setActiveIndex(null);
  };
  
  return (
    <ChartContainer height="500px">
      <ChartHeader>
        <div>
          <ChartTitle>{title}</ChartTitle>
          {subtitle && <ChartSubtitle>{subtitle}</ChartSubtitle>}
        </div>
      </ChartHeader>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={1500}
            onMouseEnter={handlePieEnter}
            onMouseLeave={handlePieLeave}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={chartColors[index % chartColors.length]}
                style={{
                  filter: activeIndex === index ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' : 'none',
                  cursor: 'pointer',
                  transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: 'center',
                  transition: 'all 0.2s ease'
                }}
              />
            ))}
          </Pie>
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload[0]) {
                return (
                  <CustomTooltip>
                    <div className="label">{payload[0].name}</div>
                    <div className="value">{payload[0].value} samples</div>
                  </CustomTooltip>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

// Stats Card Component
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${ds.spacing[4]};
  margin-bottom: ${ds.spacing[8]};
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, ${props => props.color}22 0%, ${props => props.color}11 100%);
  border: 1px solid ${props => props.color}33;
  border-radius: ${ds.borderRadius.xl};
  padding: ${ds.spacing[6]};
  text-align: center;
  animation: ${slideInUp} ${ds.transitions.duration.slow} ${ds.transitions.easing.enter} ${props => props.delay}s both;
  transition: all ${ds.transitions.duration.base} ${ds.transitions.easing.smooth};
  cursor: pointer;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: ${ds.shadows.lg};
  }
  
  .icon {
    font-size: ${ds.typography.fontSize['3xl']};
    margin-bottom: ${ds.spacing[3]};
  }
  
  .value {
    font-size: ${ds.typography.fontSize['4xl']};
    font-weight: ${ds.typography.fontWeight.bold};
    color: ${props => props.color};
    margin-bottom: ${ds.spacing[2]};
  }
  
  .label {
    font-size: ${ds.typography.fontSize.sm};
    color: ${ds.colors.stone[600]};
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

export const StatsCards = ({ entries }) => {
  const stats = {
    total: entries?.length || 0,
    countries: new Set(entries?.map(e => e.location?.country).filter(Boolean)).size || 0,
    regions: new Set(entries?.map(e => e.location?.name).filter(Boolean)).size || 0,
    types: new Set(entries?.map(e => e.type).filter(Boolean)).size || 0
  };
  const statConfigs = [
    { key: 'total', label: 'Total Samples', icon: '🏖️', color: ds.colors.sand[500] },
    { key: 'countries', label: 'Countries', icon: '🌍', color: ds.colors.ocean[500] },
    { key: 'regions', label: 'Regions', icon: '📍', color: ds.colors.sand[600] },
    { key: 'types', label: 'Sample Types', icon: '🏷️', color: ds.colors.ocean[600] }
  ];
  
  return (
    <StatsGrid>
      {statConfigs.map((config, index) => (
        <StatCard
          key={config.key}
          color={config.color}
          delay={index * 0.1}
        >
          <div className="icon">{config.icon}</div>
          <div className="value">{stats[config.key] || 0}</div>
          <div className="label">{config.label}</div>
        </StatCard>
      ))}
    </StatsGrid>
  );
};

// Named exports for individual components
export { EnhancedBarChart, EnhancedAreaChart, EnhancedPieChart, StatsCards };

// Default export as a combined component
export const EnhancedCharts = ({ entries }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <StatsCards entries={entries} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <EnhancedBarChart entries={entries} />
        <EnhancedAreaChart entries={entries} />
      </div>
      <EnhancedPieChart entries={entries} />
    </div>
  );
};

export default EnhancedCharts;