import os, sys

# Edit your path below to match your actual server path when deploying to HelioHost
sys.path.append("/home/coder248.helioho.st/math.moshchuk.com")
from django.core.wsgi import get_wsgi_application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mathmuseums.settings')
application = get_wsgi_application()
