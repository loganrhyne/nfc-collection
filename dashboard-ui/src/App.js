import React, { useState } from 'react';
import { DataProvider } from './context/DataContext';
import DashboardLayout from './components/layout/DashboardLayout';
import TypeBarChart from './components/charts/TypeBarChart';
import RegionBarChart from './components/charts/RegionBarChart';
import TimelineChart from './components/charts/TimelineChart';
import MapView from './components/map/MapView';
import VerticalTimeline from './components/timeline/VerticalTimeline';
import JournalEntryDetail from './components/entry/JournalEntryDetail';
import NfcHandler from './components/nfc/NfcHandler';
import './App.css';

function App() {
  const [showEntryDetail, setShowEntryDetail] = useState(false);

  // Content for the left column (filters)
  const renderLeftColumnContent = () => (
    <div>
      <h3>Type Distribution</h3>
      <TypeBarChart />
      
      <h3 style={{ marginTop: '24px' }}>Region Distribution</h3>
      <RegionBarChart />
    </div>
  );

  // Content for the map section (center top)
  const renderMapContent = () => (
    <MapView />
  );

  // Content for the timeline chart (center bottom)
  const renderTimelineChartContent = () => (
    <TimelineChart />
  );

  // Content for the right column (entries list or detail)
  const renderRightColumnContent = () => (
    showEntryDetail ? <JournalEntryDetail /> : <VerticalTimeline />
  );

  return (
    <DataProvider>
      <div className="App">
        <DashboardLayout
          leftColumnContent={renderLeftColumnContent()}
          mapContent={renderMapContent()}
          timelineChartContent={renderTimelineChartContent()}
          rightColumnContent={renderRightColumnContent()}
        />
        <NfcHandler />
      </div>
    </DataProvider>
  );
}

export default App;
