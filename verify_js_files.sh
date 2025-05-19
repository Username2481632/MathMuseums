#!/bin/bash

# Verify JS Files Script
echo "Verifying JavaScript files for API integration"
echo "---------------------------------------------"

SERVER_URL="http://localhost:8001"

# Define files to check
declare -a FILES=(
    "static/js/utils/auth.js"
    "static/js/utils/sync.js"
    "static/js/utils/preferences.js"
    "static/css/sync.css"
)

# Check each file
for file in "${FILES[@]}"; do
    echo -n "Checking $file... "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/$file")
    
    if [ $HTTP_CODE -eq 200 ]; then
        echo "OK (HTTP 200)"
    else
        echo "FAILED (HTTP $HTTP_CODE)"
        echo "  - File may not be accessible. Check static file serving configuration."
    fi
done

echo "---------------------------------------------"
echo "Checking for JavaScript errors in browser console..."
echo "Please open http://localhost:8001/ in a browser and check the console for errors."
echo "Common errors to look for:"
echo "  - Failed to load resource"
echo "  - Uncaught ReferenceError"
echo "  - Uncaught TypeError"
echo "---------------------------------------------"
