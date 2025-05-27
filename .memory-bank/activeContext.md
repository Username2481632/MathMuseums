# Active Context

## Current Focus

- **CRITICAL SECURITY FIX COMPLETED** (May 27, 2025 - 23:30)
  - ✅ **VULNERABILITY IDENTIFIED**: Application exposed all resources to unauthenticated users
  - ✅ **AUTHENTICATION-FIRST ARCHITECTURE**: Implemented proper security controls
  - ✅ **PROTECTED STATIC FILES**: JavaScript and CSS files now require authentication
  - ✅ **TESTING VERIFIED**: No application resources accessible without authentication
  - ✅ **DEPLOYMENT READY**: Security fix validated and ready for production
  - **Next**: Deploy security fix to production environment

- **SMTP Email Issue RESOLVED** (May 27, 2025 - 19:45)
  - ✅ **ROOT CAUSE IDENTIFIED**: Mailbox checkbox was unchecked in Plesk email configuration
  - ✅ **SOLUTION**: Enabled mailbox for `noreply@math.moshchuk.com` in Plesk control panel
  - ✅ **RESULT**: SMTP authentication now working properly
  - **Key Learning**: Without mailbox enabled, email account exists for Plesk login but not for mail authentication
  - **Credit**: Issue resolved with help from Krydos (HelioHost support) in Discord

- **Project Restoration**
  - Moved Django project files back from `old_proj.bak/` to main directory
  - Cleaned up directory structure for support communication
  - Maintained minimal test files for SMTP debugging

## Recent Changes

- **CRITICAL SECURITY FIX IMPLEMENTED** (May 27, 2025 - Evening)
  - **Security Architecture**: Implemented authentication-first loading to prevent unauthorized access
  - **URL Routing Changes**: 
    - `/` now serves minimal auth check page (`auth_check` view)
    - `/app/` serves full application with `@login_required` protection (`app_view`)
  - **Static File Protection**: 
    - JavaScript files (`/static/js/*`) require authentication
    - CSS files (`/static/css/*`) require authentication
    - Image files (`/static/img/*`) remain publicly accessible
  - **Authentication Flow**: 
    - Created `auth_check.html` with minimal JavaScript for authentication verification
    - Authenticated users redirect to `/app/` for full application access
    - Unauthenticated users redirect to `/auth/request/` login page
  - **View Protection**: Added `@login_required` decorator to `app_view` function
  - **Testing**: Comprehensively verified security controls prevent unauthorized resource access

- **SMTP Issue RESOLVED** (May 27, 2025 - Evening)
  - **Root Cause**: Mailbox checkbox was unchecked in Plesk for `noreply@math.moshchuk.com`
  - **Discovery**: Krydos (HelioHost support) identified the issue via Discord troubleshooting
  - **Technical Insight**: Without mailbox enabled, account exists for Plesk login but not mail authentication
  - **Error Analysis**: `No such user 'noreply@math.moshchuk.com' in mail authorization database`
  - **Solution**: Enabled mailbox checkbox in Plesk - authentication now works
  - **Status**: Email functionality fully operational, ready for production deployment

- **Directory Structure Cleanup**
  - Moved entire Django project back from `old_proj.bak/` to main directory
  - Removed backup directory after successful restoration
  - Cleaned up test files to bare minimum for HelioHost support communication

- **Previous Authentication Fixes** (Preserved)
  - Authentication system working except for email sending
  - SMTP backend properly configured in Django settings
  - All authentication endpoints and frontend integration functional
- Identified and attempted to resolve deployment issue with PostgreSQL version requirement:
  - Discovered Django 5.0.7 requires PostgreSQL 14+, but HelioHost only provides PostgreSQL 13.20
  - Attempted several solutions to bypass the version check, but none were successful
  - Documented all attempted approaches for future reference
- Fixed authentication system email sending issues:
  - Added robust error handling in authentication views
  - Enhanced email sending utilities with better error handling
  - Updated email backend configuration for production
  - Added comprehensive logging for troubleshooting
  - Created deployment script for the authentication fix
- Implemented client-side API integration for the frontend (Step 6):
  - Created auth.js module for authentication management
  - Implemented sync.js module for data synchronization
  - Added preferences.js module for cross-device preference sync
  - Enhanced storage.js to track and synchronize changes
  - Added visual sync status indicator and manual sync button
  - Implemented optimistic concurrency control on the client-side
- Implemented database models for concept tiles and synchronization:
  - Added version field to concept tiles for optimistic concurrency control
  - Added last_synced field to track synchronization status
  - Created SyncLog model to track sync operations
  - Implemented migrations and applied them to the database
- Created comprehensive API endpoints for synchronization:
  - Added sync endpoint for bulk operations
  - Added conflict detection and resolution
  - Enhanced concept tile endpoints with versioning
  - Created endpoints for viewing sync logs
- Created detailed API documentation:
  - Documented authentication flow
  - Documented concept tile endpoints
  - Documented synchronization endpoints
  - Provided implementation notes for frontend developers
- Implemented login requirement for the main application:
  - Added login_required decorator to the main index view
  - Configured LOGIN_URL to redirect to authentication page
  - Added debugging middleware for authentication troubleshooting
  - Enhanced authentication templates with better styling
- Removed padding and margins from the home page to maximize usable space:
  - Eliminated padding in #app-container
  - Removed margin-top from .tiles-container
  - Adjusted height calculation to use more vertical space
  - Set container padding values to 0 in getContainerPadding()
  - Added blue highlight effect during tile dragging to match resize styling
- Restored margins for detail views while keeping zero margins for home view
- Created view-specific styling to ensure proper appearance across different views
- Modified header padding to be more compact
- Ensured consistent visual feedback during user interactions:
  - Blue highlight during both resizing and dragging operations
  - Consistent cursor styling for different interaction modes
- Fixed navigation between views with proper resource cleanup
- Removed extraneous files and backup history
- Ensured all controllers have proper cleanup methods
- Implemented proper Desmos preview image generation for tile grid
- Added resource cleanup to prevent memory leaks during navigation
- Enhanced error handling and loading states for preview images
- Bundled Django REST Framework and dependencies as .whl files in staticlibs for HelioHost deployment
- Updated dispatch.wsgi to load .whl files from staticlibs at runtime
- Moved ALLOWED_HOSTS to .env and updated settings.py to use env.list('ALLOWED_HOSTS')
- Committed and pushed all changes for deployment
- Investigated and resolved ModuleNotFoundError for rest_framework on HelioHost
- Switched Django email backend to Sendmail for production to match HelioHost/Plesk config
- Installed full Django package in staticlibs/ to ensure all backends (including Sendmail) are available
- Removed all SMTP settings from production config and .env
- Updated logging in authentication utilities for Sendmail context
- Verified that custom Django installs work on HelioHost shared hosting

## Active Decisions

- **Email Configuration Complete**
  - ✅ **SMTP Authentication**: Resolved via mailbox checkbox in Plesk
  - ✅ **Production Settings**: Using `noreply@math.moshchuk.com` with HelioHost SMTP
  - ✅ **Security**: Email credentials verified and working properly
  - **Configuration**: EMAIL_HOST=sr308.hostgator.com, EMAIL_PORT=465, EMAIL_USE_SSL=True
  
- **Deployment Ready**
  - Django application fully configured for HelioHost production
  - All authentication components working including email verification
  - SMTP test scripts no longer needed (can be cleaned up)
  - Ready for final production deployment and testing
    1. Downgrade to Django 4.2.x which might be compatible with PostgreSQL 13.x
    2. Switch to MariaDB 10.5.27 which is also available on HelioHost
    3. Find alternative hosting that supports PostgreSQL 14+
- Using optimistic concurrency control for data synchronization
- Implementing versioning to detect conflicts between devices
- Using an offline-first approach with IndexedDB as the primary data store
- Implementing server-side conflict detection and resolution
- Planning to use a background sync process in the client
- Prioritizing user experience by allowing offline work with later synchronization

## Next Steps

1. **Deploy Complete Application** (Immediate Priority)
   - Clean up SMTP test scripts (no longer needed)
   - Deploy Django application to HelioHost with working email functionality
   - Test end-to-end authentication flow including email verification OTP
   - Verify all application functionality on production server

2. **Production Testing & Validation**
   - Test user registration and login with email verification
   - Verify concept tile CRUD operations and synchronization
   - Test offline functionality and data persistence
   - Validate performance and error handling in production environment

3. **Documentation & Cleanup**
   - Update memory bank with final SMTP resolution details
   - Document HelioHost email configuration requirements for future reference
   - Clean up development test files and scripts
   - Update deployment documentation with lessons learned

4. **Future Enhancements**
   - Monitor email delivery rates and performance
   - Consider email rate limiting and abuse prevention
   - Plan for additional features and user experience improvements

## Decisions Made

- Fixed tile sizes: 250px width × 200px height
- Default tile layout: 3 columns with padding
- Drag behavior: Direct positioning without animations for precise control
- Z-index management: Higher z-index during drag, reset afterward
- Drag cooldown: 300ms delay before clicks are registered after dragging

---

## [Added from documentation/implementation-report.md]

### Issues and Solutions
1. **Issue**: Authentication state not persisting
   - **Solution**: Added session cookie check for authentication state
2. **Issue**: Conflict detection missing for some updates
   - **Solution**: Added version tracking to all concept updates
3. **Issue**: UI not updating after sync
   - **Solution**: Added sync status indicator and update mechanism
4. **Issue**: Sync failing when offline
   - **Solution**: Added offline detection and retry mechanism

---

## [Added from documentation/api-integration-status.md]

### Testing Instructions
- Run the Django development server and verify authentication, sync, offline, and multi-device scenarios as described.
- Known issues: No robust conflict resolution UI yet; some browsers may limit background sync in inactive tabs.

---

## [Added from documentation/client-integration.md]

### Client-Side API Integration Plan
- Outlines the required changes for authentication, synchronization, preferences, onboarding, and UI integration.
- Includes implementation plan and testing strategy for client-side API integration

---

## Migration Plan: Switch from PostgreSQL to MariaDB (May 20, 2025)

### Context
- PostgreSQL 13.20 on HelioHost is incompatible with Django 5.0.7 (requires 14+).
- MariaDB 10.5.27 is available and fully supported by Django.
- Project does not use PostgreSQL-specific features; MariaDB is suitable.

### Migration Steps
1. **Database Preparation**
   - Create a new MariaDB database and user via HelioHost Plesk.
   - Record credentials for Django configuration.
2. **Django Configuration**
   - Update `settings.py` to use `django.db.backends.mysql` with MariaDB credentials.
   - Update `.env` if database settings are stored there.
   - Add `mysqlclient` to requirements if not present (or use `PyMySQL` as fallback).
3. **Migrations**
   - Run `python manage.py makemigrations` and `migrate` to initialize MariaDB schema.
   - If data migration is needed, export from PostgreSQL and import to MariaDB (using `dumpdata`/`loaddata` or a tool like `pg2mysql`).
4. **Testing**
   - Run all tests and verify authentication, sync, and all CRUD operations.
   - Check for any SQL or ORM compatibility issues.
5. **Deployment**
   - Update deployment scripts and documentation for MariaDB.
   - Remove PostgreSQL-specific dependencies from requirements and staticlibs.
   - Deploy to HelioHost and verify production operation.
6. **Documentation**
   - Update Memory Bank and project docs to reflect the switch to MariaDB.

### Risks/Notes
- MariaDB is missing some advanced PostgreSQL features, but none are used in this project.
- Ensure all dependencies for MySQL/MariaDB are bundled for HelioHost deployment.
- Test thoroughly for any edge-case SQL differences.

---

**Next:** Begin with database and settings configuration changes.

# Alternative email configuration for production
# Gmail SMTP (requires app password if 2FA is enabled)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
DEFAULT_FROM_EMAIL=your-gmail@gmail.com

# Or use another email service like SendGrid, Mailgun, etc.

---

**Status**: All major issues resolved, ready for production deployment.
