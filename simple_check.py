#!/usr/bin/env python
"""
Simple diagnostic script that doesn't rely on Django's translation system.
Place this in the root of your project and access it via:
https://yourdomain.com/simple_check.py
"""

import os
import sys

def main():
    """Simple check without Django dependencies."""
    print("Content-Type: text/html\n")
    print("<html><head><title>Environment Check</title></head><body>")
    print("<h1>Environment Check</h1>")

    # Python version
    print("<h2>Python Version</h2>")
    print("<pre>")
    print(f"Python Version: {sys.version}")
    print(f"Python Executable: {sys.executable}")
    print("</pre>")
    
    # System path
    print("<h2>System Path</h2>")
    print("<pre>")
    for i, path in enumerate(sys.path):
        print(f"{i}: {path}")
    print("</pre>")
    
    # Environment variables
    print("<h2>Environment Variables</h2>")
    print("<pre>")
    for key, value in sorted(os.environ.items()):
        if key.lower() in ('path', 'pythonpath', 'django_settings_module', 'server_name', 'http_host'):
            print(f"{key}: {value}")
    print("</pre>")
    
    # File system
    print("<h2>Current Directory</h2>")
    print("<pre>")
    print(f"Current directory: {os.getcwd()}")
    print(f"Directory contents: {os.listdir()}")
    print("</pre>")
    
    print("</body></html>")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("Content-Type: text/html\n")
        print("<html><body>")
        print(f"<h1>Error</h1><p>{e}</p>")
        print("</body></html>")
