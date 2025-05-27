# Technical Context

## Technologies Used

- **Languages**:
  - HTML5 (Semantic markup)
  - CSS3 (Custom properties, Flexbox, Grid, View-specific styling)
  - JavaScript (ES6+, Vanilla)
  - Python (Django for server-side components)

- **Libraries and Frameworks**:
  - Desmos API (for graphing calculator)
  - Django 5.0.7 (server-side framework)
  - Django REST Framework (for API endpoints)

- **Storage**:
  - PostgreSQL (primary server-side database)
  - IndexedDB (client-side primary storage)
  - localStorage (client-side fallback/redundancy)

- **Hosting**:
  - HelioHost (server hosting)
  - WSGI for Django deployment

- **Authentication**:
  - Email-based OTP authentication
  - Custom user model with email as primary identifier
  - 6-digit time-limited verification codes
  - Email delivery through Django's SMTP backend (production)
  - Session management for authenticated users
  - JWT tokens for API authentication

- **Email Configuration**:
  - **Production**: SMTP backend via Django's email framework
  - **SMTP Settings**: EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, EMAIL_USE_TLS, EMAIL_USE_SSL
  - **Current Issue**: SMTP authentication failures under investigation
  - **Mail Server**: sr308.hostgator.com:587 (TLS enabled)
  - **Account Configuration**: Verified in Plesk control panel

- **Development Tools**:
  - Live Server or similar for local development
  - Modern browser with devtools (Chrome/Firefox)
  - Git for version control and deployment

## Development Setup

1. Clone the repository
2. For client-side only testing:
   - No build step required - open `index.html` directly in browser
   - For local development, use a simple HTTP server:
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Or with Node.js
     npx serve
     ```
   - Access through `http://localhost:8000` (or port defined by your server)

3. For full stack development with Django:
   - Set up Python virtual environment:
     ```bash
     python -m venv venv
     source venv/bin/activate  # On Windows: venv\Scripts\activate
     pip install -r requirements.txt
     ```
   - Run Django development server:
     ```bash
     python manage.py runserver
     ```
   - Access through `http://localhost:8000`

## Development Environment

- **Primary Development Machine**:
  - Operating System: Fedora Atomic (rpm-ostree based)
  - Shell: bash
  - Last updated: May 18, 2025

## Technical Constraints

- **Browser Compatibility**:
  - Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
  - No IE11 support required
  - IndexedDB support required (all modern browsers)

- **Database Compatibility**:
  - Development: PostgreSQL 15.x via Podman container
  - Production (HelioHost): PostgreSQL 13.20 (incompatible with Django 5.0.7)
  - Django 5.0.7 requires PostgreSQL 14+ 
  - Potential alternatives: MariaDB 10.5.27 (also available on HelioHost)

- **Offline Capability**:
  - Must function in offline mode using client-side storage
  - Will sync with server when connection is available

- **Storage Limitations**:
  - IndexedDB typical limit: ~50-250MB depending on browser/device
  - localStorage fallback: ~5MB limit
  - Image size considerations for storage efficiency
  - PostgreSQL database for server-side storage (subject to HelioHost limits)

- **Runtime Environment**:
  - Desktop-first design
  - Basic responsiveness required but not mobile-optimized
  - Django on HelioHost with WSGI

## CSS Architecture

- **File Organization**:
  - `styles.css`: Global styles, variables, and shared components
    ```css
    #app-container {
        max-width: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
    }
    
    main, section {
        margin: 0;
        padding: 0;
    }
    
    header {
        padding: var(--spacing-sm);
    }
    ```
  - `home.css`: Home view with tile grid styling
    ```css
    .tiles-container {
        height: calc(100vh - 70px);
        min-height: 400px;
        margin: 0;
        padding: 0;
    }
    
    #home-view {
        margin: 0;
        padding: 0;
    }
    
    .concept-tile.dragging {
        opacity: 0.8;
        cursor: grabbing;
        z-index: 10;
        box-shadow: 0 0 0 2px var(--secondary-color);
    }
    ```
  - `detail.css`: Detail view with Desmos calculator styling
  - `onboarding.css`: Onboarding flow styling
  - Future: Additional styling for authentication views

## Dependencies

- **Desmos API** (loaded via CDN)
  ```html
  <script src="https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>
  ```

- **No third-party dependencies** beyond Desmos API:
  - No jQuery
  - No build tools (webpack, etc.)
  - No CSS frameworks
  - No state management libraries

## Local PostgreSQL with Podman

For local development, a PostgreSQL database is run in a Podman container:

```bash
podman run -d --name postgres-mathmuseums \
  -e POSTGRES_DB=mathmuseums \
  -e POSTGRES_USER=mathmuseums_user \
  -e POSTGRES_PASSWORD=development_password \
  -p 5432:5432 \
  postgres:15
```

- The Django app connects to this database using the credentials in `.env`.
- To start/stop the container:
  ```bash
  podman start postgres-mathmuseums
  podman stop postgres-mathmuseums
  ```
- To view logs:
  ```bash
  podman logs postgres-mathmuseums
  ```

---

## Deployment Checklist
- Pre-deployment tasks: code review, static files, database, environment configuration
- Deployment to HelioHost: file transfer, WSGI configuration, database setup, static files, SSL/HTTPS
- Post-deployment verification: functionality, performance, error handling, cross-browser testing
- Monitoring and maintenance: monitoring setup, backup strategy, documentation, launch checklist

---

## Authentication Fix Deployment Guide
- Step-by-step instructions for deploying authentication fixes to HelioHost without terminal access
- Backup, upload, permissions, log file creation, application restart, verification, monitoring, and rollback procedures

---

## Clean-up and Maintenance
- Files removed and kept intentionally
- Diagnostic and maintenance tools
- .gitignore updates
- Clean-up guidelines and deployment note about staticlibs
