#!/bin/bash
# auth_test.sh - Test the authentication flow for MathMuseums
# Run this script to test the authentication flow and debug any issues

echo "Running Django server for authentication testing..."
echo "Press Ctrl+C to stop the server when done testing."
echo ""
echo "Test Steps:"
echo "1. Open http://localhost:8000/ in your browser"
echo "2. You should be redirected to the login page"
echo "3. Enter an email address and submit"
echo "4. Check the console for the OTP (since we're using console email backend)"
echo "5. Enter the OTP on the verification page"
echo "6. You should be redirected to the main application"
echo ""
echo "Starting server..."

python manage.py runserver
