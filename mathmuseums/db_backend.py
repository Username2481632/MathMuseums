from django.db.backends.postgresql import base

class DatabaseWrapper(base.DatabaseWrapper):
    """
    Custom PostgreSQL backend that bypasses version checking.
    This allows us to use PostgreSQL 13.x on HelioHost with Django 5.x 
    which normally requires PostgreSQL 14+.
    """
    
    def ensure_connection(self):
        """
        Override ensure_connection to skip PostgreSQL version check.
        """
        try:
            # Call parent method but catch ImproperlyConfigured exception 
            # for PostgreSQL version requirements
            return super().ensure_connection()
        except Exception as e:
            if "PostgreSQL 14 or later is required" in str(e):
                # Log the exception but continue anyway
                import logging
                logger = logging.getLogger('django.db.backends')
                logger.warning(
                    "Suppressing PostgreSQL version check: %s", str(e)
                )
                # Skip the version check and continue
                # This assumes DB functionality will work despite version mismatch
                return None
            # Re-raise any other exceptions
            raise