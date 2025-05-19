#!/bin/bash

# Test script for API integration
echo "Testing API integration for Math Museums"
echo "----------------------------------------"

# Check if server is running
if ! curl -s http://localhost:8001/ > /dev/null; then
    echo "Error: Django server not running on port 8001"
    echo "Please start the server with: python manage.py runserver 8001"
    exit 1
fi

echo "Django server is running on port 8001"

# Test authentication
echo "Testing authentication..."
CSRF_TOKEN=$(curl -s -c cookies.txt http://localhost:8001/auth/request/ | grep -o 'name="csrfmiddlewaretoken" value="[^"]*"' | sed 's/name="csrfmiddlewaretoken" value="\([^"]*\)"/\1/')
echo "CSRF Token obtained: ${CSRF_TOKEN:0:10}..."

# Test login with email
echo "Testing login with email..."
curl -s -b cookies.txt -c cookies.txt -X POST http://localhost:8001/auth/request/ \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "csrfmiddlewaretoken=$CSRF_TOKEN&email=test@example.com" \
    -o login_response.html

echo "Login response saved to login_response.html"

# Test concept API
echo "Testing concept API..."
curl -s -b cookies.txt http://localhost:8001/api/concepts/ -o concepts_response.json
echo "Concepts response saved to concepts_response.json"

# Check if synchronization status indicator is working
echo "Opening browser to test sync status indicator..."
echo "Please check that:"
echo "1. The sync status indicator appears in the bottom right corner"
echo "2. The 'Sync Now' button works when clicked"
echo "3. Changes to tiles are reflected in the sync status"

# Clean up
echo "Test completed. Cleaning up..."
rm -f cookies.txt login_response.html concepts_response.json

echo "----------------------------------------"
echo "End of test"
