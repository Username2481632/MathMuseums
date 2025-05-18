# System Patterns

## Architecture Overview

The Math Museums project follows a hybrid architecture with both client-side and server-side components:

1. **Client-Side (Frontend) Layer**: 
   - Client-side MVC architecture
   - Data structures for concept tiles with position, completion status
   - Desmos state representation (equations, images)
   - Local storage adapters (IndexedDB primary, localStorage fallback)
   - API clients for server communication

2. **Server-Side (Backend) Layer**:
   - Django framework for server-side logic
   - REST API endpoints for data synchronization
   - PostgreSQL database for persistent storage
   - User authentication and session management
   - Email-based OTP verification

3. **View Layer**:
   - Home page with draggable tiles grid (maximized space utilization)
   - Detail view for each concept with Desmos integration
   - Onboarding overlay system
   - Authentication views for user login/registration
   - View-specific styling system that maintains appropriate spacing for each view

4. **Controller Layer**:
   - URL-based routing (hash-based navigation)
   - Drag-and-drop controller for tiles
   - Desmos API integration controller
   - Storage synchronization
   - Authentication flow management

## Django Application Structure

- **Project Structure**:
  ```
  mathmuseums/              # Django project root
  ├── mathmuseums/          # Django project settings
  │   ├── __init__.py
  │   ├── settings.py       # Project settings
  │   ├── urls.py           # URL routing
  │   ├── wsgi.py           # WSGI configuration
  │   └── asgi.py           # ASGI configuration
  ├── api/                  # API app
  │   ├── __init__.py
  │   ├── models.py         # Data models
  │   ├── serializers.py    # API serializers
  │   ├── views.py          # API views
  │   └── urls.py           # API URLs
  ├── authentication/       # Authentication app
  │   ├── __init__.py
  │   ├── models.py         # User models
  │   ├── views.py          # Auth views
  │   └── urls.py           # Auth URLs
  └── static/               # Static files (original frontend)
      ├── index.html
      ├── css/
      ├── js/
      └── ...
  ```

- **Database Models**:
  - User model (custom, email as username)
  - ConceptTile model (stores user's concept data, position, Desmos state, description, completion status, etc.)
  - UserPreference model (stores UI and onboarding preferences)

## CSS Styling Patterns

- **View-Specific Styling**: Each view has its own CSS file with view-specific stylings
  - Home view: Zero margins/padding to maximize available space
  - Detail view: Comfortable margins (via `margin: 0 auto; padding: var(--spacing-lg)`)
- **CSS Variables**: Centralized design tokens in root for consistent theming
- **Conditional Styling**: CSS selectors that target specific views within shared containers
  - Using selectors like `main#app-container #detail-view` for view-specific targeting
- **Interactive Feedback**: Consistent visual feedback for user interactions (dragging, hovering, resizing)
  - Blue highlight effect (box-shadow) during both dragging and resizing operations
  - Appropriate cursor styling for different interaction modes
- **Space Optimization**: Home view maximizes available space while detail views maintain comfortable reading margins
  - Zero container padding in home view
  - Reduced header padding for more compact navigation
  - Explicit zero margins for container elements in home view

## Authentication Flow

- **Shared Login/Signup UI**:
  - Single form for both new and returning users
  - Email input field and submit button
  - Backend determines if user exists
  - OTP sent to email address
  - Verification screen for OTP entry

- **OTP Verification**:
  - Time-limited one-time password
  - Email delivery system
  - Verification link alternative

## Data Synchronization

- **Client-to-Server Sync**:
  - Local-first approach with background synchronization
  - Conflict resolution (last-write-wins with timestamps)
  - Batch updates to minimize API calls

- **Server-to-Client Sync**:
  - Pull-based synchronization on authentication
  - Selective data loading based on user needs
  - Versioning system to track changes

## Design Patterns

- **Module Pattern**: Self-contained modules for different system components
- **Publisher/Subscriber**: For managing state changes across components
- **Strategy Pattern**: For storage solutions (IndexedDB vs localStorage vs Server)
- **Factory Pattern**: For creating tile instances
- **State Pattern**: For managing application state (home vs detail view)
- **Repository Pattern**: For abstracting data access
- **Service Layer**: For handling business logic

## Component Relationships

- **Navigation Router**: Central controller that determines active view state
  - Manages URL history
  - Renders appropriate view components
  - Preserves state during navigation

- **Authentication Service**:
  - Manages login/logout processes
  - Handles OTP generation and verification
  - Maintains user session state

- **Home Controller**: 
  - Manages draggable tile grid
  - Dispatches events when tiles are selected
  - Persists tile positions to storage

- **Detail Controller**:
  - Manages Desmos calculator instance
  - Handles image upload interactions
  - Saves concept state back to storage
  - Controls onboarding flow presentation

- **Storage Manager**:
  - Abstracts storage interactions
  - Handles fallback mechanisms
  - Manages data schema consistency
  - Synchronizes with server when online

## Performance and Scaling

- Use of requestAnimationFrame for smooth dragging interactions
- Lazy loading of Desmos calculator instances
- Minimal DOM manipulation through targeted updates
- Image compression considerations when storing in database
- Throttling of storage operations during drag operations
- Client-side caching for offline operation
