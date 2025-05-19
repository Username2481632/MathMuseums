#!/bin/bash

# Deploy authentication fix to HelioHost
# This script prepares the authentication-related files for deployment

echo "Math Museums Authentication Fix Deployment"
echo "----------------------------------------"

# Create directory for auth fix files
DEPLOY_DIR="auth_fix_deployment"
echo "Creating deployment directory: $DEPLOY_DIR"
mkdir -p $DEPLOY_DIR
mkdir -p $DEPLOY_DIR/authentication
mkdir -p $DEPLOY_DIR/mathmuseums

# Copy authentication-related files
echo "Copying authentication files..."
cp authentication/views.py $DEPLOY_DIR/authentication/
cp authentication/utils.py $DEPLOY_DIR/authentication/

# Copy middleware and settings
echo "Copying middleware and settings..."
cp mathmuseums/middleware.py $DEPLOY_DIR/mathmuseums/
cp mathmuseums/settings.py $DEPLOY_DIR/mathmuseums/

# Create README with deployment instructions
echo "Creating deployment instructions..."
cat > $DEPLOY_DIR/README.md << EOL
# Authentication Fix Deployment

This package contains fixes for the authentication system in the Math Museums project.

## Issue
500 server error when users try to submit the authentication form.

## Files Included
- \`authentication/views.py\` - Added error handling for authentication flow
- \`authentication/utils.py\` - Enhanced email sending with better error handling
- \`mathmuseums/middleware.py\` - Added exception logging middleware
- \`mathmuseums/settings.py\` - Updated email backend configuration and added logging

## Deployment Steps
1. Back up the original files on the server
2. Upload these files to replace the originals
3. Restart the application

## Testing
1. Try to authenticate with a valid email
2. Check if you receive the OTP email
3. Verify authentication with the OTP code
4. Check the logs for any errors

## Verification
The authentication system should now handle email sending errors gracefully
and provide better error messages to users.
EOL

echo "Creating deployment zip file..."
zip -r auth_fix_deployment.zip $DEPLOY_DIR

echo "Deployment package created: auth_fix_deployment.zip"
echo "To deploy to HelioHost:"
echo "1. Upload the zip file to your server"
echo "2. Unzip the package"
echo "3. Copy the files to their respective locations"
echo "4. Restart the application"
