import React from 'react';
import ColorComparisonPanel from './ColorComparisonPanel';
import ColorProposalComparison from './ColorProposalComparison';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useLEDController } from '../../hooks/useLEDController';

const DebugPage = () => {
  const { connected } = useWebSocket();
  const { clearAllLEDs } = useLEDController();
  
  return (
    <div className="debug-page p-8 bg-gray-950 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Debug Tools</h1>
        
        <div className="grid gap-8">
          {/* WebSocket Status */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3">WebSocket Status</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-300">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          
          {/* Color Comparison */}
          <ColorComparisonPanel />
          
          {/* Color Proposals */}
          <ColorProposalComparison />
          
          {/* LED Test Controls */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3">LED Test Controls</h2>
            <div className="space-y-3">
              <button
                onClick={clearAllLEDs}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Clear All LEDs
              </button>
              <p className="text-sm text-gray-400">
                Select different journal entries in the main view to test LED colors
              </p>
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3">Quick Links</h2>
            <div className="space-y-2">
              <a href="/" className="block text-blue-400 hover:text-blue-300">← Back to Dashboard</a>
              <a href="/entry/sample" className="block text-blue-400 hover:text-blue-300">Sample Entry View</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPage;