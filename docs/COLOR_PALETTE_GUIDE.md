# Color Palette Guide

## Current Issues
1. **Mountain vs Desert**: Too similar (both orange-ish)
2. **Missing Ruin**: Need a 6th distinct color
3. **LED visibility**: Some colors don't translate well to LEDs

## Proposed Color Schemes

### Proposal 1: Natural Palette
Focuses on realistic, nature-inspired colors with good LED translation.

| Type | UI Color | LED Color | Rationale |
|------|----------|-----------|-----------|
| Beach | #F4A460 (Sandy Brown) | #FFD700 (Gold) | Warm, sandy beach tones |
| Desert | #DC143C (Crimson) | #FF1493 (Deep Pink) | Red rock desert, oxidized sand |
| Lake | #4682B4 (Steel Blue) | #00CED1 (Dark Turquoise) | Deep water, mineral-rich |
| Mountain | #8B4513 (Saddle Brown) | #FF8C00 (Dark Orange) | Earthy soil, autumn mountains |
| River | #20B2AA (Light Sea Green) | #00FA9A (Spring Green) | Algae, river vegetation |
| Ruin | #708090 (Slate Gray) | #9370DB (Medium Purple) | Ancient stone, mystical |

**Advantages:**
- Thematically appropriate
- Good separation across color wheel
- Natural-looking on UI
- Distinct on LEDs

### Proposal 2: Vibrant Palette
Maximum contrast using primary/secondary colors for LEDs.

| Type | UI Color | LED Color | Rationale |
|------|----------|-----------|-----------|
| Beach | #DEB887 (Burlywood) | #FFFF00 (Yellow) | Maximum brightness |
| Desert | #CD5C5C (Indian Red) | #FF0000 (Red) | Pure red for heat |
| Lake | #5F9EA0 (Cadet Blue) | #00FFFF (Cyan) | Pure water color |
| Mountain | #A0522D (Sienna) | #FFA500 (Orange) | Distinct from red/yellow |
| River | #2E8B57 (Sea Green) | #00FF00 (Lime) | Vibrant life |
| Ruin | #4B0082 (Indigo) | #FF00FF (Magenta) | Maximum mystery |

**Advantages:**
- Maximum LED visibility
- Uses RGB primaries
- No ambiguity between colors
- Even spread on color wheel

## Color Theory Considerations

### Distribution Strategy
- **60° separation**: Colors spread evenly around the color wheel
- **Warm/Cool balance**: 3 warm (Beach, Desert, Mountain) and 3 cool (Lake, River, Ruin)
- **Saturation levels**: UI colors are muted for screen comfort, LED colors are saturated for visibility

### LED Specific Adjustments
1. **Avoid browns on LEDs**: They appear white/bland
2. **Use pure hues**: RGB LEDs work best with primary/secondary colors
3. **Consider brightness**: Yellow appears brightest, blue appears dimmest

## Implementation Plan

1. **Test on hardware**: Use the color tuning utility to verify LED appearance
2. **A/B testing**: Deploy both proposals to /debug route
3. **User feedback**: Get input on which feels most intuitive
4. **Accessibility**: Ensure sufficient contrast for colorblind users

## Accessibility Notes

### Colorblind Considerations
- **Deuteranopia** (red-green): Desert/River distinction maintained through brightness
- **Protanopia** (red-blind): Pink/Purple distinction maintained
- **Tritanopia** (blue-blind): Yellow/Green distinction maintained

### Additional Cues
Consider adding:
- Icons for each type
- Patterns or textures
- Text labels in UI

## Migration Path

1. Add Ruin to existing entries as "Unknown" type
2. Update color scheme in phases:
   - Phase 1: Add Ruin color
   - Phase 2: Update Mountain/Desert separation
   - Phase 3: Full palette update if needed

## Testing Commands

```bash
# Deploy and test
./deploy.sh

# View comparison at
http://192.168.1.114/debug

# Test LED colors
cd tests/manual
python tune_led_colors.py
```