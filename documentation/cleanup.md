# Clean-up Project Documentation

## Workspace Clean-up (May 19, 2025)

### Files Removed
- `/home/micha/Documents/Coding/2025/MathMuseums/mathmuseums/dispatch.wsgi` - Duplicate WSGI file
- `/home/micha/Documents/Coding/2025/MathMuseums/db.sqlite3` - Unnecessary SQLite database (using PostgreSQL)
- `/home/micha/Documents/Coding/2025/MathMuseums/index.html` - Redundant with the Django template version
- `/home/micha/Documents/Coding/2025/MathMuseums/mathmuseums/settings.py.new` - Duplicate settings file
- `/home/micha/Documents/Coding/2025/MathMuseums/templates/static` - Empty directory

### Files Kept Intentionally
- All `.whl` files in the `staticlibs/` directory - Intentionally bundled for HelioHost deployment
- `staticlibs/environ/` - Custom environment module for Django settings
- `monkeypatch.py` - Fixes translation issues in HelioHost
- `dispatch.wsgi` - Root WSGI file for HelioHost deployment

### Diagnostic Files (Kept for Production)
- `simple_check.py` - Diagnostic script for HelioHost troubleshooting
- `check_env.py` - Environment checking script for HelioHost

### Maintenance Tools Created
- `cleanup.sh` - Script to remove temporary files and Python bytecode

### .gitignore Updates
- Modified to not exclude staticfiles directory by default
- Added patterns for common temporary files
- Commented out `staticfiles/` line with a note about deployment

## Deployment Note

This project intentionally bundles Python dependencies as wheel files (`.whl`) in the `staticlibs/` directory for deployment to HelioHost, which has limited pip installation capabilities. The `dispatch.wsgi` file is configured to load these dependencies at runtime.

## Clean-up Guidelines

- Run `./cleanup.sh` periodically to remove temporary files and bytecode
- Keep the `staticlibs/` directory and its contents under version control
- Do not delete the root `dispatch.wsgi` file or `monkeypatch.py`
- The `staticfiles/` directory should be version controlled for this project
