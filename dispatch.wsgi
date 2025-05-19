#!/usr/bin/env python

import os
import sys

# Add the project directory to the Python path
project_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_dir)

# Add staticlibs directory to the Python path
staticlibs_dir = os.path.join(project_dir, 'staticlibs')
sys.path.insert(0, staticlibs_dir)

# Load wheel files
import glob
for whl in glob.glob(os.path.join(staticlibs_dir, '*.whl')):
    if whl not in sys.path:
        sys.path.insert(0, whl)

# Apply monkeypatch for translation issues before importing Django
try:
    from monkeypatch import apply_patches
    apply_patches()
except ImportError:
    pass

# Set up Django settings
os.environ['DJANGO_SETTINGS_MODULE'] = 'mathmuseums.settings'

# Import get_wsgi_application at the very end after all path setup
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
