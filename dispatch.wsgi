#!/usr/bin/env python3

# Simple CGI script that calls our WSGI app
import os
import sys

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Import our WSGI application
from app import application

# Simple WSGI-to-CGI adapter
def run_wsgi_as_cgi():
    environ = dict(os.environ)
    environ['REQUEST_METHOD'] = os.environ.get('REQUEST_METHOD', 'GET')
    environ['PATH_INFO'] = os.environ.get('PATH_INFO', '/')
    environ['QUERY_STRING'] = os.environ.get('QUERY_STRING', '')
    
    def start_response(status, headers):
        print(f"Status: {status}")
        for name, value in headers:
            print(f"{name}: {value}")
        print()  # Empty line to end headers
    
    # Call the WSGI application
    response = application(environ, start_response)
    
    # Output the response
    for data in response:
        if isinstance(data, bytes):
            sys.stdout.buffer.write(data)
        else:
            print(data, end='')

if __name__ == '__main__':
    run_wsgi_as_cgi()
