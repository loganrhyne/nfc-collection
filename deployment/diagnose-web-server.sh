#!/bin/bash
# Diagnostic script to find what's serving the web content

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Web Server Diagnostic ===${NC}"
echo ""

# Check what's listening on port 80
echo -e "${YELLOW}1. Checking what's listening on port 80:${NC}"
sudo netstat -tlnp | grep :80 || sudo ss -tlnp | grep :80
echo ""

# Check if nginx is running
echo -e "${YELLOW}2. Checking nginx status:${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}nginx is running${NC}"
    echo "Config test:"
    sudo nginx -t
    echo ""
    echo "Enabled sites:"
    ls -la /etc/nginx/sites-enabled/
    echo ""
    echo "Document root from config:"
    grep -r "root" /etc/nginx/sites-enabled/ | grep -v "#"
else
    echo "nginx is not running"
fi
echo ""

# Check if nfc-dashboard service is running
echo -e "${YELLOW}3. Checking nfc-dashboard service:${NC}"
if systemctl is-active --quiet nfc-dashboard; then
    echo -e "${GREEN}nfc-dashboard is running${NC}"
    sudo systemctl status nfc-dashboard --no-pager | head -20
else
    echo "nfc-dashboard is not running"
fi
echo ""

# Check for other python http servers
echo -e "${YELLOW}4. Checking for Python HTTP servers:${NC}"
ps aux | grep -E "python.*http.server|python.*SimpleHTTPServer" | grep -v grep
echo ""

# Check for Apache
echo -e "${YELLOW}5. Checking Apache status:${NC}"
if systemctl is-active --quiet apache2; then
    echo -e "${RED}Apache2 is running (might conflict with nginx)${NC}"
    sudo systemctl status apache2 --no-pager | head -10
else
    echo "Apache2 is not running"
fi
echo ""

# Find build directories
echo -e "${YELLOW}6. Finding build directories:${NC}"
echo "Looking for build directories..."
find /home/loganrhyne -name "build" -type d 2>/dev/null | grep -E "dashboard|nfc" | while read dir; do
    echo -e "\n${GREEN}Found: $dir${NC}"
    if [ -f "$dir/index.html" ]; then
        echo "  Has index.html - checking timestamp:"
        ls -la "$dir/index.html" | awk '{print "  Modified: " $6 " " $7 " " $8}'
        
        # Check for version info
        if [ -f "$dir/version.json" ]; then
            echo "  Version info:"
            cat "$dir/version.json" 2>/dev/null | head -5
        fi
        
        # Check for manifest.json to identify React build
        if [ -f "$dir/manifest.json" ]; then
            echo "  React app name: $(grep '"name"' "$dir/manifest.json" | head -1)"
        fi
    fi
done
echo ""

# Check current working directory for services
echo -e "${YELLOW}7. Checking service working directories:${NC}"
if [ -f /etc/systemd/system/nfc-dashboard.service ]; then
    echo "nfc-dashboard service config:"
    grep -E "WorkingDirectory|ExecStart" /etc/systemd/system/nfc-dashboard.service
fi

if [ -f /etc/nginx/sites-enabled/nfc-collection ]; then
    echo -e "\n${YELLOW}nginx site config:${NC}"
    cat /etc/nginx/sites-enabled/nfc-collection | grep -E "root|location /" -A 2
fi
echo ""

# Test the actual response
echo -e "${YELLOW}8. Testing HTTP response:${NC}"
echo "Checking what's actually being served..."
curl -s http://localhost/ | grep -o '<title>.*</title>' | head -1 || echo "Could not fetch title"
echo ""

# Recommendations
echo -e "${GREEN}=== Recommendations ===${NC}"
echo "Based on the findings above:"
echo "1. If nginx is serving old content, check the 'root' directive"
echo "2. If nfc-dashboard is running, verify the --directory parameter"
echo "3. Look for multiple build directories and check their timestamps"
echo "4. Run: sudo journalctl -u nfc-dashboard -n 50 to see service logs"