#!/bin/bash
# Wrapper to run NFC test with proper virtual environment

echo "Testing NFC Connection Modes"
echo "============================"

# Check if venv exists
VENV_PATH="$HOME/nfc-collection/python-services/venv"

if [ ! -d "$VENV_PATH" ]; then
    echo "❌ Virtual environment not found!"
    echo "   Run: ./install_nfc_pi.sh first"
    exit 1
fi

# Check if libraries are installed
if [ ! -d "$VENV_PATH/lib/python"* ]; then
    echo "❌ No Python libraries in venv!"
    echo "   Run: ./install_nfc_pi.sh first"
    exit 1
fi

echo "✅ Using virtual environment at: $VENV_PATH"
echo ""

# Run the test using venv Python
"$VENV_PATH/bin/python" test_both_modes.py