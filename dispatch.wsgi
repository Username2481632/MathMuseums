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
import glob  # noqa: E402
for whl in glob.glob(os.path.join(staticlibs_dir, '*.whl')):
    if whl not in sys.path:
        sys.path.insert(0, whl)

# Set Django settings module
os.environ['DJANGO_SETTINGS_MODULE'] = 'mathmuseums.settings'

# Patch PostgreSQL version requirement for HelioHost PG13
import django.db.backends.postgresql.base as pg_base  # noqa: E402
from django.core.exceptions import ImproperlyConfigured  # noqa: E402

_orig_ensure = pg_base.DatabaseWrapper.ensure_connection

def ensure_no_version(self):
    try:
        return _orig_ensure(self)
    except ImproperlyConfigured as exc:
        if 'PostgreSQL 14 or later is required' in str(exc):
            return
        raise

pg_base.DatabaseWrapper.ensure_connection = ensure_no_version

# Import and set up WSGI application
from django.core.wsgi import get_wsgi_application  # noqa: E402
application = get_wsgi_application()
