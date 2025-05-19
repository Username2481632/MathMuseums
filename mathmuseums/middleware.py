"""
Custom middleware for handling locale/translation issues in HelioHost environment.
"""

class DisableTranslationMiddleware:
    """
    Middleware that disables Django's translation functionality.
    This is useful for shared hosting environments where locale files might not be writable.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Store the original value of USE_I18N
        old_use_i18n = request.META.get('_USE_I18N_ORIGINAL', None)
        
        # Disable internationalization temporarily
        from django.conf import settings
        if not hasattr(settings, '_USE_I18N_ORIGINAL'):
            settings._USE_I18N_ORIGINAL = getattr(settings, 'USE_I18N', False)
            settings.USE_I18N = False
        
        # Process the request
        response = self.get_response(request)
        
        # Restore the original value (if needed)
        if old_use_i18n is not None:
            settings.USE_I18N = old_use_i18n
            
        return response

class AuthRequiredDebugMiddleware:
    """
    Middleware for debugging authentication-related issues.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Get the current path
        path = request.path_info
        
        # Log authentication state for debugging
        authenticated = request.user.is_authenticated
        print(f"DEBUG: Request to {path} - User authenticated: {authenticated}")
        
        # Process the request
        response = self.get_response(request)
        
        # Log response status
        print(f"DEBUG: Response for {path} - Status code: {response.status_code}")
        
        return response
