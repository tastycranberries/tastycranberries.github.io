#!/usr/bin/env python3
"""
Academic Website Local Preview Server
Run this script to preview your website locally:
    python serve.py
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Disable aggressive caching during local development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def main():
    os.chdir(DIRECTORY)
    # Find available port if 8000 is occupied
    port = PORT
    for p in range(8000, 8020):
        try:
            with socketserver.TCPServer(("", p), Handler) as httpd:
                url = f"http://localhost:{p}"
                print("\n" + "=" * 60)
                print(f" Academic Personal Website Server Running!")
                print(f" Local URL:  {url}")
                print(f" Root dir:   {DIRECTORY}")
                print(" Press Ctrl+C to stop the server.")
                print("=" * 60 + "\n")
                
                try:
                    webbrowser.open(url)
                except Exception:
                    pass

                httpd.serve_forever()
                break
        except OSError:
            continue

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)
