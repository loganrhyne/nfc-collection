import React, { useState } from 'react';
import { colorSchemeEnhanced as currentScheme } from '../../utils/colorSchemeEnhanced';

const ColorProposalComparison = () => {
  const [selectedProposal, setSelectedProposal] = useState('proposal1');
  
  // Current scheme (5 colors)
  const current = {
    'Beach': { ui: '#E6C200', led: '#FFD700' },
    'Desert': { ui: '#E67300', led: '#FF4500' },
    'Lake': { ui: '#00B3B3', led: '#00FFFF' },
    'Mountain': { ui: '#996633', led: '#FF6B35' },
    'River': { ui: '#0099FF', led: '#0080FF' },
    'Ruin': { ui: '#666666', led: '#666666' } // Placeholder
  };
  
  // Proposal 1: Spread across color wheel
  const proposal1 = {
    'Beach': { ui: '#F4A460', led: '#FFD700' },      // Sandy/Gold
    'Desert': { ui: '#DC143C', led: '#FF1493' },     // Crimson/Pink
    'Lake': { ui: '#4682B4', led: '#00CED1' },       // Blue/Turquoise
    'Mountain': { ui: '#8B4513', led: '#FF8C00' },   // Brown/Orange
    'River': { ui: '#20B2AA', led: '#00FA9A' },      // Teal/Green
    'Ruin': { ui: '#708090', led: '#9370DB' }        // Gray/Purple
  };
  
  // Proposal 2: Maximum contrast
  const proposal2 = {
    'Beach': { ui: '#DEB887', led: '#FFFF00' },      // Burlywood/Yellow
    'Desert': { ui: '#CD5C5C', led: '#FF0000' },     // Indian Red/Red
    'Lake': { ui: '#5F9EA0', led: '#00FFFF' },       // Cadet Blue/Cyan
    'Mountain': { ui: '#A0522D', led: '#FFA500' },   // Sienna/Orange
    'River': { ui: '#2E8B57', led: '#00FF00' },      // Sea Green/Lime
    'Ruin': { ui: '#4B0082', led: '#FF00FF' }        // Indigo/Magenta
  };
  
  // Proposal 3: User-specified palette
  const proposal3 = {
    'Beach': { ui: '#E6B877', led: '#FFA028' },      // Amber
    'Desert': { ui: '#E78A7E', led: '#FF5A3C' },     // Coral
    'Lake': { ui: '#80BFC6', led: '#00B4C8' },       // Teal
    'Mountain': { ui: '#A7C4A0', led: '#50C878' },   // Sage
    'River': { ui: '#7A89C2', led: '#5A5AFF' },      // Indigo
    'Ruin': { ui: '#B58ABF', led: '#B43CDC' }        // Plum
  };
  
  const schemes = {
    current: { name: 'Current (5 colors)', data: current },
    proposal1: { name: 'Proposal 1: Natural', data: proposal1 },
    proposal2: { name: 'Proposal 2: Vibrant', data: proposal2 },
    proposal3: { name: 'Proposal 3: Harmonious', data: proposal3 }
  };
  
  const types = ['Beach', 'Desert', 'Lake', 'Mountain', 'River', 'Ruin'];
  
  return (
    <div className="color-proposal-comparison p-4 bg-gray-900 rounded-lg">
      <h3 className="text-lg font-bold text-white mb-4">Color Scheme Proposals</h3>
      
      {/* Scheme selector */}
      <div className="mb-6">
        <label className="text-white mr-4">Select Scheme:</label>
        <select 
          value={selectedProposal} 
          onChange={(e) => setSelectedProposal(e.target.value)}
          className="bg-gray-800 text-white px-3 py-1 rounded"
        >
          {Object.entries(schemes).map(([key, scheme]) => (
            <option key={key} value={key}>{scheme.name}</option>
          ))}
        </select>
      </div>
      
      {/* Color display */}
      <div className="space-y-3">
        {types.map(type => {
          const colors = schemes[selectedProposal].data[type];
          return (
            <div key={type} className="flex items-center space-x-4">
              <div className="w-20 text-white font-medium">{type}</div>
              
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-400 w-12">UI:</div>
                <div 
                  className="w-24 h-10 rounded border-2 border-gray-600 flex items-center justify-center text-xs font-mono"
                  style={{ 
                    backgroundColor: colors.ui, 
                    color: isColorLight(colors.ui) ? '#000' : '#FFF' 
                  }}
                >
                  {colors.ui}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-400 w-12">LED:</div>
                <div 
                  className="w-24 h-10 rounded border-2 border-gray-600 flex items-center justify-center text-xs font-mono"
                  style={{ 
                    backgroundColor: colors.led, 
                    color: isColorLight(colors.led) ? '#000' : '#FFF' 
                  }}
                >
                  {colors.led}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Comparison grid */}
      <div className="mt-8">
        <h4 className="text-white font-semibold mb-3">Side-by-Side Comparison</h4>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(schemes).map(([key, scheme]) => (
            <div key={key} className="bg-gray-800 p-3 rounded">
              <h5 className="text-sm text-gray-300 mb-2">{scheme.name}</h5>
              <div className="space-y-1">
                {types.map(type => (
                  <div key={type} className="flex items-center space-x-1">
                    <div 
                      className="w-8 h-6 rounded"
                      style={{ backgroundColor: scheme.data[type].ui }}
                      title={`${type} UI`}
                    />
                    <div 
                      className="w-8 h-6 rounded"
                      style={{ backgroundColor: scheme.data[type].led }}
                      title={`${type} LED`}
                    />
                    <span className="text-xs text-gray-400 ml-1">{type.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Design rationale */}
      <div className="mt-6 p-3 bg-gray-800 rounded text-sm text-gray-300">
        <p className="font-semibold mb-2">Design Rationale:</p>
        <div className="space-y-2 text-xs">
          <div>
            <strong>Proposal 1 (Natural):</strong>
            <ul className="ml-4 mt-1">
              <li>• Beach: Sandy brown → Gold (warm, natural)</li>
              <li>• Desert: Crimson → Pink (hot, oxidized)</li>
              <li>• Lake: Steel blue → Turquoise (deep water)</li>
              <li>• Mountain: Saddle brown → Orange (earthy)</li>
              <li>• River: Sea green → Spring green (life/algae)</li>
              <li>• Ruin: Slate gray → Purple (ancient/mystical)</li>
            </ul>
          </div>
          <div className="mt-3">
            <strong>Proposal 2 (Vibrant):</strong>
            <ul className="ml-4 mt-1">
              <li>• Uses pure RGB primaries for LEDs (maximum pop)</li>
              <li>• Spreads evenly across color wheel</li>
              <li>• Maximum contrast between adjacent types</li>
            </ul>
          </div>
          <div className="mt-3">
            <strong>Proposal 3 (Harmonious):</strong>
            <ul className="ml-4 mt-1">
              <li>• Beach: Amber - warm golden sand</li>
              <li>• Desert: Coral - sunset desert hues</li>
              <li>• Lake: Teal - pristine water</li>
              <li>• Mountain: Sage - living mountain vegetation</li>
              <li>• River: Indigo - deep flowing water</li>
              <li>• Ruin: Plum - mysterious ancient sites</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to determine if a color is light or dark
function isColorLight(color) {
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}

export default ColorProposalComparison;