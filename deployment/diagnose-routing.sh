#!/bin/bash
# Diagnostic script for React Router issues

echo "=== React Router Diagnostic ==="
echo ""

# Check what's serving on port 80
echo "1. What's running on port 80?"
sudo netstat -tlnp | grep :80 || sudo ss -tlnp | grep :80
echo ""

# Check the service
echo "2. nfc-dashboard service status:"
sudo systemctl status nfc-dashboard --no-pager | head -20
echo ""

# Check what command is being run
echo "3. Service configuration:"
grep ExecStart /etc/systemd/system/nfc-dashboard.service
echo ""

# Check if serve-spa.py exists
echo "4. SPA server file:"
ls -la /home/loganrhyne/nfc-collection/deployment/serve-spa.py 2>/dev/null || echo "serve-spa.py NOT FOUND!"
echo ""

# Check what's actually being served
echo "5. Testing with curl:"
cd /home/loganrhyne/nfc-collection/dashboard-ui
echo "Current directory: $(pwd)"
echo ""

# Test the Python server directly
echo "6. Testing Python HTTP server behavior:"
echo "Creating test server..."
cat > /tmp/test-spa.py << 'EOF'
#!/usr/bin/env python3
import sys
from http.server import SimpleHTTPRequestHandler
class TestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        print(f"Request path: {self.path}")
        if self.path == '/debug':
            print("Would serve index.html for /debug")
        super().do_GET()

if __name__ == '__main__':
    print("This is a test - not actually serving")
    print(f"Python version: {sys.version}")
    print(f"Would serve from: {sys.argv[-1] if len(sys.argv) > 1 else 'current directory'}")
EOF

python3 /tmp/test-spa.py build
echo ""

# Check if the build has the right files
echo "7. Build directory contents:"
ls -la /home/loganrhyne/nfc-collection/dashboard-ui/build/ | head -10
echo ""

# Check if index.html exists
echo "8. Checking index.html:"
if [ -f /home/loganrhyne/nfc-collection/dashboard-ui/build/index.html ]; then
    echo "index.html exists"
    echo "First few lines:"
    head -5 /home/loganrhyne/nfc-collection/dashboard-ui/build/index.html
else
    echo "index.html NOT FOUND!"
fi
echo ""

# Try the manual approach
echo "9. Quick test - manually starting SPA server (Ctrl+C to stop):"
echo "Running: cd /home/loganrhyne/nfc-collection/dashboard-ui && python3 -m http.server 8080 --directory build"
echo "While this runs, test: curl http://localhost:8080/debug"
echo ""
echo "Press Enter to start test server..."
read -r

cd /home/loganrhyne/nfc-collection/dashboard-ui
timeout 10 python3 -m http.server 8080 --directory build &
SERVER_PID=$!
sleep 2

echo "Testing routes on port 8080:"
curl -s -o /dev/null -w "/       -> HTTP %{http_code}\n" http://localhost:8080/
curl -s -o /dev/null -w "/debug  -> HTTP %{http_code}\n" http://localhost:8080/debug
curl -s -o /dev/null -w "/static -> HTTP %{http_code}\n" http://localhost:8080/static/

kill $SERVER_PID 2>/dev/null

echo ""
echo "=== Diagnostic complete ==="