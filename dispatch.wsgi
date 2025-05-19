import os, sys
sys.path.insert(0, "/home/coder248.helioho.st/math.moshchuk.com/staticlibs")
sys.path.append("/home/coder248.helioho.st/math.moshchuk.com")
from django.core.wsgi import get_wsgi_application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mathmuseums.settings')
application = get_wsgi_application()
