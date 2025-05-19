#!/usr/bin/env python
"""
Simple diagnostic script for the HelioHost environment.
Place this in the root of your project and access it via:
https://yourdomain.com/check_env.py
"""

import os
import sys
import glob

def print_html(content):
    """Print content as HTML with proper headers."""
    print("Content-Type: text/html\n")
    print("<html><head><title>Environment Check</title></head><body>")
    print("<pre>")
    print(content)
    print("</pre></body></html>")

def main():
    try:
        output = []
        
        # Check Python version
        output.append(f"Python Version: {sys.version}")
        output.append(f"Python Executable: {sys.executable}")
        
        # Check paths
        output.append("\nPython Path:")
        for i, path in enumerate(sys.path):
            output.append(f"  {i}: {path}")
        
        # Check environment variables
        output.append("\nEnvironment Variables:")
        for key, value in sorted(os.environ.items()):
            output.append(f"  {key}: {value}")
        
        # Check static libs
        staticlibs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'staticlibs')
        output.append(f"\nStatic Libs in {staticlibs_dir}:")
        if os.path.exists(staticlibs_dir):
            for whl in glob.glob(os.path.join(staticlibs_dir, '*.whl')):
                output.append(f"  {os.path.basename(whl)}")
        else:
            output.append("  Directory not found!")
        
        # Check if Django is importable
        try:
            import django
            output.append(f"\nDjango Version: {django.get_version()}")
            output.append(f"Django Path: {django.__file__}")
        except ImportError as e:
            output.append(f"\nFailed to import Django: {e}")
        
        print_html("\n".join(output))
    except Exception as e:
        print_html(f"Error running diagnostic: {e}")

if __name__ == "__main__":
    main()
