#!/usr/bin/env python
"""
Simple diagnostic script that doesn't rely on Django's translation system.
Place this in the root of your project and access it via:
https://yourdomain.com/simple_check.py
"""

import os
import sys
import locale

def main():
    """Simple check without Django dependencies."""
    print("Content-Type: text/html\n")
    print("<html><head><title>Environment Check</title></head><body>")
    print("<h1>Environment Check</h1>")

    # Python version
    print("<h2>Python Version</h2>")
    print("<pre>")
    print("Python Version: " + sys.version)
    print("Python Executable: " + sys.executable)
    print("</pre>")
    
    # Check locale settings
    print("<h2>Locale Settings</h2>")
    print("<pre>")
    try:
        current_locale = locale.getlocale()
        print("Current locale: " + str(current_locale))
        print("Trying to set locale to C...")
        locale.setlocale(locale.LC_ALL, 'C')
        print("Locale after setting: " + str(locale.getlocale()))
    except Exception as e:
        print("Locale error: " + str(e))
    print("</pre>")
    
    # System path
    print("<h2>System Path</h2>")
    print("<pre>")
    for i, path in enumerate(sys.path):
        print(str(i) + ": " + path)
    print("</pre>")
    
    # Environment variables
    print("<h2>Environment Variables</h2>")
    print("<pre>")
    for key, value in sorted(os.environ.items()):
        if key.lower() in ('path', 'pythonpath', 'django_settings_module', 'server_name', 'http_host'):
            print(key + ": " + value)
    print("</pre>")
    
    # File system
    print("<h2>Current Directory</h2>")
    print("<pre>")
    print("Current directory: " + os.getcwd())
    try:
        print("Directory contents: " + str(os.listdir()))
    except Exception as e:
        print("Error listing directory: " + str(e))
    print("</pre>")
    
    # Try importing Django
    print("<h2>Django Import Test</h2>")
    print("<pre>")
    try:
        import django
        print("Django version: " + django.get_version())
        print("Django path: " + django.__file__)
        
        # Try importing settings
        try:
            from django.conf import settings
            print("Settings imported successfully")
            print("USE_I18N: " + str(getattr(settings, 'USE_I18N', 'Not set')))
            print("LANGUAGE_CODE: " + str(getattr(settings, 'LANGUAGE_CODE', 'Not set')))
        except Exception as e:
            print("Settings import error: " + str(e))
    except ImportError as e:
        print("Django import error: " + str(e))
    print("</pre>")
    
    print("</body></html>")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("Content-Type: text/html\n")
        print("<html><body>")
        print("<h1>Error</h1><p>" + str(e) + "</p>")
        print("</body></html>")
