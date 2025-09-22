#!/bin/bash
#
# Remove old cruft from the migration journey
# Run this after confirming the new architecture works
#

echo "============================================"
echo "Cleaning up old files and scripts"
echo "============================================"

# Files to remove (temporary fixes and workarounds)
TO_REMOVE=(
    # Old diagnostic and fix scripts
    "check_gpio.sh"
    "reset_and_test.sh"
    "test_nfc_modes.sh"
    "test_both_modes.py"
    "test_nfc_pi.py"
    "install_nfc_pi.sh"
    "start_services_manual.sh"
    "diagnose_services.sh"
    "fix_websocket_startup.sh"
    "diagnose_websocket.sh"
    "test_websocket_simple.sh"

    # Old deployment scripts
    "deploy.sh"  # Replaced by deploy-clean.sh
    "deployment/restart-services.sh"
    "deployment/start-websocket-direct.sh"
    "deployment/serve-spa.py"  # No longer needed with nginx

    # Old service files
    "deployment/systemd/nfc-dashboard.service"  # Replaced by nginx
    "python-services/nfc-scanner.service"
    "python-services/start-server.sh"

    # Old Python files that are replaced
    "python-services/server.py"  # Replaced by websocket_server.py
    "python-services/services/nfc_service_original.py"
    "python-services/services/nfc_service_simple.py"
    "python-services/services/nfc_service_refactored.py"

    # Old config files
    "python-services/.env"  # Should be created fresh from .env.example
    "python-services/.env.example"  # Will be recreated clean
)

echo "The following files will be removed:"
echo ""

for file in "${TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    fi
done

echo ""
read -p "Are you sure you want to remove these files? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    for file in "${TO_REMOVE[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo "Removed: $file"
        fi
    done

    echo ""
    echo "✓ Cleanup complete"
else
    echo "Cleanup cancelled"
fi

echo ""
echo "============================================"
echo "Next steps:"
echo "1. Commit the cleaned up codebase"
echo "2. Deploy with: ./deploy-clean.sh"
echo "============================================"