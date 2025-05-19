#!/bin/bash
# apply_migrations.sh - Create and apply migrations for models
# Created: May 19, 2025

echo "Creating and applying migrations for MathMuseums project..."
echo ""

# Create migrations
echo "=== Creating Migrations ==="
python manage.py makemigrations

echo ""
echo "=== Applying Migrations ==="
python manage.py migrate

echo ""
echo "=== Migration Status ==="
python manage.py showmigrations api

echo ""
echo "=== API Models ==="
python manage.py inspectdb | grep "class Api"
