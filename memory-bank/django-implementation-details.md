# Django Integration Implementation Details

This document provides detailed technical implementation guidance for each step in the Django Integration and HelioHost Deployment Plan.

## Step 1: Set Up Project Structure

### Virtual Environment Setup
```bash
# Navigate to project root
cd /home/micha/Documents/Coding/2025/MathMuseums

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install Django and required packages
pip install django==5.0.7 djangorestframework psycopg2-binary django-cors-headers django-environ

# Save requirements
pip freeze > requirements.txt
```

### Django Project Creation
```bash
# Create Django project
django-admin startproject mathmuseums .

# Create apps
python manage.py startapp api
python manage.py startapp authentication
```

### Directory Structure
Ensure the final directory structure looks like this:
```
mathmuseums/                 # Project root
├── api/                     # API app
├── authentication/          # Authentication app
├── css/                     # Original CSS files
├── index.html               # Original HTML
├── js/                      # Original JS files
├── manage.py                # Django manage.py
├── mathmuseums/             # Django project settings
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── memory-bank/             # Documentation
├── requirements.txt         # Python dependencies
├── static/                  # Static files directory (new)
└── venv/                    # Virtual environment
```

### Django Settings Configuration
Edit `mathmuseums/settings.py`:
```python
import os
from pathlib import Path

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-your-secret-key-here'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'yourdomain.helioho.st']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'api',
    'authentication',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'mathmuseums.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'mathmuseums.wsgi.application'

# Database
# For local development
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "css"),
    os.path.join(BASE_DIR, "js"),
]
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS settings
CORS_ALLOW_ALL_ORIGINS = True  # For development only

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

### URL Configuration
Edit `mathmuseums/urls.py`:
```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('auth/', include('authentication.urls')),
    path('', TemplateView.as_view(template_name='index.html')),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
```

### Create Basic App URL Files
Create `api/urls.py`:
```python
from django.urls import path

urlpatterns = [
    # Will add API endpoints later
]
```

Create `authentication/urls.py`:
```python
from django.urls import path

urlpatterns = [
    # Will add authentication endpoints later
]
```

### Create Templates Directory
```bash
mkdir templates
cp index.html templates/
```

Update `templates/index.html` with proper static file paths.

### Initialize Django
```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic
```

## Step 2: Set Up PostgreSQL Database

### Local PostgreSQL Setup
```bash
# Install PostgreSQL (if not already installed)
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres psql -c "CREATE DATABASE mathmuseums;"
sudo -u postgres psql -c "CREATE USER mathmuseums_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "ALTER ROLE mathmuseums_user SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "ALTER ROLE mathmuseums_user SET default_transaction_isolation TO 'read committed';"
sudo -u postgres psql -c "ALTER ROLE mathmuseums_user SET timezone TO 'UTC';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mathmuseums TO mathmuseums_user;"
```

### Update Django Settings for PostgreSQL
Edit `mathmuseums/settings.py`:
```python
# Database settings (replace the existing DATABASES config)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'mathmuseums',
        'USER': 'mathmuseums_user',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### Using Environment Variables for Security
Create `.env` file in project root:
```
DATABASE_NAME=mathmuseums
DATABASE_USER=mathmuseums_user
DATABASE_PASSWORD=your_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
SECRET_KEY=your-django-secret-key
```

Add to `.gitignore`:
```
.env
venv/
__pycache__/
*.py[cod]
*$py.class
db.sqlite3
```

Update `settings.py` to use environment variables:
```python
import environ

env = environ.Env()
environ.Env.read_env()

# Secret key
SECRET_KEY = env('SECRET_KEY')

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DATABASE_NAME'),
        'USER': env('DATABASE_USER'),
        'PASSWORD': env('DATABASE_PASSWORD'),
        'HOST': env('DATABASE_HOST'),
        'PORT': env('DATABASE_PORT'),
    }
}
```

### Apply Migrations
```bash
python manage.py migrate
```

## Step 3: Implement User Authentication System

### Custom User Model
Edit `authentication/models.py`:
```python
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _

class UserManager(BaseUserManager):
    """Define a model manager for User model with no username field."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        """Create and save a User with the given email and password."""
        if not email:
            raise ValueError('The given email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular User with the given email and password."""
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        """Create and save a SuperUser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self._create_user(email, password, **extra_fields)

class User(AbstractUser):
    """User model that uses email as the unique identifier instead of username."""

    username = None
    email = models.EmailField(_('email address'), unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

class OTPCode(models.Model):
    """One-time password model for authentication."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_codes')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"OTP for {self.user.email} (valid until {self.expires_at})"
```

Update `settings.py`:
```python
# Add to the existing configuration
AUTH_USER_MODEL = 'authentication.User'
```

### OTP Authentication Implementation
Create `authentication/utils.py`:
```python
import random
import string
from datetime import datetime, timedelta
from django.core.mail import send_mail
from django.conf import settings
from .models import OTPCode, User

def generate_otp(length=6):
    """Generate a random OTP code."""
    return ''.join(random.choices(string.digits, k=length))

def send_otp_email(user_email, otp_code):
    """Send OTP code to user's email."""
    subject = "Your Math Museums verification code"
    message = f"Your verification code is: {otp_code}\n\nThis code will expire in 15 minutes."
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = [user_email]
    
    return send_mail(
        subject,
        message,
        from_email,
        recipient_list,
        fail_silently=False,
    )

def create_otp_for_user(user):
    """Create a new OTP code for the user."""
    # Expire all existing OTP codes for this user
    OTPCode.objects.filter(user=user, is_used=False).update(is_used=True)
    
    # Create new OTP code
    otp_code = generate_otp()
    expires_at = datetime.now() + timedelta(minutes=15)
    
    otp = OTPCode.objects.create(
        user=user,
        code=otp_code,
        expires_at=expires_at
    )
    
    # Send email with OTP
    send_otp_email(user.email, otp_code)
    
    return otp

def verify_otp(user, otp_code):
    """Verify if OTP code is valid for the user."""
    try:
        otp = OTPCode.objects.get(
            user=user,
            code=otp_code,
            is_used=False,
            expires_at__gt=datetime.now()
        )
        otp.is_used = True
        otp.save()
        return True
    except OTPCode.DoesNotExist:
        return False

def get_or_create_user(email):
    """Get existing user or create a new one."""
    try:
        return User.objects.get(email=email), False
    except User.DoesNotExist:
        # Create a random password - will not be used since we're using OTP
        random_password = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
        user = User.objects.create_user(email=email, password=random_password)
        return user, True
```

### Authentication Views
Edit `authentication/views.py`:
```python
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.views.generic import View
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import User
from .utils import create_otp_for_user, verify_otp, get_or_create_user

class RequestOTPView(APIView):
    """API view for requesting an OTP code."""
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user, created = get_or_create_user(email)
        otp = create_otp_for_user(user)
        
        return Response({
            'message': 'OTP sent to email',
            'is_new_user': created
        })

class VerifyOTPView(APIView):
    """API view for verifying an OTP code."""
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        otp_code = request.data.get('otp_code')
        
        if not email or not otp_code:
            return Response({'error': 'Email and OTP code are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if verify_otp(user, otp_code):
            login(request, user)
            return Response({'message': 'Authentication successful'})
        else:
            return Response({'error': 'Invalid or expired OTP code'}, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    """API view for logging out the user."""
    
    def post(self, request):
        logout(request)
        return Response({'message': 'Logged out successfully'})

class UserProfileView(APIView):
    """API view for getting the current user's profile."""
    
    def get(self, request):
        user = request.user
        return Response({
            'email': user.email,
            'is_authenticated': True
        })
```

### Authentication URLs
Update `authentication/urls.py`:
```python
from django.urls import path
from .views import RequestOTPView, VerifyOTPView, LogoutView, UserProfileView

urlpatterns = [
    path('request-otp/', RequestOTPView.as_view(), name='request-otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', UserProfileView.as_view(), name='profile'),
]
```

### Email Settings
Add to `settings.py`:
```python
# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # For development
DEFAULT_FROM_EMAIL = 'noreply@mathmuseums.example.com'
```

### Migrations
```bash
python manage.py makemigrations authentication
python manage.py migrate
```

## Step 4: Define Database Models for User Data

### Create API Models
Edit `api/models.py`:
```python
from django.db import models
from django.conf import settings
from django.utils import timezone

class ConceptTile(models.Model):
    """Model representing a concept tile with its data and position."""
    
    CONCEPT_TYPES = [
        ('linear', 'Linear'),
        ('quadratic', 'Quadratic'),
        ('cubic', 'Cubic'),
        ('square_root', 'Square Root'),
        ('cube_root', 'Cube Root'),
        ('absolute_value', 'Absolute Value'),
        ('rational', 'Rational/Inverse'),
        ('exponential', 'Exponential'),
        ('logarithmic', 'Logarithmic'),
        ('trigonometric', 'Trigonometric'),
        ('piecewise', 'Piecewise'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='concept_tiles')
    concept_type = models.CharField(max_length=20, choices=CONCEPT_TYPES)
    position_x = models.IntegerField(default=0)
    position_y = models.IntegerField(default=0)
    width = models.IntegerField(default=250)
    height = models.IntegerField(default=200)
    desmos_state = models.JSONField(default=dict)
    description = models.TextField(blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_synced = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return f"{self.concept_type} tile for {self.user.email}"
    
    class Meta:
        unique_together = ('user', 'concept_type')

class UserPreference(models.Model):
    """Model for storing user preferences."""
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='preferences')
    disable_onboarding = models.BooleanField(default=False)
    image_skill = models.BooleanField(default=False)
    theme_preference = models.CharField(max_length=20, default='light')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Preferences for {self.user.email}"
```

### Create Serializers
Create `api/serializers.py`:
```python
from rest_framework import serializers
from .models import ConceptTile, UserPreference
from authentication.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email']
        read_only_fields = ['email']

class ConceptTileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConceptTile
        fields = [
            'id', 'concept_type', 'position_x', 'position_y', 
            'width', 'height', 'desmos_state', 'description', 
            'completed', 'created_at', 'updated_at', 'last_synced'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        user = self.context['request'].user
        return ConceptTile.objects.create(user=user, **validated_data)

class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = [
            'id', 'disable_onboarding', 'image_skill', 
            'theme_preference', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        user = self.context['request'].user
        return UserPreference.objects.create(user=user, **validated_data)
```

### Migrations
```bash
python manage.py makemigrations api
python manage.py migrate
```

## Step 5: Develop REST API Endpoints

### API Views
Edit `api/views.py`:
```python
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from .models import ConceptTile, UserPreference
from .serializers import ConceptTileSerializer, UserPreferenceSerializer

class ConceptTileViewSet(viewsets.ModelViewSet):
    """ViewSet for ConceptTile model."""
    
    serializer_class = ConceptTileSerializer
    
    def get_queryset(self):
        return ConceptTile.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def sync(self, request):
        """Sync multiple concept tiles at once."""
        tiles_data = request.data.get('tiles', [])
        sync_results = []
        
        for tile_data in tiles_data:
            concept_type = tile_data.get('concept_type')
            if not concept_type:
                continue
            
            try:
                # Check if tile exists
                tile = ConceptTile.objects.get(
                    user=request.user,
                    concept_type=concept_type
                )
                
                # Compare last_synced to determine which is newer
                client_synced = tile_data.get('last_synced')
                if client_synced and tile.last_synced.isoformat() < client_synced:
                    # Client version is newer
                    serializer = self.get_serializer(tile, data=tile_data, partial=True)
                    if serializer.is_valid():
                        serializer.save(last_synced=timezone.now())
                        sync_results.append({
                            'concept_type': concept_type,
                            'status': 'updated',
                            'data': serializer.data
                        })
                    else:
                        sync_results.append({
                            'concept_type': concept_type,
                            'status': 'error',
                            'errors': serializer.errors
                        })
                else:
                    # Server version is newer or same
                    sync_results.append({
                        'concept_type': concept_type,
                        'status': 'server_newer',
                        'data': self.get_serializer(tile).data
                    })
            
            except ConceptTile.DoesNotExist:
                # Create new tile
                serializer = self.get_serializer(data=tile_data)
                if serializer.is_valid():
                    serializer.save(user=request.user, last_synced=timezone.now())
                    sync_results.append({
                        'concept_type': concept_type,
                        'status': 'created',
                        'data': serializer.data
                    })
                else:
                    sync_results.append({
                        'concept_type': concept_type,
                        'status': 'error',
                        'errors': serializer.errors
                    })
        
        return Response(sync_results)

class UserPreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet for UserPreference model."""
    
    serializer_class = UserPreferenceSerializer
    
    def get_queryset(self):
        return UserPreference.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get the current user's preferences, creating if they don't exist."""
        try:
            preference = UserPreference.objects.get(user=request.user)
            serializer = self.get_serializer(preference)
            return Response(serializer.data)
        except UserPreference.DoesNotExist:
            # Create default preferences
            preference = UserPreference.objects.create(user=request.user)
            serializer = self.get_serializer(preference)
            return Response(serializer.data)
```

### API URLs
Edit `api/urls.py`:
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConceptTileViewSet, UserPreferenceViewSet

router = DefaultRouter()
router.register(r'tiles', ConceptTileViewSet, basename='concepttile')
router.register(r'preferences', UserPreferenceViewSet, basename='userpreference')

urlpatterns = [
    path('', include(router.urls)),
]
```

## Step 6: Modify Frontend for API Integration

### Create API Client
Create `js/utils/api.js`:
```javascript
/**
 * API client for communicating with the Django backend.
 */
class ApiClient {
  constructor() {
    this.baseUrl = '/api';
    this.authUrl = '/auth';
  }

  /**
   * Perform a fetch request with appropriate headers.
   * @param {string} url - The URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise} - Fetch response promise
   */
  async _fetch(url, options = {}) {
    const defaultOptions = {
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': this._getCsrfToken(),
      },
    };

    const fetchOptions = { ...defaultOptions, ...options };
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Request failed');
    }
    
    return response.json();
  }

  /**
   * Get CSRF token from cookie.
   * @returns {string} - CSRF token
   */
  _getCsrfToken() {
    const csrfCookie = document.cookie
      .split(';')
      .find(cookie => cookie.trim().startsWith('csrftoken='));
    
    return csrfCookie ? csrfCookie.split('=')[1] : '';
  }

  /**
   * Check if the user is authenticated.
   * @returns {Promise<Object>} - User profile if authenticated
   */
  async getUserProfile() {
    try {
      return await this._fetch(`${this.authUrl}/profile/`);
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return { is_authenticated: false };
    }
  }

  /**
   * Request OTP for login/signup.
   * @param {string} email - User email
   * @returns {Promise<Object>} - Response with message and whether user is new
   */
  async requestOtp(email) {
    return this._fetch(`${this.authUrl}/request-otp/`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Verify OTP code.
   * @param {string} email - User email
   * @param {string} otpCode - OTP code to verify
   * @returns {Promise<Object>} - Response with authentication result
   */
  async verifyOtp(email, otpCode) {
    return this._fetch(`${this.authUrl}/verify-otp/`, {
      method: 'POST',
      body: JSON.stringify({ email, otp_code: otpCode }),
    });
  }

  /**
   * Log out the current user.
   * @returns {Promise<Object>} - Response with logout result
   */
  async logout() {
    return this._fetch(`${this.authUrl}/logout/`, {
      method: 'POST',
    });
  }

  /**
   * Get user preferences.
   * @returns {Promise<Object>} - User preferences
   */
  async getUserPreferences() {
    return this._fetch(`${this.baseUrl}/preferences/current/`);
  }

  /**
   * Update user preferences.
   * @param {Object} preferences - Updated preferences
   * @returns {Promise<Object>} - Updated preferences
   */
  async updateUserPreferences(preferences) {
    const { id, ...preferencesData } = preferences;
    
    return this._fetch(`${this.baseUrl}/preferences/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(preferencesData),
    });
  }

  /**
   * Get all concept tiles for the current user.
   * @returns {Promise<Array>} - Array of concept tiles
   */
  async getConceptTiles() {
    return this._fetch(`${this.baseUrl}/tiles/`);
  }

  /**
   * Get a specific concept tile.
   * @param {number} id - Tile ID
   * @returns {Promise<Object>} - Concept tile
   */
  async getConceptTile(id) {
    return this._fetch(`${this.baseUrl}/tiles/${id}/`);
  }

  /**
   * Update a concept tile.
   * @param {number} id - Tile ID
   * @param {Object} tileData - Updated tile data
   * @returns {Promise<Object>} - Updated concept tile
   */
  async updateConceptTile(id, tileData) {
    return this._fetch(`${this.baseUrl}/tiles/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(tileData),
    });
  }

  /**
   * Create a new concept tile.
   * @param {Object} tileData - Tile data
   * @returns {Promise<Object>} - Created concept tile
   */
  async createConceptTile(tileData) {
    return this._fetch(`${this.baseUrl}/tiles/`, {
      method: 'POST',
      body: JSON.stringify(tileData),
    });
  }

  /**
   * Sync multiple concept tiles.
   * @param {Array} tiles - Array of tile data to sync
   * @returns {Promise<Array>} - Sync results
   */
  async syncConceptTiles(tiles) {
    return this._fetch(`${this.baseUrl}/tiles/sync/`, {
      method: 'POST',
      body: JSON.stringify({ tiles }),
    });
  }
}

// Create a singleton instance
const api = new ApiClient();
export default api;
```

### Update Storage Utility
Create `js/utils/syncStorage.js`:
```javascript
import { saveToIndexedDB, getFromIndexedDB, getAllFromIndexedDB } from './storage.js';
import api from './api.js';

/**
 * Enhanced storage utility that syncs with the server when available.
 */
class SyncStorage {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingSync = [];
    this.isAuthenticated = false;
    
    // Setup event listeners for online/offline status
    window.addEventListener('online', () => this.handleOnlineStatusChange(true));
    window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the storage utility.
   */
  async initialize() {
    // Check authentication status
    try {
      const profile = await api.getUserProfile();
      this.isAuthenticated = profile.is_authenticated;
      
      // If online and authenticated, perform initial sync
      if (this.isOnline && this.isAuthenticated) {
        this.syncWithServer();
      }
    } catch (error) {
      console.error('Failed to initialize sync storage:', error);
      this.isAuthenticated = false;
    }
  }
  
  /**
   * Handle changes in online status.
   * @param {boolean} isOnline - Whether the device is online
   */
  handleOnlineStatusChange(isOnline) {
    this.isOnline = isOnline;
    
    // If coming online and authenticated, sync pending changes
    if (isOnline && this.isAuthenticated && this.pendingSync.length > 0) {
      this.syncWithServer();
    }
  }
  
  /**
   * Save data to local storage and queue for server sync if online.
   * @param {string} key - Storage key
   * @param {any} data - Data to store
   * @returns {Promise} - Promise resolving to saved data
   */
  async save(key, data) {
    // Always save locally first
    await saveToIndexedDB(key, data);
    
    // If online and authenticated, sync immediately
    if (this.isOnline && this.isAuthenticated) {
      try {
        return await this.syncItem(key, data);
      } catch (error) {
        console.error(`Failed to sync ${key} with server:`, error);
        // Queue for later sync
        this.queueForSync(key);
      }
    } else {
      // Queue for later sync
      this.queueForSync(key);
    }
    
    return data;
  }
  
  /**
   * Get data from local storage.
   * @param {string} key - Storage key
   * @returns {Promise} - Promise resolving to stored data
   */
  async get(key) {
    // Always get from local storage first
    const localData = await getFromIndexedDB(key);
    
    // If online, authenticated, and no local data, try to get from server
    if (this.isOnline && this.isAuthenticated && !localData) {
      try {
        const serverData = await this.fetchFromServer(key);
        if (serverData) {
          // Save to local storage
          await saveToIndexedDB(key, serverData);
          return serverData;
        }
      } catch (error) {
        console.error(`Failed to fetch ${key} from server:`, error);
      }
    }
    
    return localData;
  }
  
  /**
   * Get all data of a certain type from local storage.
   * @param {string} storeNameOrPrefix - Store name or key prefix
   * @returns {Promise} - Promise resolving to array of stored data
   */
  async getAll(storeNameOrPrefix) {
    // Always get from local storage first
    const localData = await getAllFromIndexedDB(storeNameOrPrefix);
    
    // If online and authenticated, sync with server
    if (this.isOnline && this.isAuthenticated) {
      try {
        await this.syncWithServer();
        // Get updated local data after sync
        return await getAllFromIndexedDB(storeNameOrPrefix);
      } catch (error) {
        console.error(`Failed to sync ${storeNameOrPrefix} with server:`, error);
      }
    }
    
    return localData;
  }
  
  /**
   * Queue an item for later sync.
   * @param {string} key - Key to queue
   */
  queueForSync(key) {
    if (!this.pendingSync.includes(key)) {
      this.pendingSync.push(key);
    }
  }
  
  /**
   * Sync a specific item with the server.
   * @param {string} key - Item key
   * @param {any} data - Item data
   * @returns {Promise} - Promise resolving to synced data
   */
  async syncItem(key, data) {
    // Implementation depends on item type and API structure
    if (key.startsWith('conceptTile_')) {
      const tileData = {
        ...data,
        last_synced: new Date().toISOString()
      };
      
      // If tile has ID, update it, otherwise create it
      if (tileData.id) {
        return await api.updateConceptTile(tileData.id, tileData);
      } else {
        return await api.createConceptTile(tileData);
      }
    } else if (key === 'userPreferences') {
      return await api.updateUserPreferences(data);
    }
    
    return data;
  }
  
  /**
   * Fetch an item from the server.
   * @param {string} key - Item key
   * @returns {Promise} - Promise resolving to fetched data
   */
  async fetchFromServer(key) {
    // Implementation depends on item type and API structure
    if (key.startsWith('conceptTile_')) {
      const id = key.split('_')[1];
      return await api.getConceptTile(id);
    } else if (key === 'userPreferences') {
      return await api.getUserPreferences();
    }
    
    return null;
  }
  
  /**
   * Sync all pending items with the server.
   * @returns {Promise} - Promise resolving when sync is complete
   */
  async syncWithServer() {
    if (!this.isOnline || !this.isAuthenticated) {
      return;
    }
    
    try {
      // Sync tiles
      const tiles = await getAllFromIndexedDB('conceptTiles');
      if (tiles.length > 0) {
        const syncResults = await api.syncConceptTiles(tiles);
        
        // Update local storage with server data
        for (const result of syncResults) {
          if (result.status !== 'error' && result.data) {
            await saveToIndexedDB(`conceptTile_${result.data.concept_type}`, result.data);
          }
        }
      }
      
      // Sync user preferences
      const preferences = await getFromIndexedDB('userPreferences');
      if (preferences) {
        const updatedPreferences = await api.updateUserPreferences(preferences);
        await saveToIndexedDB('userPreferences', updatedPreferences);
      } else {
        const serverPreferences = await api.getUserPreferences();
        await saveToIndexedDB('userPreferences', serverPreferences);
      }
      
      // Clear pending sync queue
      this.pendingSync = [];
    } catch (error) {
      console.error('Failed to sync with server:', error);
    }
  }
  
  /**
   * Set authentication status and trigger sync if becoming authenticated.
   * @param {boolean} isAuthenticated - Authentication status
   */
  setAuthenticated(isAuthenticated) {
    const wasAuthenticated = this.isAuthenticated;
    this.isAuthenticated = isAuthenticated;
    
    // If becoming authenticated and online, sync
    if (isAuthenticated && !wasAuthenticated && this.isOnline) {
      this.syncWithServer();
    }
  }
}

// Create singleton instance
const syncStorage = new SyncStorage();
export default syncStorage;
```

### Create Authentication UI Components
Create `js/controllers/auth.js`:
```javascript
import api from '../utils/api.js';
import syncStorage from '../utils/syncStorage.js';

/**
 * Controller for authentication-related functionality.
 */
class AuthController {
  constructor() {
    this.currentUser = null;
    this.authModalTemplate = `
      <div class="auth-modal">
        <div class="auth-modal-content">
          <div class="auth-header">
            <h2>Sign In / Sign Up</h2>
            <button class="close-button">&times;</button>
          </div>
          <div class="auth-body">
            <div class="auth-step email-step active">
              <p>Enter your email to continue or create an account</p>
              <form id="email-form">
                <input type="email" id="auth-email" placeholder="Email address" required>
                <button type="submit" class="auth-submit">Continue</button>
              </form>
            </div>
            <div class="auth-step otp-step">
              <p>Enter the verification code sent to your email</p>
              <form id="otp-form">
                <input type="text" id="auth-otp" placeholder="Verification code" required pattern="[0-9]{6}" maxlength="6">
                <button type="submit" class="auth-submit">Verify</button>
              </form>
            </div>
            <div class="auth-step success-step">
              <p>Authentication successful!</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.authStatusTemplate = `
      <div class="auth-status">
        <span class="auth-email"></span>
        <button class="logout-button">Sign Out</button>
      </div>
    `;
    
    this.emailInProgress = null;
    
    // Add styles
    this.addStyles();
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Add CSS styles for authentication UI.
   */
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .auth-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      
      .auth-modal-content {
        background-color: white;
        border-radius: 5px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      
      .auth-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .auth-header h2 {
        margin: 0;
      }
      
      .close-button {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
      }
      
      .auth-body {
        padding: 20px;
      }
      
      .auth-step {
        display: none;
      }
      
      .auth-step.active {
        display: block;
      }
      
      .auth-submit {
        width: 100%;
        padding: 10px;
        margin-top: 10px;
        background-color: #4285f4;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      input {
        width: 100%;
        padding: 10px;
        margin-top: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      
      .auth-status {
        display: flex;
        align-items: center;
        margin-left: auto;
      }
      
      .auth-email {
        margin-right: 10px;
      }
      
      .logout-button {
        background-color: transparent;
        border: 1px solid #ccc;
        padding: 5px 10px;
        cursor: pointer;
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Initialize the authentication controller.
   */
  async initialize() {
    try {
      const profile = await api.getUserProfile();
      
      if (profile.is_authenticated) {
        this.currentUser = {
          email: profile.email,
          isAuthenticated: true
        };
        syncStorage.setAuthenticated(true);
        this.updateAuthUI();
      } else {
        this.currentUser = null;
        syncStorage.setAuthenticated(false);
      }
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
      this.currentUser = null;
      syncStorage.setAuthenticated(false);
    }
    
    // Add auth status to header if it doesn't exist
    const header = document.querySelector('header');
    if (header && !document.querySelector('.auth-status')) {
      const authStatus = document.createElement('div');
      authStatus.innerHTML = this.authStatusTemplate;
      header.appendChild(authStatus);
      
      // Add event listeners
      const logoutButton = authStatus.querySelector('.logout-button');
      logoutButton.addEventListener('click', () => this.logout());
    }
    
    this.updateAuthUI();
  }
  
  /**
   * Update the authentication UI based on current user state.
   */
  updateAuthUI() {
    const authStatus = document.querySelector('.auth-status');
    if (!authStatus) return;
    
    const emailElement = authStatus.querySelector('.auth-email');
    const logoutButton = authStatus.querySelector('.logout-button');
    
    if (this.currentUser && this.currentUser.isAuthenticated) {
      emailElement.textContent = this.currentUser.email;
      logoutButton.style.display = 'block';
    } else {
      emailElement.textContent = 'Not signed in';
      emailElement.style.cursor = 'pointer';
      emailElement.addEventListener('click', () => this.showAuthModal());
      logoutButton.style.display = 'none';
    }
  }
  
  /**
   * Show the authentication modal.
   */
  showAuthModal() {
    // Remove existing modal if any
    this.removeAuthModal();
    
    // Create and add modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = this.authModalTemplate;
    document.body.appendChild(modalContainer);
    
    // Get references to elements
    const modal = document.querySelector('.auth-modal');
    const closeButton = modal.querySelector('.close-button');
    const emailForm = modal.querySelector('#email-form');
    const otpForm = modal.querySelector('#otp-form');
    
    // Add event listeners
    closeButton.addEventListener('click', () => this.removeAuthModal());
    emailForm.addEventListener('submit', (e) => this.handleEmailSubmit(e));
    otpForm.addEventListener('submit', (e) => this.handleOtpSubmit(e));
  }
  
  /**
   * Remove the authentication modal.
   */
  removeAuthModal() {
    const modal = document.querySelector('.auth-modal');
    if (modal) {
      modal.parentNode.removeChild(modal);
    }
  }
  
  /**
   * Handle email form submission.
   * @param {Event} event - Form submit event
   */
  async handleEmailSubmit(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('auth-email');
    const email = emailInput.value.trim();
    
    if (!email) return;
    
    try {
      // Show loading state
      const submitButton = event.target.querySelector('.auth-submit');
      submitButton.textContent = 'Sending...';
      submitButton.disabled = true;
      
      // Request OTP
      const response = await api.requestOtp(email);
      
      // Store email for OTP verification
      this.emailInProgress = email;
      
      // Show OTP step
      document.querySelector('.email-step').classList.remove('active');
      document.querySelector('.otp-step').classList.add('active');
    } catch (error) {
      console.error('Failed to request OTP:', error);
      alert('Failed to send verification code. Please try again.');
      
      // Reset form
      submitButton.textContent = 'Continue';
      submitButton.disabled = false;
    }
  }
  
  /**
   * Handle OTP form submission.
   * @param {Event} event - Form submit event
   */
  async handleOtpSubmit(event) {
    event.preventDefault();
    
    const otpInput = document.getElementById('auth-otp');
    const otpCode = otpInput.value.trim();
    
    if (!otpCode || !this.emailInProgress) return;
    
    try {
      // Show loading state
      const submitButton = event.target.querySelector('.auth-submit');
      submitButton.textContent = 'Verifying...';
      submitButton.disabled = true;
      
      // Verify OTP
      const response = await api.verifyOtp(this.emailInProgress, otpCode);
      
      // Update current user
      this.currentUser = {
        email: this.emailInProgress,
        isAuthenticated: true
      };
      syncStorage.setAuthenticated(true);
      
      // Show success step
      document.querySelector('.otp-step').classList.remove('active');
      document.querySelector('.success-step').classList.add('active');
      
      // Update UI
      this.updateAuthUI();
      
      // Close modal after a delay
      setTimeout(() => this.removeAuthModal(), 2000);
    } catch (error) {
      console.error('Failed to verify OTP:', error);
      alert('Failed to verify code. Please try again.');
      
      // Reset form
      submitButton.textContent = 'Verify';
      submitButton.disabled = false;
    }
  }
  
  /**
   * Log out the current user.
   */
  async logout() {
    try {
      await api.logout();
      
      // Update state
      this.currentUser = null;
      syncStorage.setAuthenticated(false);
      
      // Update UI
      this.updateAuthUI();
    } catch (error) {
      console.error('Failed to logout:', error);
      alert('Failed to sign out. Please try again.');
    }
  }
}

// Create singleton instance
const authController = new AuthController();
export default authController;
```

### Update Main App.js
Edit `js/app.js`:
```javascript
// Import at the top with other imports
import authController from './controllers/auth.js';
import syncStorage from './utils/syncStorage.js';

// Add initialization in the init function
function init() {
  // Initialize syncing capability
  syncStorage.initialize();
  
  // Initialize authentication
  authController.initialize();
  
  // ... existing initialization code
}
```

## Step 7: Test and Deploy to HelioHost

### Prepare for Deployment
Create `.htaccess` file in project root:
```
# Redirect all requests to Django WSGI
Options +ExecCGI
RewriteEngine On
RewriteBase /
RewriteRule ^(static/.*)$ - [L]
RewriteRule ^(admin/.*)$ - [L]
RewriteRule ^(media/.*)$ - [L]
RewriteRule ^(mathmuseums/dispatch\.wsgi/.*)$ - [L]
RewriteRule ^(.*)$ mathmuseums/mathmuseums/dispatch.wsgi/$1 [QSA,PT,L]
```

Create `mathmuseums/dispatch.wsgi`:
```python
import os, sys

# Edit your path below to match your actual server path
sys.path.append("/home/yourdomain.helioho.st/httpdocs/mathmuseums")
from django.core.wsgi import get_wsgi_application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mathmuseums.settings')
application = get_wsgi_application()
```

### Production Settings
Create `mathmuseums/production_settings.py`:
```python
from .settings import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

# Use PostgreSQL in production
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DATABASE_NAME'),
        'USER': env('DATABASE_USER'),
        'PASSWORD': env('DATABASE_PASSWORD'),
        'HOST': env('DATABASE_HOST'),
        'PORT': env('DATABASE_PORT'),
    }
}

# Email settings for production
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = env('EMAIL_HOST')
EMAIL_PORT = env('EMAIL_PORT')
EMAIL_HOST_USER = env('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD')
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL')

# CSRF and session settings
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True

# Static files
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
```

### Deployment Steps
1. Create a HelioHost account and domain
2. Set up PostgreSQL database through Plesk
3. Upload project files via FTP
4. Request WSGI Control Access
5. Run migrations on the server (through Plesk or a one-time script)
6. Test all functionality in production

### Backup and Monitoring
Create a backup script (`backup.py`):
```python
import os
import datetime
import subprocess

def create_backup():
    """Create a backup of the PostgreSQL database."""
    now = datetime.datetime.now()
    timestamp = now.strftime('%Y%m%d_%H%M%S')
    backup_file = f"backup_{timestamp}.sql"
    
    # Get environment variables
    db_name = os.environ.get('DATABASE_NAME')
    db_user = os.environ.get('DATABASE_USER')
    db_host = os.environ.get('DATABASE_HOST')
    
    # Create backup directory if it doesn't exist
    backup_dir = 'backups'
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    backup_path = os.path.join(backup_dir, backup_file)
    
    # Execute pg_dump
    command = f"pg_dump -h {db_host} -U {db_user} -d {db_name} -f {backup_path}"
    subprocess.run(command, shell=True)
    
    print(f"Backup created: {backup_path}")
    
    # Clean up old backups (keep only the latest 5)
    backups = sorted([os.path.join(backup_dir, f) for f in os.listdir(backup_dir) if f.startswith('backup_')])
    if len(backups) > 5:
        for old_backup in backups[:-5]:
            os.remove(old_backup)
            print(f"Removed old backup: {old_backup}")

if __name__ == '__main__':
    create_backup()
```

Create a sample cron job (to be set up on your local machine):
```bash
# Run backup every day at 3 AM
0 3 * * * cd /path/to/project && python backup.py
```
