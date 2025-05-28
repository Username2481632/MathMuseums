"""
URL configuration for mathmuseums project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import FileResponse, Http404
from django.views.static import serve
import os

# Import migration runner for database setup
from migrate_runner import run_migrations_view

def auth_check(request):
    """Minimal page that only checks authentication before loading app resources"""
    return render(request, 'auth_check.html')

@login_required
def app_view(request):
    """Main application view - only accessible to authenticated users"""
    return render(request, 'index.html')

@login_required
def protected_static(request, path):
    """Serve critical static files (JS/CSS) only to authenticated users"""
    # The path already includes js/ or css/ prefix from URL pattern
    return serve_static_file(path)

def protected_js(request, path):
    """Serve JS files only to authenticated users"""
    if not request.user.is_authenticated:
        return redirect('auth_request')
    full_path = f"js/{path}"
    return serve_static_file(full_path)

def protected_css(request, path):
    """Serve CSS files only to authenticated users"""
    if not request.user.is_authenticated:
        return redirect('auth_request')
    full_path = f"css/{path}"
    return serve_static_file(full_path)

def public_static(request, path):
    """Serve non-critical static files (images, etc.) to all users"""
    # Only allow specific file types that are safe for public access
    allowed_extensions = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf']
    if not any(path.lower().endswith(ext) for ext in allowed_extensions):
        raise Http404("Static file not found")
    
    # For img/ path, add the img/ prefix back since URL pattern removes it
    full_path = f"img/{path}"
    return serve_static_file(full_path)

def serve_static_file(path):
    """Helper function to serve static files"""
    # Try different static file locations
    static_locations = [
        os.path.join(settings.BASE_DIR, 'static', path),
    ]
    
    if hasattr(settings, 'STATIC_ROOT') and settings.STATIC_ROOT:
        static_locations.insert(0, os.path.join(settings.STATIC_ROOT, path))
    
    for static_path in static_locations:
        if os.path.exists(static_path) and os.path.isfile(static_path):
            return FileResponse(open(static_path, 'rb'))
    
    raise Http404("Static file not found")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('auth/', include('authentication.urls')),
    path('app/', app_view, name='app'),
    # TEMPORARY: Migration runner for database setup (REMOVE AFTER USE)
    path('run-migrations/', run_migrations_view, name='run_migrations'),
    # Protected static files (JS/CSS) - require authentication
    path('static/js/<path:path>', protected_js, name='protected_js'),
    path('static/css/<path:path>', protected_css, name='protected_css'),
    # Public static files (images, fonts) - no authentication required
    path('static/img/<path:path>', public_static, name='public_static'),
    path('static/<path:path>', public_static, name='fallback_static'),
    path('', auth_check, name='auth_check'),
]
