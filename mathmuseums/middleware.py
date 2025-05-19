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
        import logging
        self.logger = logging.getLogger('django')
        
    def __call__(self, request):
        # Get the current path
        path = request.path_info
        
        # Log authentication state for debugging
        authenticated = request.user.is_authenticated
        self.logger.debug(f"Request to {path} - User authenticated: {authenticated}")
        
        # Process the request
        response = self.get_response(request)
        
        # Log response status
        self.logger.debug(f"Response for {path} - Status code: {response.status_code}")
        
        # Log details for error responses
        if response.status_code >= 400:
            self.logger.error(f"Error {response.status_code} for {request.method} {path}")
            if hasattr(response, 'content') and len(response.content) < 1000:
                self.logger.error(f"Response content: {response.content}")
        
        return response

class ExceptionLoggingMiddleware:
    """
    Middleware that logs unhandled exceptions.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        import logging
        self.logger = logging.getLogger('django')
        
    def __call__(self, request):
        return self.get_response(request)
        
    def process_exception(self, request, exception):
        import traceback
        self.logger.error(f"Unhandled exception: {str(exception)}")
        self.logger.error(f"Path: {request.path_info}")
        self.logger.error(f"Method: {request.method}")
        self.logger.error(f"User: {request.user}")
        
        # Get traceback information
        tb = traceback.format_exc()
        self.logger.error(f"Traceback: {tb}")
        
        # Don't return a response - let Django's default exception handling take over
        return None
