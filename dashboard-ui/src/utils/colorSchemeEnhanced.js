// Harmonious color scheme with separate UI and LED colors
// A balanced palette with warm and cool tones that are clearly distinct
// UI colors are optimized for screen display
// LED colors are optimized for WS2812B RGB LED appearance

const colorSchemeEnhanced = {
  'Beach': {
    ui: '#E6B877',      // Amber - warm golden sand
    led: '#FFC800',     // Strong golden yellow (RGB: 255, 200, 0)
    description: 'Amber - warm golden sand'
  },
  'Desert': {
    ui: '#E78A7E',      // Coral - sunset desert
    led: '#FF2814',     // Hotter coral red-orange (RGB: 255, 40, 20)
    description: 'Coral - sunset desert hues'
  },
  'Lake': {
    ui: '#80BFC6',      // Teal - pristine water
    led: '#00FFFF',     // Electric cyan (RGB: 0, 255, 255)
    description: 'Teal - pristine lake water'
  },
  'Mountain': {
    ui: '#A7C4A0',      // Sage - mountain vegetation
    led: '#32FF64',     // Vivid spring green (RGB: 50, 255, 100)
    description: 'Sage - living mountain vegetation'
  },
  'River': {
    ui: '#7A89C2',      // Indigo - deep water
    led: '#2846FF',     // Intense deep blue (RGB: 40, 70, 255)
    description: 'Indigo - deep flowing water'
  },
  'Ruin': {
    ui: '#B58ABF',      // Plum - mysterious ancient
    led: '#DC28FF',     // Bright magenta-violet (RGB: 220, 40, 255)
    description: 'Plum - mysterious ancient sites'
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