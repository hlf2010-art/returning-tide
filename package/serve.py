#!/usr/bin/env python3
"""Serve the game on http://localhost:8000 with the right content types (Windows' registry can make
Python's built-in server send .js as text/plain, which browsers refuse to run as a module)."""
import http.server, socketserver, os, sys, webbrowser, threading
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'game')
PORT = int(os.environ.get('PORT', '8000'))
TYPES = {'.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.json': 'application/json',
         '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.png': 'image/png',
         '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.hdr': 'application/octet-stream'}
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def guess_type(self, path): return TYPES.get(os.path.splitext(path)[1].lower()) or super().guess_type(path)
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), H) as s:
    url = f'http://localhost:{PORT}/'
    print(f'Returning Tide is running at {url}  (close this window to stop)')
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try: s.serve_forever()
    except KeyboardInterrupt: pass
