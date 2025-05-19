#!/bin/bash
# cleanup.sh - Script to clean unnecessary files from the MathMuseums project
# Created: May 19, 2025
# 
# Note: Dependencies are intentionally bundled in git for HelioHost deployment

echo "Cleaning up MathMuseums project..."

# Remove Python bytecode files
find . -name "*.py[co]" -delete
find . -name "__pycache__" -type d -exec rm -rf {} +
echo "✓ Removed Python bytecode files"

# Remove temporary and backup files
find . -name "*.bak" -o -name "*.tmp" -o -name "*.~*" -o -name ".DS_Store" -delete
echo "✓ Removed temporary and backup files"

# Remove SQLite files (since we're using PostgreSQL)
find . -name "*.sqlite3*" -o -name "*.db" -delete
echo "✓ Removed SQLite database files"

# Make sure only dispatch.wsgi is in the root (not in mathmuseums/)
if [ -f mathmuseums/dispatch.wsgi ]; then
    rm mathmuseums/dispatch.wsgi
    echo "✓ Removed duplicate dispatch.wsgi file"
fi

# Check for duplicate settings files
if [ -f mathmuseums/settings.py.new ]; then
    rm mathmuseums/settings.py.new
    echo "✓ Removed duplicate settings file"
fi

# Check for diagnostic files (only if not in production)
if [ "$ENVIRONMENT" != "production" ]; then
    for file in simple_check.py check_env.py; do
        if [ -f "$file" ]; then
            rm "$file"
            echo "✓ Removed diagnostic file: $file"
        fi
    done
else
    echo "ℹ️ Skipping removal of diagnostic files in production environment"
fi

# Remove duplicate root index.html file (Django uses templates/index.html)
if [ -f index.html ]; then
    rm index.html
    echo "✓ Removed duplicate index.html file"
fi

echo "Cleanup complete! 🧹✨"
echo "Note: Dependencies in staticlibs/ are intentionally bundled for HelioHost deployment"
