#!/usr/bin/env python3
"""
basic http server:
https://docs.python.org/3/library/http.server.html

contents of `index.html` from current dir or any of its subdirs
will be visible at:
  localhost:8080
"""

import http.server
import socketserver

PORT = 8080
Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"serving at port {PORT}")
    httpd.serve_forever()
