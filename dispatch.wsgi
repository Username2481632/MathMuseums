import os, sys
sys.path.insert(0, "/home/coder248.helioho.st/math.moshchuk.com/staticlibs")
sys.path.append("/home/coder248.helioho.st/math.moshchuk.com")

# Load wheel files before Django setup
import glob
for whl in glob.glob(os.path.join(os.path.dirname(__file__), 'staticlibs', '*.whl')):
    if whl not in sys.path:
        sys.path.insert(0, whl)

# Now initialize Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mathmuseums.settings')
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
