# Authentication Fix Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the authentication system fix to the HelioHost production environment.

## Issue Summary

Users were experiencing 500 server errors when trying to authenticate through the `/auth/request/` endpoint. The issue was caused by unhandled exceptions in the email sending process and lack of proper error handling in the authentication flow.

## Changes Made

1. Enhanced `authentication/views.py` with robust error handling
2. Updated `authentication/utils.py` to properly handle email sending errors
3. Improved `mathmuseums/middleware.py` with better logging capabilities
4. Updated `mathmuseums/settings.py` with proper email and logging configuration

## Pre-Deployment Checklist

- [ ] Code changes committed and pushed to repository
- [ ] Tested locally with email backend set to SMTP
- [ ] Deployment script (`deploy_auth_fix.sh`) prepared and executed
- [ ] Authentication fix deployment package created (`auth_fix_deployment.zip`)

## Deployment Steps

### 1. Back Up Existing Files

```bash
# Connect to HelioHost via SSH
ssh username@math.moshchuk.com

# Create a backup directory
mkdir -p ~/backups/auth_fix_$(date +%Y%m%d)

# Backup the existing files
cp ~/public_html/authentication/views.py ~/backups/auth_fix_$(date +%Y%m%d)/
cp ~/public_html/authentication/utils.py ~/backups/auth_fix_$(date +%Y%m%d)/
cp ~/public_html/mathmuseums/middleware.py ~/backups/auth_fix_$(date +%Y%m%d)/
cp ~/public_html/mathmuseums/settings.py ~/backups/auth_fix_$(date +%Y%m%d)/
```

### 2. Upload the Fix

Use an SFTP client (like FileZilla) or SCP to upload the `auth_fix_deployment.zip` file to your HelioHost account.

```bash
# Upload using SCP
scp auth_fix_deployment.zip username@math.moshchuk.com:~/
```

### 3. Extract and Deploy the Fix

```bash
# Connect to HelioHost via SSH
ssh username@math.moshchuk.com

# Extract the deployment package
unzip auth_fix_deployment.zip

# Copy the fixed files to their respective locations
cp auth_fix_deployment/authentication/views.py ~/public_html/authentication/
cp auth_fix_deployment/authentication/utils.py ~/public_html/authentication/
cp auth_fix_deployment/mathmuseums/middleware.py ~/public_html/mathmuseums/
cp auth_fix_deployment/mathmuseums/settings.py ~/public_html/mathmuseums/

# Set proper permissions
chmod 644 ~/public_html/authentication/views.py
chmod 644 ~/public_html/authentication/utils.py
chmod 644 ~/public_html/mathmuseums/middleware.py
chmod 644 ~/public_html/mathmuseums/settings.py

# Create log directory (if it doesn't exist)
mkdir -p ~/public_html/logs
touch ~/public_html/django.log
chmod 666 ~/public_html/django.log
```

### 4. Restart the Application

```bash
# HelioHost typically auto-reloads when files change
# but you can explicitly restart by touching the WSGI file
touch ~/public_html/dispatch.wsgi
```

## Post-Deployment Verification

1. Visit https://math.moshchuk.com/auth/request/
2. Enter a test email address
3. Check if the authentication flow works end-to-end
4. Verify logs for proper error reporting:

```bash
# Check the log file
tail -n 50 ~/public_html/django.log
```

## Rollback Procedure (if needed)

If the deployment causes issues, restore the backup files:

```bash
# Restore from backup
cp ~/backups/auth_fix_$(date +%Y%m%d)/views.py ~/public_html/authentication/
cp ~/backups/auth_fix_$(date +%Y%m%d)/utils.py ~/public_html/authentication/
cp ~/backups/auth_fix_$(date +%Y%m%d)/middleware.py ~/public_html/mathmuseums/
cp ~/backups/auth_fix_$(date +%Y%m%d)/settings.py ~/public_html/mathmuseums/

# Restart
touch ~/public_html/dispatch.wsgi
```

## Monitoring

After deployment, monitor the application for 24-48 hours to ensure the fix is working properly. Pay special attention to:

1. Authentication success rate
2. Log entries related to email sending
3. Any 500 errors in the Apache logs

## Contact

If you encounter issues with this deployment, contact:

- Technical Support: support@example.com
- Project Lead: lead@example.com
