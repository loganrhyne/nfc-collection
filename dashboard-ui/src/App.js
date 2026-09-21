import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
} from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import { WebSocketProvider } from "./hooks/useWebSocket";
import ErrorBoundary from "./components/ErrorBoundary";
import Archive from "./components/layout/Archive";
import EntryView from "./components/entry/EntryView";
import NFCScanner from "./components/nfc/NFCScanner";
import WebSocketStatus from "./components/nfc/WebSocketStatus";
import LEDModePill from "./components/led/LEDModePill";
import VersionInfo from "./components/VersionInfo";
import DebugPage from "./components/debug/DebugPage";
import LEDDebugPanel from "./components/debug/LEDDebugPanel";
import "./styles/mediaGrid.css";
import "./styles/videoPlayer.css";
import "./App.css";

function AppContent() {
  const { pathname } = useLocation();
  return (
    <div className="strata-app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="archive-header">
        <NavLink to="/" className="brand" aria-label="STRATA archive home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            STRATA<small>THE SAND ARCHIVE</small>
          </span>
        </NavLink>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            Explore the collection
          </NavLink>
          {pathname.startsWith("/entry/") && (
            <span className="current-page">/ Field note</span>
          )}
        </nav>
        <div className="header-caption">
          <span>Earth, gathered.</span>
          <small>A PERSONAL NATURAL HISTORY</small>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Archive />} />
        <Route path="/entry/:entryId" element={<EntryView />} />
        <Route path="/debug" element={<DebugPage />} />
      </Routes>
      <footer className="archive-footer">
        <div className="reader-prompt">
          <span className="reader-icon" aria-hidden="true">
            ◎
          </span>
          Place a specimen on the reader to open its story.
        </div>
        <div className="system-controls">
          <VersionInfo />
          <LEDModePill />
          <WebSocketStatus />
        </div>
      </footer>
      <NFCScanner />
      {window.location.search.includes("debug=led") && <LEDDebugPanel />}
    </div>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <DataProvider>
          <WebSocketProvider>
            <AppContent />
          </WebSocketProvider>
        </DataProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
