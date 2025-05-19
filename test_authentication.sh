#!/bin/bash

# Test script for authentication system
# This script tests the authentication system by making HTTP requests to the auth endpoints

echo "Math Museums Authentication Test"
echo "-------------------------------"

# Base URL for testing
BASE_URL="http://localhost:8000"
if [ "$1" == "prod" ]; then
    BASE_URL="https://math.moshchuk.com"
    echo "Testing against production: $BASE_URL"
else
    echo "Testing against development: $BASE_URL"
    echo "To test against production, run: $0 prod"
fi

echo ""
echo "Testing authentication request page load..."
curl -s -o /dev/null -w "%{http_code}" $BASE_URL/auth/request/
if [ $? -eq 0 ]; then
    echo "✓ Authentication request page loaded successfully"
else
    echo "✗ Failed to load authentication request page"
fi

echo ""
echo "Checking if auth endpoints are available..."
AUTH_REQUEST=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/auth/request/)
AUTH_VERIFY=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/auth/verify/)

echo "Auth Request status: $AUTH_REQUEST"
echo "Auth Verify status: $AUTH_VERIFY"

echo ""
echo "To test the full authentication flow, you need to manually:"
echo "1. Visit $BASE_URL/auth/request/"
echo "2. Enter a test email address"
echo "3. Check if you receive an OTP email"
echo "4. Enter the OTP code to complete the authentication process"

echo ""
echo "If you experience any issues, check the server logs for errors."
