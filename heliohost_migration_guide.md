# HelioHost MariaDB Setup and Django Migration Guide

## 🎯 **CRITICAL**: Production Database Recovery for Math Museums

**Issue**: Production database missing API app tables (`api_concepttile`, `api_userpreference`, `api_synclog`) due to data corruption.

**Solution**: Set up MariaDB and run Django migrations via web interface (no terminal access available).

---

## **Step 1: Create MariaDB Database via Plesk**

### **Access Plesk Database Section**
1. Log into your HelioHost Plesk control panel
2. Navigate to **"Databases"** section from left menu
3. Click **"+ Add Database"** button

### **Configure Database Settings**

**General Section:**
- **Database Name**: `mathmuseums` (will be prefixed with your username, e.g., `coder248_mathmuseums`)
- **Server**: Select `localhost:3306 (default for MariaDB)`
- **Associated Site**: Select your domain or leave as "No related sites"

**User Section:**
- ✅ **Add a user**: Check this box (enabled by default)
- **Username**: `mathmuseums_user` (will be prefixed, e.g., `coder248_mathmuseums_user`)
- **Password**: Generate secure password (use "Generate" button)
- **Confirm Password**: Repeat the password
- **Access Control**: Choose "Allow local only connections" (safest for production)
- **Database Access**: Leave "User has access to all databases" unchecked (more secure)

### **Database Permissions**
- **Role**: Select "Read & Write" 
- **Data/Structure Access**: Ensure all necessary privileges are selected:
  - SELECT, INSERT, UPDATE, DELETE (data operations)
  - CREATE, ALTER, DROP, INDEX (structure operations)

**Important**: Record your database credentials:
- Database Name: `coder248_mathmuseums`
- Username: `coder248_mathmuseums_user` 
- Password: [Generated password]
- Host: `localhost`

---

## **Step 2: Update Django Settings for MariaDB**

### **Install MySQL Client Library**
Add to `requirements.txt`:
```
mysqlclient>=2.1.0
```

### **Update Database Configuration**
Edit `.env` file:
```env
# MariaDB Configuration for HelioHost
DB_ENGINE=django.db.backends.mysql
DB_NAME=coder248_mathmuseums
DB_USER=coder248_mathmuseums_user
DB_PASSWORD=[Your Generated Password]
DB_HOST=localhost
DB_PORT=3306
```

### **Update settings.py**
Ensure your database configuration uses MariaDB:
```python
DATABASES = {
    'default': {
        'ENGINE': env('DB_ENGINE', default='django.db.backends.mysql'),
        'NAME': env('DB_NAME'),
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
        'HOST': env('DB_HOST', default='localhost'),
        'PORT': env('DB_PORT', default='3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}
```

---

## **Step 3: Create Web-Based Migration Script**

Since there's no terminal access, create a web endpoint to run migrations:

### **Create `migrate_runner.py`**
```python
#!/usr/bin/env python3
"""
Web-based Django migration runner for HelioHost
Access via: yourdomain.com/run-migrations/
"""
import os
import sys
import django
from django.core.management import execute_from_command_line
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

def run_migrations_view(request):
    """Web endpoint to run Django migrations safely"""
    
    if request.method != 'POST':
        return HttpResponse("""
        <html><body>
        <h2>Django Migration Runner</h2>
        <p><strong>WARNING:</strong> This will run database migrations.</p>
        <form method="post">
            <button type="submit" style="background-color: red; color: white; padding: 10px;">
                RUN MIGRATIONS
            </button>
        </form>
        </body></html>
        """)
    
    try:
        # Set up Django environment
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mathmuseums.settings')
        django.setup()
        
        # Import after Django setup
        from django.core.management import call_command
        from io import StringIO
        
        # Capture output
        output = StringIO()
        
        # Run migrations
        call_command('migrate', stdout=output, stderr=output)
        
        migration_output = output.getvalue()
        
        return HttpResponse(f"""
        <html><body>
        <h2>Migration Results</h2>
        <pre style="background: #f0f0f0; padding: 10px; border: 1px solid #ccc;">
{migration_output}
        </pre>
        <p><strong>Status:</strong> Migrations completed successfully!</p>
        <a href="/run-migrations/">Run Again</a>
        </body></html>
        """)
        
    except Exception as e:
        return HttpResponse(f"""
        <html><body>
        <h2>Migration Error</h2>
        <pre style="background: #ffe0e0; padding: 10px; border: 1px solid #ff0000;">
ERROR: {str(e)}
        </pre>
        <a href="/run-migrations/">Try Again</a>
        </body></html>
        """)

# URL pattern to add to main urls.py:
# path('run-migrations/', run_migrations_view, name='run_migrations'),
```

### **Add Migration URL to `mathmuseums/urls.py`**
```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import serve
from django.contrib.auth.decorators import login_required
from authentication.views import auth_check, app_view

# Import migration runner
from .migrate_runner import run_migrations_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include('authentication.urls')),
    path('api/', include('api.urls')),
    
    # Temporary migration endpoint (REMOVE AFTER USE)
    path('run-migrations/', run_migrations_view, name='run_migrations'),
    
    # Protected static files
    path('static/js/<path:path>', login_required(serve), {
        'document_root': settings.STATIC_ROOT or 'static',
        'show_indexes': False,
    }),
    path('static/css/<path:path>', login_required(serve), {
        'document_root': settings.STATIC_ROOT or 'static', 
        'show_indexes': False,
    }),
    
    # Authentication-first architecture
    path('app/', app_view, name='app'),
    path('', auth_check, name='auth_check'),
]
```

---

## **Step 4: Deploy and Run Migrations**

### **Upload Files to HelioHost**
1. Upload all files via Plesk File Manager or FTP
2. Ensure `mysqlclient` is in `requirements.txt`
3. Upload `migrate_runner.py` to your Django project directory

### **Run Migrations via Web Interface**
1. Visit: `https://math.moshchuk.com/run-migrations/`
2. Click **"RUN MIGRATIONS"** button
3. Verify all migrations are applied successfully
4. Check that tables are created:
   - `api_concepttile`
   - `api_userpreference` 
   - `api_synclog`

### **Verify Database Schema**
Use Plesk **phpMyAdmin** to check:
1. Go to Plesk → Databases → phpMyAdmin
2. Select your `coder248_mathmuseums` database
3. Verify tables exist and have correct structure

---

## **Step 5: Security Cleanup**

### **Remove Migration Endpoint** 
⚠️ **CRITICAL**: After migrations complete, remove the web endpoint:

1. Comment out or remove from `mathmuseums/urls.py`:
```python
# path('run-migrations/', run_migrations_view, name='run_migrations'),  # REMOVED
```

2. Delete `migrate_runner.py` file
3. Redeploy to production

---

## **Step 6: Test Application**

### **Verify Database Functionality**
1. Test user registration/authentication
2. Create concept tiles 
3. Test synchronization between devices
4. Check that no more data corruption occurs

### **Monitor Application Logs**
- Use Plesk → Error Logs to monitor for issues
- Check Django application logs for database errors

---

## **Important Notes**

### **WSGI Caching**
- Changes may take up to 2 hours to appear due to WSGI caching
- To force immediate reload, edit `dispatch.wsgi` file (add/remove a space)

### **Database Permissions**
- MariaDB user has full access to assigned database only
- Safer than granting access to all databases

### **Backup Strategy**
- Use Plesk database export before running migrations
- Keep migration logs for troubleshooting

### **Security Considerations**
- Remove migration endpoint after use
- Monitor database access logs
- Use strong passwords for database users

---

## **Expected Migration Output**

When successful, you should see:
```
Operations to perform:
  Apply all migrations: admin, api, auth, authentication, contenttypes, sessions
Running migrations:
  Applying api.0001_initial... OK
  Applying api.0002_concepttile_last_synced_concepttile_version_synclog... OK
  Applying api.0003_protect_user_data... OK
```

This will restore the missing API tables and implement the data corruption fixes.

---

## **Troubleshooting**

### **Common Issues:**
1. **Database Connection Error**: Verify credentials in `.env`
2. **Permission Denied**: Check database user privileges
3. **Table Already Exists**: Previous partial migration - check phpMyAdmin
4. **WSGI Caching**: Edit `dispatch.wsgi` to force reload

### **Support Resources:**
- HelioHost Forums: https://helionet.org/
- Discord Support: https://discord.gg/fAk2rMfyba
- Wiki: https://wiki.helionet.org/

---

**Status**: Ready to execute production database recovery without terminal access.
