#!/bin/bash

# Deployment script for Math Museums to HelioHost
# This script prepares the files for deployment to HelioHost

# Variables
DEPLOY_DIR="deploy_mathmuseums"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_${DATE}"

echo "Math Museums Deployment Preparation"
echo "-----------------------------------"

# Create backup
echo "Creating backup in $BACKUP_DIR..."
mkdir -p $BACKUP_DIR
cp -r api authentication documentation mathmuseums memory-bank static staticlibs templates *.py *.sh $BACKUP_DIR/

# Prepare deploy directory
echo "Preparing deployment directory..."
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Create necessary directories
echo "Creating directory structure..."
mkdir -p $DEPLOY_DIR/api
mkdir -p $DEPLOY_DIR/authentication
mkdir -p $DEPLOY_DIR/mathmuseums
mkdir -p $DEPLOY_DIR/staticlibs
mkdir -p $DEPLOY_DIR/templates
mkdir -p $DEPLOY_DIR/staticfiles

# Copy Python files
echo "Copying Python files..."
cp api/*.py $DEPLOY_DIR/api/
cp authentication/*.py $DEPLOY_DIR/authentication/
cp mathmuseums/*.py $DEPLOY_DIR/mathmuseums/
cp manage.py dispatch.wsgi monkeypatch.py requirements.txt $DEPLOY_DIR/

# Copy migrations
echo "Copying migrations..."
mkdir -p $DEPLOY_DIR/api/migrations
mkdir -p $DEPLOY_DIR/authentication/migrations
cp api/migrations/*.py $DEPLOY_DIR/api/migrations/
cp authentication/migrations/*.py $DEPLOY_DIR/authentication/migrations/

# Copy templates
echo "Copying templates..."
cp -r templates/* $DEPLOY_DIR/templates/

# Copy static files
echo "Copying static files..."
cp -r staticfiles/* $DEPLOY_DIR/staticfiles/

# Copy wheel files
echo "Copying wheel files..."
cp -r staticlibs/*.whl $DEPLOY_DIR/staticlibs/
cp -r staticlibs/environ $DEPLOY_DIR/staticlibs/

# Create empty __init__.py files where needed
echo "Creating __init__.py files..."
touch $DEPLOY_DIR/api/migrations/__init__.py
touch $DEPLOY_DIR/authentication/migrations/__init__.py

# Create .env.example
echo "Creating .env.example..."
cat > $DEPLOY_DIR/.env.example << EOL
# Math Museums environment configuration
# Rename this file to .env and update the values

# Debug setting (set to False in production)
DEBUG=False

# Secret key (generate a new one for production)
SECRET_KEY=your-secret-key-here

# Allowed hosts (comma-separated)
ALLOWED_HOSTS=your-domain.heliohost.org,www.your-domain.heliohost.org

# Database settings
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432

# Email settings
EMAIL_HOST=your-smtp-server
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-email-password
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=your-email@example.com
EOL

# Create deployment instructions
echo "Creating deployment instructions..."
cat > $DEPLOY_DIR/DEPLOY.md << EOL
# Math Museums Deployment Instructions

## Setup on HelioHost

1. **Upload Files**
   - Upload all files and directories to your HelioHost account
   - Ensure file permissions are set correctly

2. **Environment Configuration**
   - Rename .env.example to .env
   - Update the values in .env with your actual settings

3. **Database Setup**
   - Create a PostgreSQL database in your HelioHost control panel
   - Update DB_* settings in .env with your database credentials

4. **Apply Migrations**
   - SSH into your HelioHost account
   - Navigate to your project directory
   - Run: python manage.py migrate

5. **WSGI Configuration**
   - In your HelioHost control panel, configure the WSGI script to point to dispatch.wsgi
   - Set the WSGI Python version to 3.x

6. **Static Files**
   - Ensure your web server is configured to serve files from staticfiles/
   - If using Apache, check .htaccess configuration

7. **Testing**
   - Visit your site and verify that it works
   - Check for any error messages in the logs

## Troubleshooting

- If you encounter "Module not found" errors, check that all wheel files in staticlibs/ are accessible
- For database connection issues, verify your database credentials in .env
- For static file issues, check that your web server is configured to serve files from staticfiles/
EOL

echo "Creating zip archive..."
zip -r mathmuseums_deploy_${DATE}.zip $DEPLOY_DIR

echo "-----------------------------------"
echo "Deployment preparation complete!"
echo "Files are in: ${DEPLOY_DIR}/"
echo "Zip archive: mathmuseums_deploy_${DATE}.zip"
echo "Backup is in: ${BACKUP_DIR}/"
echo ""
echo "Next steps:"
echo "1. Upload the deployment files to HelioHost"
echo "2. Follow the instructions in ${DEPLOY_DIR}/DEPLOY.md"
