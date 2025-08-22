#!/bin/bash
# Quick fix for React Router on the Pi
# Run this ON the Raspberry Pi

set -e

echo "Fixing React Router support..."

# Create the SPA server if it doesn't exist
cat > /home/loganrhyne/nfc-collection/deployment/serve-spa.py << 'EOF'
#!/usr/bin/env python3
"""
Simple HTTP server for serving Single Page Applications (SPAs)
Serves index.html for all routes to support client-side routing
"""

import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

class SPAHTTPRequestHandler(SimpleHTTPRequestHandler):
    """HTTP request handler for Single Page Applications"""
    
    def __init__(self, *args, **kwargs):
        # Set the directory to serve from
        super().__init__(*args, directory='build', **kwargs)
    
    def do_GET(self):
        """Handle GET requests - serve index.html for routes"""
        # Get the requested path
        path = self.path.split('?')[0]  # Remove query parameters
        
        # Determine the file path
        file_path = Path(self.directory) / path.lstrip('/')
        
        # If it's a file request (has extension) and exists, serve it normally
        if '.' in path.split('/')[-1] and file_path.exists():
            super().do_GET()
        # For routes without extensions (like /debug), serve index.html
        elif not path.split('/')[-1].count('.'):
            self.path = '/index.html'
            super().do_GET()
        # Otherwise, let the default handler deal with it (404)
        else:
            super().do_GET()

def run_server(port=80):
    """Run the SPA server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, SPAHTTPRequestHandler)
    
    print(f"Serving SPA on port {port}")
    print(f"Directory: {os.getcwd()}/build")
    print("Routes will be handled by index.html")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.shutdown()

if __name__ == '__main__':
    # Get port from command line or use default
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 80
    run_server(port)
EOF

# Make it executable
chmod +x /home/loganrhyne/nfc-collection/deployment/serve-spa.py

# Update the systemd service
sudo sed -i 's|ExecStart=.*|ExecStart=/usr/bin/python3 /home/loganrhyne/nfc-collection/deployment/serve-spa.py 80|' /etc/systemd/system/nfc-dashboard.service

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart nfc-dashboard

# Check status
echo ""
echo "Service status:"
sudo systemctl status nfc-dashboard --no-pager

echo ""
echo "Testing routes:"
curl -s -o /dev/null -w "/       -> HTTP %{http_code}\n" http://localhost/
curl -s -o /dev/null -w "/debug  -> HTTP %{http_code}\n" http://localhost/debug

echo ""
echo "Done! The /debug route should now work."