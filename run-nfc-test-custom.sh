#!/bin/bash
# Script to run NFC testing scripts within the virtual environment
# This version is for the custom ~/Projects/nfc-collection structure

# Set project directory
PROJECT_DIR="$HOME/Projects/nfc-collection"

# Check if virtual environment exists
if [ ! -d "$PROJECT_DIR/venv" ]; then
    echo "Error: Python virtual environment not found."
    echo "Please run pi-setup-custom.sh first to create the virtual environment."
    exit 1
fi

# Activate the virtual environment
source "$PROJECT_DIR/venv/bin/activate"

# Check which script to run
if [ -z "$1" ]; then
    # No argument provided, list available scripts
    echo "Please specify which NFC script to run:"
    echo "1. Simple NFC Reader (simple-reader.py)"
    echo "2. Basic PN532 Test (pn532-test.py)"
    echo "3. Write Entry to NFC Tag (write-entry-nfc.py)"
    echo ""
    echo "Usage: ./run-nfc-test-custom.sh <script_number>"
    deactivate
    exit 1
fi

# Run the selected script
case "$1" in
    1)
        echo "Running Simple NFC Reader..."
        python "$PROJECT_DIR/testing-scripts/simple-reader.py"
        ;;
    2)
        echo "Running Basic PN532 Test..."
        python "$PROJECT_DIR/testing-scripts/pn532-test.py"
        ;;
    3)
        echo "Running Write Entry to NFC Tag..."
        python "$PROJECT_DIR/testing-scripts/write-entry-nfc.py"
        ;;
    *)
        echo "Invalid option. Please choose 1, 2, or 3."
        ;;
esac

# Deactivate the virtual environment
deactivate