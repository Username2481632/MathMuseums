import os
import sys

# Add the project root (old_proj.bak) to Python path
project_path = os.path.join(os.path.dirname(__file__), 'old_proj.bak')
sys.path.insert(0, project_path)

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mathmuseums.settings')

# Import and instantiate WSGI application for Passenger
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
