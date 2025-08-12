import React, { useCallback, useEffect } from 'react';
import './styles/mediaGrid.css';
import './styles/videoPlayer.css';
import { logEnvironmentInfo } from './utils/debug';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import DashboardLayout from './components/layout/DashboardLayout';
import TypeBarChart from './components/charts/TypeBarChart';
import RegionBarChart from './components/charts/RegionBarChart';
import TimelineChart from './components/charts/TimelineChart';
import MapView from './components/map/MapView';
import VerticalTimeline from './components/timeline/VerticalTimeline';
import EntryView from './components/entry/EntryView';
import NfcHandler from './components/nfc/NfcHandler';
import NFCScanner from './components/nfc/NFCScanner';
import ActiveFilters from './components/filters/ActiveFilters';
import './App.css';

/**
 * Main Dashboard component showing charts and map view
 */
function Dashboard() {
  const navigate = useNavigate();
  
  // Handle navigation to entry view (separate from selection)
  const handleNavigateToEntryView = useCallback((entry) => {
    if (entry && entry.uuid) {
      navigate(`/entry/${entry.uuid}`);
    }
  }, [navigate]);
  
  // Content for the left column (filters)
  const leftColumnContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <h3 style={{ marginBottom: '8px' }}>Type</h3>
        <div style={{ flex: 1, minHeight: 0 }}>
          <TypeBarChart />
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <h3 style={{ marginTop: '16px', marginBottom: '8px' }}>Region</h3>
        <div style={{ flex: 1, minHeight: 0 }}>
          <RegionBarChart />
        </div>
      </div>
    </div>
  );

  // Content for the map section (center top)
  const mapContent = (
    <>
      <ActiveFilters />
      <MapView />
    </>
  );

  // Content for the timeline chart (center bottom)
  const timelineChartContent = (
    <TimelineChart />
  );

  // Content for the right column (always the timeline)
  const rightColumnContent = (
    <VerticalTimeline onEntrySelect={handleNavigateToEntryView} />
  );

  return (
    <DashboardLayout
      leftColumnContent={leftColumnContent}
      mapContent={mapContent}
      timelineChartContent={timelineChartContent}
      rightColumnContent={rightColumnContent}
    />
  );
}

/**
 * Entry detail view component with proper navigation
 */
function EntryDetailView() {
  const { entryId } = useParams();
  const navigate = useNavigate();
  
  // Handle return to dashboard - with state to prevent loops
  const handleReturnToDashboard = useCallback(() => {
    // Force a complete state reset and route change
    navigate('/', { 
      replace: true,  // Replace history entry instead of pushing
      state: { 
        resetView: true  // Flag to indicate a full reset
      }
    });
  }, [navigate]);
  
  return <EntryView entryId={entryId} onReturn={handleReturnToDashboard} />;
}

// Wrapper around DataProvider to handle shared state between routes
function AppContent() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/entry/:entryId" element={<EntryDetailView />} />
      </Routes>
      <NfcHandler />
      <NFCScanner />
    </div>
  );
}

/**
 * Main app component that sets up routes
 */
function App() {
  // Log environment information on startup
  useEffect(() => {
    logEnvironmentInfo();
    console.log('🔍 Data files should be in:', `${window.location.origin}/data/`);
  }, []);
  return (
    <Router>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </Router>
  );
}

export default App;