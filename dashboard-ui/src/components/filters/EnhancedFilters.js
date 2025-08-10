import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, X, Calendar, MapPin, Tag, 
  ChevronDown, Check
} from 'lucide-react';
import { colors, spacing, shadows, typography } from '../../styles/designSystem';
import { fadeIn, slideInUp, slideInRight } from '../../styles/animations';
import { TouchButton } from '../ui/TouchButton';
import { TouchCard } from '../ui/TouchCard';

const FilterPanel = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 400px;
  background: white;
  box-shadow: ${shadows.xl};
  z-index: 900;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const PanelHeader = styled.div`
  padding: ${spacing.xl};
  border-bottom: 1px solid ${colors.stone[200]};
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const PanelTitle = styled.h2`
  font-size: ${typography.fontSize.xl};
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.stone[900]};
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
`;

const PanelBody = styled.div`
  padding: ${spacing.xl};
`;

const FilterSection = styled.div`
  margin-bottom: ${spacing.xl};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.medium};
  color: ${colors.stone[700]};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${spacing.md};
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
`;

const FilterChip = styled(motion.button)`
  padding: ${spacing.sm} ${spacing.md};
  border: 2px solid ${props => props.$active ? colors.primary : colors.stone[200]};
  background: ${props => props.$active ? colors.primary : 'white'};
  color: ${props => props.$active ? 'white' : colors.stone[700]};
  border-radius: 20px;
  font-size: ${typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: ${spacing.xs};
  margin: 0 ${spacing.xs} ${spacing.sm} 0;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${shadows.sm};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const DateRangeContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${spacing.md};
`;

const DateInput = styled.div`
  position: relative;
`;

const StyledDateInput = styled.input`
  width: 100%;
  padding: ${spacing.md};
  padding-left: 40px;
  border: 2px solid ${colors.stone[200]};
  border-radius: 12px;
  font-size: ${typography.fontSize.sm};
  background: ${colors.stone[50]};
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${colors.primary};
    background: white;
  }
`;

const DateIcon = styled(Calendar)`
  position: absolute;
  left: ${spacing.md};
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: ${colors.stone[400]};
`;

const LocationList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid ${colors.stone[200]};
  border-radius: 12px;
  padding: ${spacing.sm};
`;

const LocationItem = styled.label`
  display: flex;
  align-items: center;
  padding: ${spacing.sm};
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
  
  &:hover {
    background: ${colors.stone[50]};
  }
  
  input {
    margin-right: ${spacing.sm};
    cursor: pointer;
  }
  
  .location-name {
    font-size: ${typography.fontSize.sm};
    color: ${colors.stone[900]};
  }
  
  .location-count {
    margin-left: auto;
    font-size: ${typography.fontSize.xs};
    color: ${colors.stone[500]};
    background: ${colors.stone[100]};
    padding: 2px 8px;
    border-radius: 12px;
  }
`;

const Footer = styled.div`
  position: sticky;
  bottom: 0;
  padding: ${spacing.xl};
  background: white;
  border-top: 1px solid ${colors.stone[200]};
  display: flex;
  gap: ${spacing.md};
`;

const ActiveFiltersList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing.sm};
  margin-top: ${spacing.md};
`;

const ActiveFilter = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.xs};
  padding: ${spacing.xs} ${spacing.md};
  background: ${colors.primary};
  color: white;
  border-radius: 16px;
  font-size: ${typography.fontSize.sm};
  
  button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    opacity: 0.8;
    transition: opacity 0.2s ease;
    
    &:hover {
      opacity: 1;
    }
  }
`;

export const EnhancedFilters = ({ 
  isOpen, 
  onClose, 
  filters = {}, 
  onFiltersChange,
  entries = []
}) => {
  const [localFilters, setLocalFilters] = useState({
    dateRange: filters.dateRange || { start: '', end: '' },
    locations: filters.locations || [],
    tags: filters.tags || [],
    hasMedia: filters.hasMedia || null
  });

  // Extract unique locations and tags from entries
  const locations = [...new Set(entries.map(e => e.location?.name).filter(Boolean))];
  const tags = [...new Set(entries.flatMap(e => e.tags || []))];

  const handleFilterChange = (type, value) => {
    setLocalFilters(prev => ({ ...prev, [type]: value }));
  };

  const handleLocationToggle = (location) => {
    setLocalFilters(prev => ({
      ...prev,
      locations: prev.locations.includes(location)
        ? prev.locations.filter(l => l !== location)
        : [...prev.locations, location]
    }));
  };

  const handleTagToggle = (tag) => {
    setLocalFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      dateRange: { start: '', end: '' },
      locations: [],
      tags: [],
      hasMedia: null
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const activeFilterCount = 
    localFilters.locations.length + 
    localFilters.tags.length + 
    (localFilters.dateRange.start ? 1 : 0) +
    (localFilters.hasMedia !== null ? 1 : 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              zIndex: 899
            }}
            onClick={onClose}
          />
          <FilterPanel
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <PanelHeader>
              <PanelTitle>
                <Filter size={20} />
                Filters
                {activeFilterCount > 0 && (
                  <span style={{
                    background: colors.primary,
                    color: 'white',
                    fontSize: typography.fontSize.xs,
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {activeFilterCount}
                  </span>
                )}
              </PanelTitle>
              <TouchButton
                variant="ghost"
                size="sm"
                icon={<X size={20} />}
                onClick={onClose}
              />
            </PanelHeader>

            <PanelBody>
              <FilterSection>
                <SectionTitle>
                  <Calendar size={16} />
                  Date Range
                </SectionTitle>
                <DateRangeContainer>
                  <DateInput>
                    <DateIcon />
                    <StyledDateInput
                      type="date"
                      placeholder="Start date"
                      value={localFilters.dateRange.start}
                      onChange={(e) => handleFilterChange('dateRange', {
                        ...localFilters.dateRange,
                        start: e.target.value
                      })}
                    />
                  </DateInput>
                  <DateInput>
                    <DateIcon />
                    <StyledDateInput
                      type="date"
                      placeholder="End date"
                      value={localFilters.dateRange.end}
                      onChange={(e) => handleFilterChange('dateRange', {
                        ...localFilters.dateRange,
                        end: e.target.value
                      })}
                    />
                  </DateInput>
                </DateRangeContainer>
              </FilterSection>

              <FilterSection>
                <SectionTitle>
                  <MapPin size={16} />
                  Locations
                </SectionTitle>
                <LocationList>
                  {locations.map(location => {
                    const count = entries.filter(e => e.location?.name === location).length;
                    return (
                      <LocationItem key={location}>
                        <input
                          type="checkbox"
                          checked={localFilters.locations.includes(location)}
                          onChange={() => handleLocationToggle(location)}
                        />
                        <span className="location-name">{location}</span>
                        <span className="location-count">{count}</span>
                      </LocationItem>
                    );
                  })}
                </LocationList>
              </FilterSection>

              <FilterSection>
                <SectionTitle>
                  <Tag size={16} />
                  Tags
                </SectionTitle>
                <div>
                  {tags.map(tag => (
                    <FilterChip
                      key={tag}
                      $active={localFilters.tags.includes(tag)}
                      onClick={() => handleTagToggle(tag)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {localFilters.tags.includes(tag) && <Check size={14} />}
                      {tag}
                    </FilterChip>
                  ))}
                </div>
              </FilterSection>

              <FilterSection>
                <SectionTitle>
                  Media
                </SectionTitle>
                <div>
                  <FilterChip
                    $active={localFilters.hasMedia === true}
                    onClick={() => handleFilterChange('hasMedia', 
                      localFilters.hasMedia === true ? null : true
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {localFilters.hasMedia === true && <Check size={14} />}
                    With Photos/Videos
                  </FilterChip>
                  <FilterChip
                    $active={localFilters.hasMedia === false}
                    onClick={() => handleFilterChange('hasMedia', 
                      localFilters.hasMedia === false ? null : false
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {localFilters.hasMedia === false && <Check size={14} />}
                    Text Only
                  </FilterChip>
                </div>
              </FilterSection>
            </PanelBody>

            <Footer>
              <TouchButton
                variant="ghost"
                onClick={handleReset}
                style={{ flex: 1 }}
              >
                Reset All
              </TouchButton>
              <TouchButton
                variant="primary"
                onClick={handleApply}
                style={{ flex: 1 }}
              >
                Apply Filters
              </TouchButton>
            </Footer>
          </FilterPanel>
        </>
      )}
    </AnimatePresence>
  );
};