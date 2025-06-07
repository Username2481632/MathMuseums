#!/bin/bash

# Reset Database Script for MathMuseums
# This script drops and recreates the database schema using SQL commands

set -e  # Exit on any error

echo "🗑️  Dropping existing database..."
podman exec mariadb-mathmuseums mysql -uroot -proot_password -e "DROP DATABASE IF EXISTS mathmuseums;"

echo "🚀 Creating fresh database..."
podman exec mariadb-mathmuseums mysql -uroot -proot_password -e "CREATE DATABASE mathmuseums CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "� Granting permissions to user..."
podman exec mariadb-mathmuseums mysql -uroot -proot_password -e "GRANT ALL PRIVILEGES ON mathmuseums.* TO 'mathmuseums_user'@'%'; FLUSH PRIVILEGES;"

echo "🔧 Running Django migrations..."
python manage.py migrate

echo "✅ Database reset complete!"
echo "📊 Migration status:"
python manage.py showmigrations --plan | grep -E "^\[X\]" | wc -l | xargs echo "Applied migrations:"
