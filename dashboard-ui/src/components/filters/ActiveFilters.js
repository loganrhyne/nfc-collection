import React from 'react';
import styled from 'styled-components';
import { useData } from '../../context/DataContext';
import colorScheme from '../../utils/colorSchemeEnhanced';

const FiltersContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

const FilterBadge = styled.div`
  display: flex;
  align-items: center;
  background-color: ${props => props.color || '#f0f0f0'};
  color: ${props => props.textColor || '#333'};
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: opacity 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  
  &:hover {
    opacity: 0.8;
  }
`;

const FilterLabel = styled.span`
  margin-right: 4px;
  font-weight: 500;
  display: flex;
  align-items: center;
`;

const SourceTag = styled.span`
  font-size: 8px;
  background: rgba(255,255,255,0.3);
  padding: 1px 3px;
  border-radius: 3px;
  margin-left: 4px;
  opacity: 0.7;
`;

const RemoveIcon = styled.span`
  margin-left: 8px;
  font-weight: bold;
`;

const ClearAll = styled.div`
  cursor: pointer;
  color: #666;
  font-size: 0.85rem;
  text-decoration: underline;
  margin-left: auto;
  
  &:hover {
    color: #333;
  }
`;

const ActiveFilters = () => {
  const { filters, filterSources, setFilter, resetFilters } = useData();
  
  // Check if any filter is active
  const hasActiveFilters = Object.values(filters).some(value => 
    value !== null && value !== ''
  );
  
  if (!hasActiveFilters) return null;
  
  // Get appropriate text color based on background
  const getTextColor = (bgColor) => {
    // Simple logic - for light colors use dark text, for dark colors use light text
    if (!bgColor) return '#333';
    
    // Convert hex to RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate perceived brightness (formula from WCAG)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Return white for dark colors, black for light colors
    return brightness > 128 ? '#333' : '#fff';
  };
  
  return (
    <FiltersContainer>
      {filters.type && (
        <FilterBadge 
          color={colorScheme[filters.type]} 
          textColor={getTextColor(colorScheme[filters.type])}
          onClick={() => setFilter('type', filters.type)}
        >
          <FilterLabel>
            Type:
            {filterSources.type && <SourceTag>{filterSources.type}</SourceTag>}
          </FilterLabel> 
          {filters.type}
          <RemoveIcon>×</RemoveIcon>
        </FilterBadge>
      )}
      
      {filters.region && (
        <FilterBadge 
          color="#f0f0f0"
          onClick={() => setFilter('region', filters.region)}
        >
          <FilterLabel>
            Region:
            {filterSources.region && <SourceTag>{filterSources.region}</SourceTag>}
          </FilterLabel>
          {filters.region}
          <RemoveIcon>×</RemoveIcon>
        </FilterBadge>
      )}
      
      {filters.quarter && (
        <FilterBadge 
          color="#f0f0f0"
          onClick={() => setFilter('quarter', filters.quarter)}
        >
          <FilterLabel>
            Period:
            {filterSources.quarter && <SourceTag>{filterSources.quarter}</SourceTag>}
          </FilterLabel>
          {filters.quarter.replace('Q', 'Q')}
          <RemoveIcon>×</RemoveIcon>
        </FilterBadge>
      )}
      
      {filters.search && (
        <FilterBadge 
          color="#f0f0f0"
          onClick={() => setFilter('search', '')}
        >
          <FilterLabel>
            Search:
            {filterSources.search && <SourceTag>{filterSources.search}</SourceTag>}
          </FilterLabel>
          {filters.search}
          <RemoveIcon>×</RemoveIcon>
        </FilterBadge>
      )}
      
      {filters.geo && (
        <FilterBadge 
          color="#e3f2fd"
          onClick={() => setFilter('geo', null)}
        >
          <FilterLabel>
            Map Area:
            {filterSources.geo && <SourceTag>{filterSources.geo}</SourceTag>}
          </FilterLabel>
          Selected Area
          <RemoveIcon>×</RemoveIcon>
        </FilterBadge>
      )}
      
      {hasActiveFilters && (
        <ClearAll onClick={resetFilters}>
          Clear all
        </ClearAll>
      )}
    </FiltersContainer>
  );
};

export default ActiveFilters;