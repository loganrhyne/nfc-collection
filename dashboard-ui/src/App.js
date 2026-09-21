import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
  return (
    <div className="strata-app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
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
