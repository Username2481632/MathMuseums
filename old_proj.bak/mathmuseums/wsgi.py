"""
WSGI config for mathmuseums project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/wsgi/
"""

import os

# Set environment variable before any Django imports
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mathmuseums.settings')

# Import the WSGI application getter
from django.core.wsgi import get_wsgi_application

# Create the WSGI application
application = get_wsgi_application()
