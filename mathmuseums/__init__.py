# mathmuseums/__init__.py
# Apply monkeypatch to make Django 5.x work with PostgreSQL 13.x

def _monkeypatch_postgresql_version():
    """
    Monkeypatch the PostgreSQL version check in Django to allow 
    using PostgreSQL 13.x with Django 5.x (which requires 14+).
    
    This must be applied before any Django imports occur.
    """
    try:
        # Import the PostgreSQL base module
        from django.db.backends.postgresql import base
        
        # Store the original version check function (for reference only)
        # original_get_version = base._get_database_version
        
        # Define a replacement function
        def patched_get_version(connection):
            """Return a fake PostgreSQL version 14.0"""
            return 140000
        
        # Apply the patch
        base._get_database_version = patched_get_version
        
        # Add a note about the patch
        if not hasattr(base, '_pg_version_patched'):
            base._pg_version_patched = True
            import logging
            logger = logging.getLogger('django.db.backends')
            logger.warning(
                "PostgreSQL version check has been patched to bypass Django's "
                "version requirement. Actual PostgreSQL version may be lower than required."
            )
            
        return True
        
    except (ImportError, AttributeError):
        # Django import failed or function name changed
        return False

# Apply the monkeypatch
_monkeypatch_postgresql_version()