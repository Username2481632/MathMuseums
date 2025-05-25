# Minimal WSGI entry for standalone app
import os, sys
# Ensure current folder is on sys.path
sys.path.insert(0, os.path.dirname(__file__))
# Import the WSGI application
from app import application
