#!/usr/bin/env python3

# Test script to call our WSGI application locally
import sys
sys.path.insert(0, '.')

from app import application

# Mock WSGI environment
environ = {
    'REQUEST_METHOD': 'GET',
    'PATH_INFO': '/',
    'QUERY_STRING': '',
    'SERVER_NAME': 'localhost',
    'SERVER_PORT': '8000',
}

# Mock start_response function
def start_response(status, headers):
    print(f"Status: {status}")
    for name, value in headers:
        print(f"{name}: {value}")
    print()  # Empty line to end headers

if __name__ == '__main__':
    try:
        response = application(environ, start_response)
        for data in response:
            if isinstance(data, bytes):
                print(data.decode('utf-8'), end='')
            else:
                print(data, end='')
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
