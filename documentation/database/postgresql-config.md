# PostgreSQL Database Configuration

## Overview

This document describes the PostgreSQL database configuration for the Math Museums project.

## Connection Details

- **Database Name**: `mathmuseums`
- **Username**: `mathmuseums_user`
- **Password**: Environment variable `DATABASE_PASSWORD`
- **Host**: `localhost` (development) / Environment variable `DATABASE_HOST` (production)
- **Port**: `5432`

## Development Setup

For local development, we're using a PostgreSQL container with Podman:

```bash
podman run -d --name postgres-mathmuseums \
  -e POSTGRES_DB=mathmuseums \
  -e POSTGRES_USER=mathmuseums_user \
  -e POSTGRES_PASSWORD=development_password \
  -p 5432:5432 \
  postgres:15
```

## Django Configuration

The Django project is configured to use PostgreSQL through the following settings in `settings.py`:

```python
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

Environment variables are managed using `django-environ`.

## Database Schema

Currently, the database contains the default Django authentication models:

- `auth_user`: Stores user account information
- `auth_group`: Stores group information
- `auth_permission`: Stores permissions
- Additional related tables for sessions and admin features

The custom models for concept data and user preferences will be implemented in Step 4.

## HelioHost Configuration

For deployment to HelioHost, we'll need to:

1. Create a PostgreSQL database in the HelioHost control panel
2. Update the `.env` file with the correct production credentials
3. Run migrations on the production server
4. Ensure the application can connect to the remote database

## Backup Strategy

For production, regular backups will be implemented using:

1. PostgreSQL's `pg_dump` tool
2. Scheduled backup jobs
3. Secure off-site storage of backup files

## Next Steps

After completing the database setup, we'll proceed with:

1. Implementing the email OTP authentication system
2. Defining database models for user data and concept information
3. Creating the REST API endpoints for data synchronization
