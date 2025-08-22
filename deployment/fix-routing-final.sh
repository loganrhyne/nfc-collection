#!/bin/bash
# Final fix for React Router - handles all edge cases

set -e

echo "=== Fixing React Router Support ==="
echo ""

# Stop the service first
echo "1. Stopping current service..."
sudo systemctl stop nfc-dashboard || true

# Ensure directories exist
echo "2. Creating directories..."
mkdir -p /home/loganrhyne/nfc-collection/deployment

# Create the SPA server with better error handling
echo "3. Creating SPA server..."
cat > /home/loganrhyne/nfc-collection/deployment/serve-spa.py << 'EOF'
#!/usr/bin/env python3
"""
HTTP server for Single Page Applications with client-side routing
"""

import os
import sys
import mimetypes
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

class SPAHandler(SimpleHTTPRequestHandler):
    """Handles SPA routing by serving index.html for non-file routes"""
    
    def __init__(self, *args, **kwargs):
        # Initialize mimetypes
        mimetypes.init()
        super().__init__(*args, directory='build', **kwargs)
    
    def do_GET(self):
        """Serve files or index.html for routes"""
        # Parse the path
        parsed_path = self.path.split('?')[0].split('#')[0]
        
        # Build full file path
        full_path = os.path.join(self.directory, parsed_path.lstrip('/'))
        
        # Log the request
        print(f"GET {self.path} -> checking {full_path}")
        
        # Check if it's a file that exists
        if os.path.isfile(full_path):
            # Serve the file normally
            print(f"  Serving file: {full_path}")
            super().do_GET()
        # Check if it's a directory with index.html
        elif os.path.isdir(full_path) and os.path.isfile(os.path.join(full_path, 'index.html')):
            # Serve directory's index.html
            print(f"  Serving directory index: {full_path}/index.html")
            super().do_GET()
        # If path has no extension, assume it's a route
        elif '.' not in os.path.basename(parsed_path):
            # Serve the root index.html for client-side routing
            print(f"  Route detected, serving: {self.directory}/index.html")
            self.path = '/index.html'
            super().do_GET()
        else:
            # File doesn't exist - 404
            print(f"  File not found: {full_path}")
            super().do_GET()
    
    def end_headers(self):
        """Add cache headers for better performance"""
        # Add CORS headers if needed
        self.send_header('Access-Control-Allow-Origin', '*')
        # Cache static assets but not index.html
        if not self.path.endswith('.html'):
            self.send_header('Cache-Control', 'public, max-age=3600')
        else:
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def main():
    """Run the server"""
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 80
    
    # Change to the dashboard directory
    os.chdir('/home/loganrhyne/nfc-collection/dashboard-ui')
    
    print(f"Starting SPA server on port {port}")
    print(f"Serving from: {os.getcwd()}/build")
    print("Client-side routing enabled")
    
    server = HTTPServer(('', port), SPAHandler)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()

if __name__ == '__main__':
    main()
EOF

# Make it executable
chmod +x /home/loganrhyne/nfc-collection/deployment/serve-spa.py

# Create a new systemd service file
echo "4. Updating systemd service..."
sudo tee /etc/systemd/system/nfc-dashboard.service > /dev/null << 'EOF'
[Unit]
Description=NFC Collection Dashboard (SPA Server)
After=network.target nfc-websocket.service
Wants=nfc-websocket.service

[Service]
Type=simple
User=loganrhyne
Group=loganrhyne
WorkingDirectory=/home/loganrhyne/nfc-collection/dashboard-ui
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONUNBUFFERED=1"
ExecStart=/usr/bin/python3 /home/loganrhyne/nfc-collection/deployment/serve-spa.py 80
Restart=always
RestartSec=10

# Run on port 80
AmbientCapabilities=CAP_NET_BIND_SERVICE

# Logging
StandardOutput=journal
StandardError=journal

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
echo "5. Reloading systemd..."
sudo systemctl daemon-reload

# Start the service
echo "6. Starting service..."
sudo systemctl start nfc-dashboard
sudo systemctl enable nfc-dashboard

# Wait a moment
sleep 2

# Check status
echo ""
echo "7. Service status:"
sudo systemctl status nfc-dashboard --no-pager | head -20

# Test the routes
echo ""
echo "8. Testing routes:"
sleep 1
curl -s -o /dev/null -w "http://localhost/       -> HTTP %{http_code}\n" http://localhost/
curl -s -o /dev/null -w "http://localhost/debug  -> HTTP %{http_code}\n" http://localhost/debug
curl -s -o /dev/null -w "http://localhost/entry/test -> HTTP %{http_code}\n" http://localhost/entry/test

echo ""
echo "9. Checking logs for requests:"
sudo journalctl -u nfc-dashboard --no-pager -n 20 | grep "GET"

echo ""
echo "=== Fix complete! ==="
echo ""
echo "The /debug route should now work. If you still see 404:"
echo "1. Clear your browser cache (Ctrl+Shift+R)"
echo "2. Check that the React app was built with the route"
echo "3. Run: sudo journalctl -u nfc-dashboard -f"
echo "   Then visit /debug to see what's happening"