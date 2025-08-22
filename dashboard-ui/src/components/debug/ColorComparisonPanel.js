import React from 'react';
import { colorSchemeEnhanced } from '../../utils/colorSchemeEnhanced';

const ColorComparisonPanel = () => {
  const sampleTypes = Object.keys(colorSchemeEnhanced);
  
  return (
    <div className="color-comparison-panel p-4 bg-gray-900 rounded-lg">
      <h3 className="text-lg font-bold text-white mb-4">Color Scheme Comparison</h3>
      <div className="space-y-3">
        {sampleTypes.map(type => {
          const colors = colorSchemeEnhanced[type];
          return (
            <div key={type} className="flex items-center space-x-4">
              <div className="w-24 text-white font-medium">{type}</div>
              
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-400 w-16">UI:</div>
                <div 
                  className="w-20 h-8 rounded border border-gray-600 flex items-center justify-center text-xs font-mono"
                  style={{ backgroundColor: colors.ui, color: '#000' }}
                >
                  {colors.ui}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-400 w-16">LED:</div>
                <div 
                  className="w-20 h-8 rounded border border-gray-600 flex items-center justify-center text-xs font-mono"
                  style={{ backgroundColor: colors.led, color: '#000' }}
                >
                  {colors.led}
                </div>
              </div>
              
              <div className="text-sm text-gray-400 italic">
                {colors.description}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 p-3 bg-gray-800 rounded text-sm text-gray-300">
        <p className="font-semibold mb-2">Color Mapping Strategy:</p>
        <ul className="space-y-1 text-xs">
          <li>• UI colors are optimized for screen readability</li>
          <li>• LED colors are adjusted for WS2812B RGB LED characteristics</li>
          <li>• Mountain uses burnt orange (#FF6B35) instead of brown for better LED visibility</li>
          <li>• Beach and Lake use more saturated colors for LED pop</li>
        </ul>
      </div>
    </div>
  );
};

export default ColorComparisonPanel;