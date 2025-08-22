// Enhanced color scheme with separate UI and LED colors
// UI colors are optimized for screen display
// LED colors are optimized for WS2812B RGB LED appearance

const colorSchemeEnhanced = {
  'Beach': {
    ui: '#E6C200',      // Golden yellow - great on screen
    led: '#FFD700',     // Brighter gold for LEDs
    description: 'Golden sand'
  },
  'Desert': {
    ui: '#E67300',      // Orange-red - distinctive on screen
    led: '#FF4500',     // More saturated orange-red for LEDs
    description: 'Desert sand'
  },
  'Lake': {
    ui: '#00B3B3',      // Turquoise - beautiful on screen
    led: '#00FFFF',     // Cyan - pops on LEDs
    description: 'Lake shore'
  },
  'Mountain': {
    ui: '#996633',      // Brown - looks earthy on screen
    led: '#FF6B35',     // Burnt orange - better than brown on LEDs
    description: 'Mountain earth'
  },
  'River': {
    ui: '#0099FF',      // Blue - clear on screen
    led: '#0080FF',     // Slightly deeper blue for LEDs
    description: 'River bank'
  }
};

// Backward compatibility functions
export const getUIColor = (type) => {
  return colorSchemeEnhanced[type]?.ui || '#FFFFFF';
};

export const getLEDColor = (type) => {
  return colorSchemeEnhanced[type]?.led || '#FFFFFF';
};

// For backward compatibility with existing colorScheme imports
export const colorScheme = Object.keys(colorSchemeEnhanced).reduce((acc, key) => {
  acc[key] = colorSchemeEnhanced[key].ui;
  return acc;
}, {});

export default colorScheme;

// Export the enhanced scheme for components that want full access
export { colorSchemeEnhanced };