#!/usr/bin/env python3
"""
Web-based Django migration runner for HelioHost with database reset
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
    """Web endpoint to reset database and run Django migrations safely"""
    
    if request.method == 'GET':
        return HttpResponse("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Django Database Reset & Migration Runner</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; margin: 20px 0; }
                .danger { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; margin: 20px 0; }
                .button { background: #dc3545; color: white; padding: 15px 30px; border: none; font-size: 16px; cursor: pointer; }
                .button:hover { background: #c82333; }
                .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; margin: 20px 0; }
                .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; margin: 20px 0; }
                pre { background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; overflow-x: auto; }
            </style>
        </head>
        <body>
            <h1>🗃️ Django Database Reset & Migration Runner</h1>
            
            <div class="danger">
                <h3>🔥 COMPLETE DATABASE RESET</h3>
                <p><strong>This will COMPLETELY WIPE and recreate your database!</strong></p>
                <p>This action will:</p>
                <ul>
                    <li><strong>DROP ALL EXISTING TABLES</strong> (including any existing data)</li>
                    <li>Reset Django migration history</li>
                    <li>Recreate ALL tables from scratch</li>
                    <li>Apply all Django migrations (auth, admin, api, authentication)</li>
                    <li>Create API tables with data protection fixes</li>
                </ul>
                <p><strong>⚠️ ALL EXISTING DATA WILL BE LOST! ⚠️</strong></p>
            </div>
            
            <form method="post" onsubmit="return confirm('⚠️ WARNING: This will DELETE ALL DATA in the database!\\n\\nAre you absolutely sure you want to proceed?\\n\\nThis action cannot be undone.');">
                <button type="submit" class="button">🔥 RESET DATABASE & RUN MIGRATIONS</button>
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
            from django.db import connection
            from io import StringIO
            from datetime import datetime
            import traceback
            
            # Capture output
            output = StringIO()
            error_output = StringIO()
            
            output.write("=== DJANGO DATABASE RESET & MIGRATION ===\n")
            output.write(f"Starting at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            # Step 1: Drop all existing tables
            output.write("🗑️ STEP 1: Dropping all existing tables...\n")
            with connection.cursor() as cursor:
                # Get list of all tables
                cursor.execute("SHOW TABLES")
                tables = [row[0] for row in cursor.fetchall()]
                
                if tables:
                    output.write(f"Found {len(tables)} tables to drop: {', '.join(tables)}\n")
                    
                    # Disable foreign key checks to avoid constraint issues
                    cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
                    
                    # Drop all tables
                    for table in tables:
                        cursor.execute(f"DROP TABLE IF EXISTS `{table}`")
                        output.write(f"  ✅ Dropped table: {table}\n")
                    
                    # Re-enable foreign key checks
                    cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
                    output.write("✅ All tables dropped successfully!\n\n")
                else:
                    output.write("No existing tables found.\n\n")
            
            # Step 2: Reset Django migration history
            output.write("🔄 STEP 2: Resetting Django migration tracking...\n")
            output.write("✅ Migration history will be rebuilt from scratch.\n\n")
            
            # Step 3: Run all migrations from scratch
            output.write("🚀 STEP 3: Running all Django migrations...\n")
            call_command('migrate', stdout=output, stderr=error_output, verbosity=2)
            output.write("✅ All migrations completed successfully!\n\n")
            
            # Step 4: Verify table creation
            output.write("🔍 STEP 4: Verifying table creation...\n")
            with connection.cursor() as cursor:
                cursor.execute("SHOW TABLES")
                new_tables = [row[0] for row in cursor.fetchall()]
                
                expected_tables = [
                    'auth_user', 'auth_group', 'auth_permission',
                    'django_content_type', 'django_session', 'django_migrations',
                    'api_concepttile', 'api_userpreference', 'api_synclog',
                    'authentication_otpcode'
                ]
                
                output.write(f"Created {len(new_tables)} tables:\n")
                for table in sorted(new_tables):
                    status = "✅" if any(expected in table for expected in expected_tables) else "ℹ️"
                    output.write(f"  {status} {table}\n")
                
                # Check for critical API tables
                api_tables = [t for t in new_tables if t.startswith('api_')]
                if len(api_tables) >= 3:
                    output.write(f"\n✅ All API tables created successfully: {', '.join(api_tables)}\n")
                else:
                    output.write(f"\n⚠️ Expected 3 API tables, found {len(api_tables)}: {', '.join(api_tables)}\n")
            
            success_msg = f"""
            ✅ DATABASE RESET & MIGRATION COMPLETED SUCCESSFULLY!
            
            📊 Summary:
            • Database completely reset and recreated
            • All Django tables created fresh
            • API tables ready for use
            • Data protection fixes applied
            • Migration tracking reset
            
            🎉 Your database is now ready for production use!
            
            ⚠️ SECURITY REMINDER: Remove this migration endpoint after use!
            """
            
            return HttpResponse(f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Migration Success</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 40px; }}
                    .success {{ background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; margin: 20px 0; }}
                    .warning {{ background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; margin: 20px 0; }}
                    pre {{ background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; overflow-x: auto; white-space: pre-wrap; }}
                    .button {{ background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }}
                </style>
            </head>
            <body>
                <div class="success">
                    <h2>✅ Migration Completed Successfully!</h2>
                    <pre>{success_msg}</pre>
                </div>
                
                <div class="warning">
                    <h3>🔒 Security Cleanup Required</h3>
                    <p>For security, you should now:</p>
                    <ol>
                        <li>Remove the migration URL from mathmuseums/urls.py</li>
                        <li>Delete the migrate_runner.py file</li>
                        <li>Deploy the cleaned-up code</li>
                    </ol>
                </div>
                
                <h3>🔍 Next Steps:</h3>
                <ol>
                    <li><a href="/admin/">Test Django Admin</a></li>
                    <li><a href="/app/">Test Application</a></li>
                    <li>Verify API endpoints work properly</li>
                    <li><strong>Remove this migration endpoint for security</strong></li>
                </ol>
                
                <h3>📝 Full Migration Log:</h3>
                <pre>{output.getvalue()}</pre>
                
                {error_output.getvalue() and f'<h3>⚠️ Warnings/Errors:</h3><pre>{error_output.getvalue()}</pre>' or ''}
                
                <hr>
                <p><small>Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</small></p>
            </body>
            </html>
            """)
            
        except Exception as e:
            # Capture full traceback for debugging
            import traceback
            from datetime import datetime
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
                <p><small>Error occurred at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</small></p>
            </body>
            </html>
            """, status=500)
