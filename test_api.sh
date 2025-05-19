#!/bin/bash
# test_api.sh - Test the API endpoints for the MathMuseums project
# Created: May 19, 2025

echo "Testing API endpoints for MathMuseums"
echo "===================================="
echo ""

# Make sure we have jq for JSON parsing
if ! command -v jq &> /dev/null
then
    echo "This script requires jq for JSON parsing. Please install it."
    echo "  On Fedora: sudo dnf install jq"
    echo "  On Ubuntu: sudo apt install jq"
    exit 1
fi

SERVER_URL="http://localhost:8000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Start the Django server in background
echo -e "${YELLOW}Starting Django server...${NC}"
python manage.py runserver > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 2
echo -e "${GREEN}Server started with PID $SERVER_PID${NC}"
echo ""

# Trap to kill server on exit
trap "kill $SERVER_PID; echo -e '${YELLOW}Server stopped${NC}'; exit" EXIT INT TERM

# Login and get cookie for API calls
echo "1. Testing authentication:"
echo "-------------------------"
echo -e "${YELLOW}1.1 Login with email OTP${NC}"
echo "  Automatically testing the authentication flow would require"
echo "  intercepting emails, which is not part of this script."
echo "  Please manually authenticate by:"
echo ""
echo "  1. Opening $SERVER_URL in your browser"
echo "  2. Enter your email"
echo "  3. Check console output for OTP"
echo "  4. Enter OTP to authenticate"
echo ""
echo -e "${YELLOW}Press enter when authenticated...${NC}"
read

# After manual authentication, continue with CSRF token
echo -e "${GREEN}Authentication completed manually${NC}"
echo ""

# Test concept tile endpoints
echo "2. Testing concept tile API endpoints:"
echo "------------------------------------"
echo -e "${YELLOW}2.1 Fetching concept tiles${NC}"
RESPONSE=$(curl -s -X GET -b "$(grep -oP "sessionid=\K[^;]*" ~/.mozilla/firefox/*.default/cookies.sqlite)" $SERVER_URL/api/concepts/)

if [[ -z "$RESPONSE" ]]; then
    echo -e "${RED}Error: No response received.${NC}"
    echo "Make sure you're authenticated in your browser."
    exit 1
fi

if echo "$RESPONSE" | jq .; then
    echo -e "${GREEN}Successfully fetched concept tiles${NC}"
else
    echo -e "${RED}Error fetching concept tiles${NC}"
    echo "$RESPONSE"
fi
echo ""

# Test preferences endpoint
echo -e "${YELLOW}2.2 Fetching user preferences${NC}"
RESPONSE=$(curl -s -X GET -b "$(grep -oP "sessionid=\K[^;]*" ~/.mozilla/firefox/*.default/cookies.sqlite)" $SERVER_URL/api/preferences/)

if echo "$RESPONSE" | jq .; then
    echo -e "${GREEN}Successfully fetched user preferences${NC}"
else
    echo -e "${RED}Error fetching user preferences${NC}"
    echo "$RESPONSE"
fi
echo ""

# Test sync logs endpoint
echo -e "${YELLOW}2.3 Fetching sync logs${NC}"
RESPONSE=$(curl -s -X GET -b "$(grep -oP "sessionid=\K[^;]*" ~/.mozilla/firefox/*.default/cookies.sqlite)" $SERVER_URL/api/sync/logs/)

if echo "$RESPONSE" | jq .; then
    echo -e "${GREEN}Successfully fetched sync logs${NC}"
else
    echo -e "${RED}Error fetching sync logs${NC}"
    echo "$RESPONSE"
fi
echo ""

echo "3. Manual testing instructions:"
echo "-----------------------------"
echo "To fully test the API, you'll need to:"
echo "1. Use the browser console to call fetch() to test creating concepts"
echo "2. Use the browser console to test sync endpoint with a payload like:"
echo ""
echo "fetch('/api/sync/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    device_id: 'test-device',
    concepts: [
      {
        concept_type: 'linear',
        position_x: 100,
        position_y: 100,
        desmos_state: {},
        description: 'Test linear concept',
        is_complete: false
      }
    ]
  })
})"
echo ""
echo -e "${GREEN}API testing complete. Server will stop when you press Ctrl+C${NC}"

# Keep script running
sleep infinity
