// Proposed enhanced color scheme with 6 distinct colors
// Designed for clear differentiation on both UI and LED displays

const colorSchemeProposal = {
  'Beach': {
    ui: '#F4A460',      // Sandy brown - more realistic beach sand
    led: '#FFD700',     // Gold - bright and warm on LEDs
    description: 'Warm sandy beach'
  },
  'Desert': {
    ui: '#DC143C',      // Crimson - red desert sands
    led: '#FF1493',     // Deep pink - vibrant and distinct from orange
    description: 'Red desert dunes'
  },
  'Lake': {
    ui: '#4682B4',      // Steel blue - deeper lake water
    led: '#00CED1',     // Dark turquoise - vibrant aqua on LEDs
    description: 'Deep lake waters'
  },
  'Mountain': {
    ui: '#8B4513',      // Saddle brown - earthy mountain soil
    led: '#FF8C00',     // Dark orange - warm earth tone on LEDs
    description: 'Mountain earth'
  },
  'River': {
    ui: '#20B2AA',      // Light sea green - river with algae/minerals
    led: '#00FA9A',     // Medium spring green - bright green on LEDs
    description: 'River minerals'
  },
  'Ruin': {
    ui: '#708090',      // Slate gray - ancient stone
    led: '#9370DB',     // Medium purple - mystical/ancient on LEDs
    description: 'Ancient ruins'
  }
};

// Alternative proposal with even more distinction
const colorSchemeAlternative = {
  'Beach': {
    ui: '#DEB887',      // Burlywood - natural sand
    led: '#FFFF00',     // Pure yellow - maximum brightness
    description: 'Golden sand'
  },
  'Desert': {
    ui: '#CD5C5C',      // Indian red - oxidized sand
    led: '#FF0000',     // Pure red - maximum contrast
    description: 'Red rock desert'
  },
  'Lake': {
    ui: '#5F9EA0',      // Cadet blue - lake depth
    led: '#00FFFF',     // Cyan - pure water color
    description: 'Lake depths'
  },
  'Mountain': {
    ui: '#A0522D',      // Sienna - mountain soil
    led: '#FFA500',     // Orange - autumn mountain
    description: 'Mountain soil'
  },
  'River': {
    ui: '#2E8B57',      // Sea green - river vegetation
    led: '#00FF00',     // Lime - bright vegetation
    description: 'River life'
  },
  'Ruin': {
    ui: '#4B0082',      // Indigo - mysterious ancient
    led: '#FF00FF',     // Magenta - mystical glow
    description: 'Ancient mystery'
  }
};

// Export the main proposal
export const colorSchemeEnhanced = colorSchemeProposal;

// Color theory notes:
// - Beach: Yellow/Gold family - warm, sandy
// - Desert: Red/Pink family - hot, oxidized
// - Lake: Blue/Cyan family - cool, deep
// - Mountain: Orange/Brown family - earthy
// - River: Green family - life, vegetation
// - Ruin: Purple/Gray family - ancient, mysterious

// LED considerations:
// - Using more saturated colors for LEDs
// - Avoiding similar hues (spread across color wheel)
// - Primary and secondary colors work best on RGB LEDs

export default colorSchemeProposal;