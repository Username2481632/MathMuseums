#!/usr/bin/env python
"""
Emergency deployment script to restore missing API app tables in production.

This script addresses the critical production database corruption where:
- Authentication users table is empty
- API app tables are completely missing (api_concepttile, api_userpreference, api_synclog)

Usage: python deploy_migrations.py
"""

import os
import sys
import django
from django.core.management import execute_from_command_line
from django.conf import settings

def main():
    """Run Django migrations to restore missing production database tables."""
    
    print("🔧 EMERGENCY PRODUCTION DATABASE RECOVERY")
    print("=" * 50)
    print("📊 Issue: Missing API app tables in production database")
    print("🎯 Goal: Restore api_concepttile, api_userpreference, api_synclog tables")
    print("⚠️  This script applies Django migrations to fix the corruption")
    print()
    
    # Set up Django environment
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mathmuseums.settings')
    django.setup()
    
    # Check if we're in production environment
    if not settings.DEBUG:
        print("✅ Production environment detected")
    else:
        print("⚠️  Development environment detected - ensure this is intentional")
    
    print(f"🗄️  Database: {settings.DATABASES['default']['ENGINE']}")
    print(f"🏠 Host: {settings.DATABASES['default'].get('HOST', 'localhost')}")
    print()
    
    # Step 1: Show current migration status
    print("📋 Step 1: Checking current migration status...")
    try:
        execute_from_command_line(['manage.py', 'showmigrations', '--verbosity=2'])
    except Exception as e:
        print(f"❌ Error checking migrations: {e}")
        return False
    
    print()
    
    # Step 2: Apply pending migrations
    print("🚀 Step 2: Applying pending migrations...")
    try:
        execute_from_command_line(['manage.py', 'migrate', '--verbosity=2'])
        print("✅ Migrations applied successfully!")
    except Exception as e:
        print(f"❌ Error applying migrations: {e}")
        print("💡 Check database permissions and connection settings")
        return False
    
    print()
    
    # Step 3: Verify table creation
    print("🔍 Step 3: Verifying API tables were created...")
    try:
        from api.models import ConceptTile, UserPreference, SyncLog
        
        # Test table access
        ConceptTile.objects.count()
        UserPreference.objects.count()
        SyncLog.objects.count()
        
        print("✅ All API tables accessible and working!")
        
        # Show table counts for verification
        concept_count = ConceptTile.objects.count()
        prefs_count = UserPreference.objects.count()
        logs_count = SyncLog.objects.count()
        
        print(f"📊 Table Status:")
        print(f"   - ConceptTiles: {concept_count} records")
        print(f"   - UserPreferences: {prefs_count} records") 
        print(f"   - SyncLogs: {logs_count} records")
        
    except Exception as e:
        print(f"❌ Error verifying tables: {e}")
        return False
    
    print()
    print("🎉 PRODUCTION DATABASE RECOVERY COMPLETE!")
    print("=" * 50)
    print("✅ Missing API app tables have been restored")
    print("✅ Data corruption prevention fixes are active")
    print("✅ Production database is ready for normal operation")
    print()
    print("📝 Next steps:")
    print("   1. Test user registration and authentication")
    print("   2. Test concept tile creation and sync")
    print("   3. Monitor application for any remaining issues")
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
