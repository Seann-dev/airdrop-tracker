#!/usr/bin/env python3
import http.server
import socketserver
import urllib.request
import urllib.error
import json
import mimetypes
import os
from pathlib import Path

DIST_DIR = Path(__file__).parent / "dist"
# Env-overridable so the same script runs on Railway ($PORT) and locally (5174).
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
PORT = int(os.environ.get("PORT", "5174"))

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)
    
    def do_GET(self):
        # Proxy API requests
        if self.path.startswith("/api/"):
            self.proxy_api()
            return
        
        # Serve static files or fallback to index.html for SPA routes
        file_path = DIST_DIR / self.path.lstrip("/")
        
        if file_path.is_file():
            self.serve_file(file_path)
        else:
            # SPA fallback - serve index.html for client-side routes
            self.serve_file(DIST_DIR / "index.html")
    
    def proxy_api(self):
        try:
            # Forward headers
            headers = dict(self.headers)
            # Remove hop-by-hop headers
            for h in ["host", "connection", "keep-alive", "proxy-authenticate", 
                      "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade"]:
                headers.pop(h, None)
            
            req = urllib.request.Request(
                f"{BACKEND_URL}{self.path}",
                headers=headers,
                method=self.command
            )
            
            # Read request body if present
            content_length = int(self.headers.get("content-length", 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            if body:
                req.data = body
            
            with urllib.request.urlopen(req, timeout=30) as resp:
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() not in ["transfer-encoding", "connection"]:
                        self.send_header(k, v)
                self.end_headers()
                self.wfile.write(resp.read())
                
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            for k, v in e.headers.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(502)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Bad Gateway", "detail": str(e)}).encode())
    
    def serve_file(self, file_path):
        try:
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if mime_type is None:
                mime_type = "application/octet-stream"
            
            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            
            # Cache static assets
            if "assets" in str(file_path):
                self.send_header("Cache-Control", "public, max-age=31536000, immutable")
            else:
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            
            stat = file_path.stat()
            self.send_header("Content-Length", str(stat.st_size))
            self.end_headers()
            
            with open(file_path, "rb") as f:
                self.wfile.write(f.read())
        except FileNotFoundError:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")
    
    def log_message(self, format, *args):
        # Suppress default log messages
        pass

if __name__ == "__main__":
    os.chdir(DIST_DIR)
    with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
        print(f"Production frontend server running on http://localhost:{PORT}")
        print(f"Serving {DIST_DIR}")
        print(f"Proxying /api/* to {BACKEND_URL}")
        httpd.serve_forever()
