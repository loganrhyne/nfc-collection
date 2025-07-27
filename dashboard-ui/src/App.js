import React, { useState, useEffect } from 'react';
import { DataProvider } from './context/DataContext';
import DashboardLayout from './components/layout/DashboardLayout';
import TypeBarChart from './components/charts/TypeBarChart';
import RegionBarChart from './components/charts/RegionBarChart';
import TimelineChart from './components/charts/TimelineChart';
import MapView from './components/map/MapView';
import VerticalTimeline from './components/timeline/VerticalTimeline';
import JournalEntryDetail from './components/entry/JournalEntryDetail';
import EntryView from './components/entry/EntryView';
import NfcHandler from './components/nfc/NfcHandler';
import ActiveFilters from './components/filters/ActiveFilters';
import './App.css';

function App() {
  const [showEntryView, setShowEntryView] = useState(false);
  const [entryIdFromUrl, setEntryIdFromUrl] = useState(null);

  // Check URL for entry_id parameter on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const entryId = urlParams.get('entry_id');
    if (entryId) {
      setEntryIdFromUrl(entryId);
      setShowEntryView(true);
    }
  }, []);

  // Handle entry selection
  const handleEntrySelection = (selected) => {
    if (selected) {
      setShowEntryView(true);
      // Update URL with entry_id parameter without page reload
      const url = new URL(window.location);
      url.searchParams.set('entry_id', selected.uuid);
      window.history.pushState({}, '', url);
    }
  };

  // Handle return to dashboard
  const handleReturnToDashboard = () => {
    setShowEntryView(false);
    // Remove entry_id parameter from URL without page reload
    const url = new URL(window.location);
    url.searchParams.delete('entry_id');
    window.history.pushState({}, '', url);
  };

  // Content for the left column (filters)
  const renderLeftColumnContent = () => (
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
  const renderMapContent = () => (
    <>
      <ActiveFilters />
      <MapView />
    </>
  );

  // Content for the timeline chart (center bottom)
  const renderTimelineChartContent = () => (
    <TimelineChart />
  );

  // Content for the right column (always the timeline)
  const renderRightColumnContent = () => (
    <VerticalTimeline onEntrySelect={handleEntrySelection} />
  );

  return (
    <DataProvider entryIdFromUrl={entryIdFromUrl}>
      <div className="App">
        {showEntryView ? (
          <EntryView onReturn={handleReturnToDashboard} />
        ) : (
          <DashboardLayout
            leftColumnContent={renderLeftColumnContent()}
            mapContent={renderMapContent()}
            timelineChartContent={renderTimelineChartContent()}
            rightColumnContent={renderRightColumnContent()}
          />
        )}
        <NfcHandler />
      </div>
    </DataProvider>
  );
}

export default App;
