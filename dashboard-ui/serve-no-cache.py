#!/usr/bin/env python3
"""
Simple HTTP server with cache-control headers to prevent caching
Use this instead of 'python -m http.server' to ensure fresh data
"""

import http.server
import socketserver
import os
from datetime import datetime

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add cache-busting headers
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        # Add timestamp to help debug
        self.send_header('X-Served-At', datetime.now().isoformat())
        super().end_headers()
    
    def log_message(self, format, *args):
        # Enhanced logging to show what's being served
        message = format % args
        if 'journal.json' in message:
            # Get file stats
            try:
                path = self.translate_path(self.path)
                if os.path.exists(path):
                    size = os.path.getsize(path)
                    mtime = datetime.fromtimestamp(os.path.getmtime(path))
                    message += f" [size: {size} bytes, modified: {mtime}]"
            except:
                pass
        print(f"{self.address_string()} - [{self.log_date_time_string()}] {message}")

def serve(port=3000, directory=None):
    if directory:
        os.chdir(directory)
    
    with socketserver.TCPServer(("", port), NoCacheHTTPRequestHandler) as httpd:
        print(f"🚀 Serving at http://localhost:{port}")
        print(f"📁 Serving directory: {os.getcwd()}")
        print("🚫 Cache-Control headers enabled - no caching!")
        
        # Check for journal.json
        journal_path = os.path.join(os.getcwd(), "data", "journal.json")
        if os.path.exists(journal_path):
            size = os.path.getsize(journal_path)
            mtime = datetime.fromtimestamp(os.path.getmtime(journal_path))
            print(f"📊 Found journal.json: {size} bytes, last modified: {mtime}")
            
            # Quick check of content
            try:
                import json
                with open(journal_path, 'r') as f:
                    data = json.load(f)
                    if 'entries' in data:
                        print(f"✅ Journal contains {len(data['entries'])} entries")
                        if data['entries']:
                            print(f"📅 First entry: {data['entries'][0].get('creationDate', 'N/A')}")
                            print(f"📅 Last entry: {data['entries'][-1].get('creationDate', 'N/A')}")
            except Exception as e:
                print(f"⚠️  Error reading journal.json: {e}")
        else:
            print("⚠️  No journal.json found at expected location!")
        
        print("\nPress Ctrl+C to stop the server")
        httpd.serve_forever()

if __name__ == "__main__":
    import sys
    
    # Parse arguments
    port = 3000
    directory = None
    
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    if len(sys.argv) > 2:
        directory = sys.argv[2]
    
    serve(port, directory)