// Harmonious color scheme - Proposal 3
// A balanced palette with warm and cool tones

const colorSchemeHarmonious = {
  'Beach': {
    ui: '#E6B877',      // Amber - warm golden sand
    led: '#FFA028',     // Bright amber for LEDs (RGB: 255, 160, 40)
    description: 'Amber - warm golden sand'
  },
  'Desert': {
    ui: '#E78A7E',      // Coral - sunset desert
    led: '#FF5A3C',     // Vibrant coral for LEDs (RGB: 255, 90, 60)
    description: 'Coral - sunset desert hues'
  },
  'Lake': {
    ui: '#80BFC6',      // Teal - pristine water
    led: '#00B4C8',     // Bright teal for LEDs (RGB: 0, 180, 200)
    description: 'Teal - pristine lake water'
  },
  'Mountain': {
    ui: '#A7C4A0',      // Sage - mountain vegetation
    led: '#50C878',     // Vibrant sage green for LEDs (RGB: 80, 200, 120)
    description: 'Sage - living mountain vegetation'
  },
  'River': {
    ui: '#7A89C2',      // Indigo - deep water
    led: '#5A5AFF',     // Bright indigo for LEDs (RGB: 90, 90, 255)
    description: 'Indigo - deep flowing water'
  },
  'Ruin': {
    ui: '#B58ABF',      // Plum - mysterious ancient
    led: '#B43CDC',     // Vibrant plum for LEDs (RGB: 180, 60, 220)
    description: 'Plum - mysterious ancient sites'
  }
};

// Export functions for compatibility
export const getUIColor = (type) => {
  return colorSchemeHarmonious[type]?.ui || '#FFFFFF';
};

export const getLEDColor = (type) => {
  return colorSchemeHarmonious[type]?.led || '#FFFFFF';
};

// For backward compatibility
export const colorScheme = Object.keys(colorSchemeHarmonious).reduce((acc, key) => {
  acc[key] = colorSchemeHarmonious[key].ui;
  return acc;
}, {});

export default colorScheme;
export { colorSchemeHarmonious };