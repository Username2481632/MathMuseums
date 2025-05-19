import os, sys

# Edit your path below to match your actual server path when deploying to HelioHost
sys.path.append("/home/coder248.helioho.st/math.moshchuk.com")

# Set up environment before importing Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mathmuseums.settings')

# Import the WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
