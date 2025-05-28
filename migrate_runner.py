#!/usr/bin/env python3
"""
Web-based Django migration runner for HelioHost
Access via: yourdomain.com/run-migrations/

SECURITY NOTE: This script should be removed after migrations are complete.
"""
import os
import sys
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

@csrf_exempt
@require_http_methods(["GET", "POST"])
def run_migrations_view(request):
    """Web endpoint to run Django migrations safely"""
    
    if request.method == 'GET':
        return HttpResponse("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Django Migration Runner</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; margin: 20px 0; }
                .button { background: #dc3545; color: white; padding: 15px 30px; border: none; font-size: 16px; cursor: pointer; }
                .button:hover { background: #c82333; }
                .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; margin: 20px 0; }
                .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; margin: 20px 0; }
                pre { background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; overflow-x: auto; }
            </style>
        </head>
        <body>
            <h1>🛠️ Django Migration Runner</h1>
            
            <div class="warning">
                <h3>⚠️ WARNING</h3>
                <p><strong>This will run database migrations on your production database.</strong></p>
                <p>This action will:</p>
                <ul>
                    <li>Create missing API tables (api_concepttile, api_userpreference, api_synclog)</li>
                    <li>Apply data protection fixes (CASCADE → PROTECT)</li>
                    <li>Update database schema to current version</li>
                </ul>
                <p><strong>Make sure you have a database backup before proceeding!</strong></p>
            </div>
            
            <form method="post" onsubmit="return confirm('Are you sure you want to run migrations?');">
                <button type="submit" class="button">🚀 RUN MIGRATIONS</button>
            </form>
            
            <h3>📋 Expected Results</h3>
            <p>After successful migration, you should see tables created for:</p>
            <ul>
                <li><code>api_concepttile</code> - User concept tiles with position and Desmos state</li>
                <li><code>api_userpreference</code> - User settings and preferences</li>
                <li><code>api_synclog</code> - Synchronization logs between devices</li>
            </ul>
            
            <p><strong>Remember:</strong> Remove this migration endpoint after use for security!</p>
        </body>
        </html>
        """)
    
    elif request.method == 'POST':
        try:
            # Set up Django environment
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mathmuseums.settings')
            
            # Import Django components after environment setup
            import django
            django.setup()
            
            from django.core.management import call_command
            from io import StringIO
            import traceback
            
            # Capture output
            output = StringIO()
            error_output = StringIO()
            
            # Run showmigrations first to see current state
            call_command('showmigrations', stdout=output, stderr=error_output)
            migration_status = output.getvalue()
            
            # Clear output buffer
            output = StringIO()
            error_output = StringIO()
            
            # Run actual migrations
            call_command('migrate', stdout=output, stderr=error_output, verbosity=2)
            
            migration_output = output.getvalue()
            error_text = error_output.getvalue()
            
            # Prepare response
            success = "Successfully applied" in migration_output or "No migrations to apply" in migration_output
            
            return HttpResponse(f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Migration Results</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 40px; }}
                    .success {{ background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; margin: 20px 0; }}
                    .error {{ background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; margin: 20px 0; }}
                    pre {{ background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; overflow-x: auto; white-space: pre-wrap; }}
                    .button {{ background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }}
                </style>
            </head>
            <body>
                <h1>🔄 Migration Results</h1>
                
                {"<div class='success'><h3>✅ Success!</h3><p>Migrations completed successfully!</p></div>" if success else "<div class='error'><h3>❌ Error Occurred</h3><p>Please check the output below for details.</p></div>"}
                
                <h3>📊 Migration Status Before:</h3>
                <pre>{migration_status}</pre>
                
                <h3>📝 Migration Output:</h3>
                <pre>{migration_output}</pre>
                
                {f"<h3>⚠️ Errors:</h3><pre>{error_text}</pre>" if error_text else ""}
                
                <h3>🔍 Next Steps:</h3>
                <ol>
                    <li>Verify tables were created in phpMyAdmin</li>
                    <li>Test your application functionality</li>
                    <li><strong>Remove this migration endpoint for security</strong></li>
                    <li>Monitor application logs for any issues</li>
                </ol>
                
                <a href="/run-migrations/" class="button">🔄 Run Again</a>
                <a href="/admin/" class="button">📊 Django Admin</a>
                
                <hr>
                <p><small>Migration completed at: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</small></p>
            </body>
            </html>
            """)
            
        except Exception as e:
            # Capture full traceback for debugging
            import traceback
            full_error = traceback.format_exc()
            
            return HttpResponse(f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Migration Error</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 40px; }}
                    .error {{ background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; margin: 20px 0; }}
                    pre {{ background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; overflow-x: auto; white-space: pre-wrap; }}
                    .button {{ background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }}
                </style>
            </head>
            <body>
                <h1>❌ Migration Error</h1>
                
                <div class="error">
                    <h3>Error Details:</h3>
                    <p><strong>Error:</strong> {str(e)}</p>
                </div>
                
                <h3>🔍 Full Traceback:</h3>
                <pre>{full_error}</pre>
                
                <h3>🛠️ Troubleshooting:</h3>
                <ul>
                    <li>Check database credentials in .env file</li>
                    <li>Verify MariaDB database was created in Plesk</li>
                    <li>Ensure mysqlclient is installed</li>
                    <li>Check database user permissions</li>
                    <li>Review Django settings.py database configuration</li>
                </ul>
                
                <a href="/run-migrations/" class="button">🔄 Try Again</a>
                
                <hr>
                <p><small>Error occurred at: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</small></p>
            </body>
            </html>
            """, status=500)
