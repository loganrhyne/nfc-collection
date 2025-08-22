#!/bin/bash
# Script to switch between color scheme proposals

set -e

echo "=== Color Scheme Switcher ==="
echo ""
echo "Available schemes:"
echo "1. Current (original 5 colors)"
echo "2. Natural (Proposal 1)"
echo "3. Vibrant (Proposal 2)"
echo "4. Harmonious (Proposal 3)"
echo ""

read -p "Select scheme (1-4): " choice

case $choice in
    1)
        SCHEME="original"
        JS_FILE="colorScheme.js"
        PY_FILE="led_colors.py"
        ;;
    2)
        SCHEME="natural"
        JS_FILE="colorSchemeEnhanced.js"
        PY_FILE="led_colors.py"
        ;;
    3)
        SCHEME="vibrant"
        echo "Note: Vibrant scheme not yet implemented as separate files"
        exit 1
        ;;
    4)
        SCHEME="harmonious"
        JS_FILE="colorSchemeHarmonious.js"
        PY_FILE="led_colors_harmonious.py"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "Switching to $SCHEME color scheme..."

# Update the imports
if [ "$SCHEME" == "harmonious" ]; then
    # Update JavaScript imports
    echo "Updating JavaScript imports..."
    
    # Update useLEDController.js
    sed -i.bak "s|from '../utils/colorScheme.*'|from '../utils/colorSchemeHarmonious'|g" \
        dashboard-ui/src/hooks/useLEDController.js
    
    # Update other components to use harmonious scheme
    find dashboard-ui/src/components -name "*.js" -exec \
        sed -i.bak "s|from '.*/utils/colorScheme'|from '../../utils/colorSchemeHarmonious'|g" {} \;
    
    # Update Python LED colors
    echo "Updating Python LED colors..."
    cp python-services/services/led_colors_harmonious.py python-services/services/led_colors.py
    
    echo ""
    echo "✓ Switched to Harmonious color scheme"
    echo ""
    echo "Next steps:"
    echo "1. Rebuild the React app: cd dashboard-ui && npm run build"
    echo "2. Deploy to Pi: ./deploy.sh"
    echo "3. Test at: http://192.168.1.114/debug"
else
    echo "Scheme switching for $SCHEME not yet implemented"
fi