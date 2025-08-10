import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Map, Calendar, BarChart3, Grid3X3, 
  Search, Filter, Plus, Menu
} from 'lucide-react';
import { colors, spacing, shadows, typography, touch } from '../../styles/designSystem';
import { fadeIn, slideInUp, slideInLeft, slideInRight } from '../../styles/animations';
import { useTouchInteractions } from '../../hooks/useTouchInteractions';
import { Navigation } from '../ui/Navigation';
import { TouchButton, FloatingActionButton } from '../ui/TouchButton';
import { TouchCard } from '../ui/TouchCard';
import { EnhancedTimeline } from '../timeline/EnhancedTimeline';
import { EnhancedMapView } from '../map/EnhancedMapView';
import { EnhancedCharts } from '../charts/EnhancedCharts';
import { EnhancedEntryView } from '../entry/EnhancedEntryView';
import { EnhancedFilters } from '../filters/EnhancedFilters';

const DashboardContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, 
    ${colors.sand[50]} 0%, 
    ${colors.ocean[50]} 50%,
    ${colors.sand[100]} 100%
  );
  position: relative;
  overflow-x: hidden;
`;

const ContentWrapper = styled.div`
  padding-top: 80px;
  padding-bottom: 100px;
  
  @media (max-width: 768px) {
    padding-top: 70px;
    padding-bottom: 80px;
  }
`;

const ViewContainer = styled(motion.div)`
  width: 100%;
  min-height: calc(100vh - 180px);
  padding: ${spacing.lg};
  
  @media (max-width: 768px) {
    padding: ${spacing.md};
    min-height: calc(100vh - 150px);
  }
`;

const HeaderSection = styled.div`
  padding: ${spacing.xl} ${spacing.lg};
  text-align: center;
  position: relative;
  
  @media (max-width: 768px) {
    padding: ${spacing.lg} ${spacing.md};
  }
`;

const Title = styled(motion.h1)`
  font-family: ${typography.fontFamily.serif};
  font-size: ${typography.fontSize['4xl']};
  color: ${colors.stone[900]};
  margin-bottom: ${spacing.sm};
  
  @media (max-width: 768px) {
    font-size: ${typography.fontSize['3xl']};
  }
`;

const Subtitle = styled(motion.p)`
  font-size: ${typography.fontSize.lg};
  color: ${colors.stone[600]};
  max-width: 600px;
  margin: 0 auto;
`;

const ViewSwitcher = styled.div`
  display: flex;
  justify-content: center;
  gap: ${spacing.md};
  margin: ${spacing.xl} auto;
  padding: ${spacing.sm};
  background: ${colors.glass};
  backdrop-filter: blur(10px);
  border-radius: 24px;
  border: 1px solid ${colors.glassBorder};
  width: fit-content;
  
  @media (max-width: 768px) {
    gap: ${spacing.sm};
    margin: ${spacing.lg} auto;
    flex-wrap: wrap;
    max-width: 100%;
  }
`;

const ViewButton = styled(TouchButton)`
  ${props => props.$active && `
    background: ${colors.primary};
    color: white;
    
    svg {
      color: white;
    }
  `}
`;

const SearchSection = styled(motion.div)`
  max-width: 600px;
  margin: ${spacing.xl} auto;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${spacing.md} ${spacing.lg};
  padding-left: 56px;
  font-size: ${typography.fontSize.lg};
  border: 2px solid ${colors.glassBorder};
  border-radius: 24px;
  background: ${colors.glass};
  backdrop-filter: blur(10px);
  color: ${colors.stone[900]};
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${colors.primary};
    background: rgba(255, 255, 255, 0.9);
  }
  
  &::placeholder {
    color: ${colors.stone[400]};
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: ${spacing.lg};
  top: 50%;
  transform: translateY(-50%);
  color: ${colors.stone[400]};
  width: 24px;
  height: 24px;
`;

const FilterButton = styled(TouchButton)`
  position: absolute;
  right: ${spacing.sm};
  top: 50%;
  transform: translateY(-50%);
`;

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${spacing.lg};
  max-width: 1200px;
  margin: ${spacing.xl} auto;
  
  @media (max-width: 768px) {
    gap: ${spacing.md};
  }
`;

const StatCard = styled(TouchCard)`
  text-align: center;
  padding: ${spacing.xl};
  background: linear-gradient(135deg, 
    ${colors.glass} 0%, 
    rgba(255, 255, 255, 0.05) 100%
  );
`;

const StatNumber = styled.div`
  font-size: ${typography.fontSize['3xl']};
  font-weight: ${typography.fontWeight.bold};
  color: ${colors.primary};
  margin-bottom: ${spacing.xs};
`;

const StatLabel = styled.div`
  font-size: ${typography.fontSize.sm};
  color: ${colors.stone[600]};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const EmptyState = styled(motion.div)`
  text-align: center;
  padding: ${spacing['2xl']};
  
  img {
    width: 200px;
    height: 200px;
    margin: 0 auto ${spacing.xl};
    opacity: 0.5;
  }
  
  h3 {
    font-size: ${typography.fontSize.xl};
    color: ${colors.stone[700]};
    margin-bottom: ${spacing.md};
  }
  
  p {
    color: ${colors.stone[600]};
    max-width: 400px;
    margin: 0 auto;
  }
`;

export const EnhancedDashboard = ({ entries, onEntryClick, onAddEntry }) => {
  const [currentView, setCurrentView] = useState('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: { start: '', end: '' },
    locations: [],
    tags: [],
    hasMedia: null
  });
  const searchInputRef = useRef(null);

  const views = [
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'map', label: 'Map', icon: Map },
    { id: 'charts', label: 'Analytics', icon: BarChart3 },
    { id: 'grid', label: 'Gallery', icon: Grid3X3 }
  ];

  const stats = [
    { label: 'Total Samples', value: entries.length },
    { label: 'Locations', value: new Set(entries.map(e => e.location?.name)).size },
    { label: 'This Month', value: entries.filter(e => {
      const entryDate = new Date(e.created_at);
      const now = new Date();
      return entryDate.getMonth() === now.getMonth() && 
             entryDate.getFullYear() === now.getFullYear();
    }).length },
    { label: 'Media Items', value: entries.reduce((acc, e) => acc + (e.media?.length || 0), 0) }
  ];

  const filteredEntries = entries.filter(entry => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        entry.title?.toLowerCase().includes(query) ||
        entry.content?.toLowerCase().includes(query) ||
        entry.location?.name?.toLowerCase().includes(query) ||
        entry.location?.address?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      const entryDate = new Date(entry.created_at);
      if (filters.dateRange.start && entryDate < new Date(filters.dateRange.start)) return false;
      if (filters.dateRange.end && entryDate > new Date(filters.dateRange.end)) return false;
    }
    
    // Location filter
    if (filters.locations.length > 0) {
      if (!entry.location?.name || !filters.locations.includes(entry.location.name)) return false;
    }
    
    // Tags filter
    if (filters.tags.length > 0) {
      if (!entry.tags || !filters.tags.some(tag => entry.tags.includes(tag))) return false;
    }
    
    // Media filter
    if (filters.hasMedia !== null) {
      const hasMedia = entry.media && entry.media.length > 0;
      if (filters.hasMedia && !hasMedia) return false;
      if (!filters.hasMedia && hasMedia) return false;
    }
    
    return true;
  });

  const touchHandlers = useTouchInteractions({
    onSwipeLeft: () => {
      const currentIndex = views.findIndex(v => v.id === currentView);
      if (currentIndex < views.length - 1) {
        setCurrentView(views[currentIndex + 1].id);
      }
    },
    onSwipeRight: () => {
      const currentIndex = views.findIndex(v => v.id === currentView);
      if (currentIndex > 0) {
        setCurrentView(views[currentIndex - 1].id);
      }
    }
  });

  const handleEntryClick = (entry) => {
    setSelectedEntry(entry);
  };

  const handleCloseEntry = () => {
    setSelectedEntry(null);
  };

  const renderView = () => {
    switch (currentView) {
      case 'timeline':
        return (
          <EnhancedTimeline 
            entries={filteredEntries} 
            onEntryClick={handleEntryClick}
          />
        );
      case 'map':
        return (
          <EnhancedMapView 
            entries={filteredEntries}
            onMarkerClick={handleEntryClick}
          />
        );
      case 'charts':
        return <EnhancedCharts entries={filteredEntries} />;
      case 'grid':
        return (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05
                }
              }
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: spacing.lg
            }}
          >
            {filteredEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                variants={fadeIn}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
              >
                <TouchCard 
                  floating
                  onClick={() => handleEntryClick(entry)}
                  style={{ height: '100%', cursor: 'pointer' }}
                >
                  {entry.media?.[0] && (
                    <img 
                      src={entry.media[0].url} 
                      alt={entry.title}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '12px',
                        marginBottom: spacing.md
                      }}
                    />
                  )}
                  <h3 style={{ marginBottom: spacing.sm }}>{entry.title}</h3>
                  <p style={{ 
                    color: colors.stone[600],
                    fontSize: typography.fontSize.sm,
                    lineHeight: 1.6
                  }}>
                    {entry.content?.substring(0, 100)}...
                  </p>
                </TouchCard>
              </motion.div>
            ))}
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardContainer>
      <Navigation />
      
      <ContentWrapper>
        <HeaderSection>
          <Title
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Sand Collection
          </Title>
          <Subtitle
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            A journey through time and space, one grain at a time
          </Subtitle>
        </HeaderSection>

        <StatsGrid
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
            >
              <StatCard floating>
                <StatNumber>{stat.value}</StatNumber>
                <StatLabel>{stat.label}</StatLabel>
              </StatCard>
            </motion.div>
          ))}
        </StatsGrid>

        <SearchSection
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <SearchIcon />
          <SearchInput
            ref={searchInputRef}
            type="text"
            placeholder="Search your collection..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <FilterButton
            variant="ghost"
            size="sm"
            icon={<Filter size={20} />}
            onClick={() => setShowFilters(true)}
          />
        </SearchSection>

        <ViewSwitcher>
          {views.map((view) => (
            <ViewButton
              key={view.id}
              variant={currentView === view.id ? 'primary' : 'ghost'}
              size="sm"
              icon={<view.icon size={18} />}
              onClick={() => setCurrentView(view.id)}
              $active={currentView === view.id}
            >
              {view.label}
            </ViewButton>
          ))}
        </ViewSwitcher>

        <ViewContainer {...touchHandlers}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {filteredEntries.length === 0 ? (
                <EmptyState
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <h3>No entries found</h3>
                  <p>
                    {searchQuery 
                      ? "Try adjusting your search terms"
                      : "Start your collection by adding your first sand sample"
                    }
                  </p>
                </EmptyState>
              ) : (
                renderView()
              )}
            </motion.div>
          </AnimatePresence>
        </ViewContainer>
      </ContentWrapper>

      <FloatingActionButton
        icon={<Plus size={24} />}
        onClick={onAddEntry}
      />

      <AnimatePresence>
        {selectedEntry && (
          <EnhancedEntryView
            entry={selectedEntry}
            onClose={handleCloseEntry}
          />
        )}
      </AnimatePresence>

      <EnhancedFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
        entries={entries}
      />
    </DashboardContainer>
  );
};