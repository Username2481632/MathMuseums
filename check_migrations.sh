#!/bin/bash
# check_migrations.sh - Check if migrations have been created and applied for models
# Created: May 19, 2025

echo "Checking migrations for MathMuseums project..."
echo ""

# Show migrations
echo "=== Migrations Status ==="
python manage.py showmigrations

echo ""
echo "=== Database Tables ==="
python manage.py inspectdb | grep "class.*\(ConceptTile\|UserPreference\|OTPCode\|User\)"

echo ""
echo "=== Model Summary ==="
echo "1. User model (authentication): Custom user model with email as primary identifier"
echo "2. OTPCode model (authentication): Storage for OTP codes for user authentication"
echo "3. ConceptTile model (api): Stores each concept tile with position, size, and state data"
echo "4. UserPreference model (api): Stores user preferences like onboarding state and theme"

echo ""
echo "If migrations are not applied, run: python manage.py migrate"
echo "If you need to make additional changes to models, run: python manage.py makemigrations"
