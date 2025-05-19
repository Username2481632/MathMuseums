# Math Museums API Integration Implementation Guide

## Overview

This document details the implementation of API integration for the Math Museums project, connecting the frontend with the Django backend to enable authentication and cross-device synchronization.

## Implementation Components

### 1. Authentication (auth.js)

The authentication module handles user authentication status and session management:

```javascript
// Key components of auth.js
const AuthClient = (function() {
    // Private variables
    let isAuthenticated = false;
    
    async function checkAuthentication() {
        // Makes a request to an API endpoint to verify authentication
        // Redirects to login page if not authenticated
    }
    
    function getCSRFToken() {
        // Extracts CSRF token from cookies for secure requests
    }
    
    async function logout() {
        // Logs out the user by making a POST request to the logout endpoint
    }
    
    async function init() {
        // Initializes the auth client and checks authentication status
    }
    
    // Public API
    return {
        init,
        logout,
        getCSRFToken,
        isAuthenticated: () => isAuthenticated,
        checkAuthentication
    };
})();
```

### 2. Synchronization (sync.js)

The synchronization module manages data synchronization between devices:

```javascript
// Key components of sync.js
const SyncClient = (function() {
    // Private variables
    let deviceId = null;
    let syncInProgress = false;
    let lastSyncTime = null;
    let syncErrors = [];
    let syncStatus = 'unknown'; // 'synced', 'syncing', 'unsynced', 'error'
    
    function getOrCreateDeviceId() {
        // Gets or creates a unique device identifier
    }
    
    function setupBackgroundSync() {
        // Sets up periodic synchronization and online event listener
    }
    
    function updateSyncStatusUI(status, message = '') {
        // Updates the sync status UI indicator
    }
    
    async function sync() {
        // Performs synchronization with the server
        // Handles conflicts and updates local storage
    }
    
    // Public API
    return {
        init,
        sync,
        forceSync,
        getLastSyncLogs,
        getSyncStatus: () => syncStatus,
        getSyncErrors: () => [...syncErrors]
    };
})();
```

### 3. User Preferences (preferences.js)

The preferences module manages user preferences across devices:

```javascript
// Key components of preferences.js
const PreferencesClient = (function() {
    // Private variables
    let preferences = {
        onboardingDisabled: false,
        theme: 'light'
    };
    let loaded = false;
    
    async function loadPreferences() {
        // Loads preferences from local storage and server
    }
    
    async function savePreferences(newPrefs) {
        // Saves preferences to local storage and server
    }
    
    // Public API
    return {
        init,
        savePreferences,
        isOnboardingDisabled,
        getTheme,
        isLoaded: () => loaded
    };
})();
```

### 4. Enhanced Storage (storage.js)

The storage module was enhanced to support synchronization:

```javascript
// Key enhancements to storage.js
function hasUnsyncedChanges() {
    return unsyncedChanges > 0;
}

function markConceptSynced(conceptId) {
    // Marks a concept as synced
}

function incrementUnsyncedChanges() {
    // Increments unsynced changes counter
}

function decrementUnsyncedChanges() {
    // Decrements unsynced changes counter
}

async function updateConcept(concept) {
    // Updates a concept with server data
}
```

## UI Components

### 1. Sync Status Indicator

```css
/* Key styles for sync status indicator */
.sync-status {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.9);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 1000;
}

.sync-icon {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 0.5rem;
}

.sync-status.synced .sync-icon {
    background-color: #4caf50;
}

.sync-status.syncing .sync-icon {
    background-color: #2196f3;
    animation: pulse 1.5s infinite;
}

.sync-status.unsynced .sync-icon {
    background-color: #ff9800;
}

.sync-status.error .sync-icon {
    background-color: #f44336;
}
```

### 2. Manual Sync Button

```html
<!-- Sync button in the navigation bar -->
<button id="sync-button" class="sync-btn">Sync Now</button>
```

```javascript
// Event listener in app.js
const syncButton = document.getElementById('sync-button');
if (syncButton) {
    syncButton.addEventListener('click', () => {
        if (SyncClient.getSyncStatus() !== 'syncing') {
            SyncClient.forceSync();
        }
    });
}
```

## Integration with Django API

The frontend components communicate with the following Django API endpoints:

1. **Authentication**:
   - `/auth/request/` - For requesting an OTP
   - `/auth/verify/` - For verifying the OTP
   - `/auth/logout/` - For logging out

2. **Concept Management**:
   - `/api/concepts/` - For listing and creating concepts
   - `/api/concepts/:id/` - For retrieving, updating, and deleting concepts

3. **Synchronization**:
   - `/api/sync/` - For synchronizing multiple concepts at once
   - `/api/sync/logs/` - For viewing synchronization history

4. **User Preferences**:
   - `/api/preferences/` - For getting and updating user preferences

## Handling Authentication States

The system handles different authentication states as follows:

1. **Unauthenticated**: 
   - User is redirected to the login page
   - Local storage continues to work for offline use

2. **Authenticated**:
   - User can access the application
   - Data is synchronized with the server
   - Changes are persisted across devices

## Handling Offline States

The system handles network states as follows:

1. **Online**:
   - Data is synchronized with the server
   - Changes are reflected on all devices

2. **Offline**:
   - Changes are stored locally in IndexedDB
   - Sync status indicator shows offline state
   - Changes are queued for synchronization when back online

## Conflict Resolution

The system handles conflicts as follows:

1. **Server-side**:
   - Version field is used for optimistic concurrency control
   - Newer versions win by default

2. **Client-side**:
   - Conflicts are logged and reported to the user
   - Server data takes precedence in conflicts

## Testing and Debugging

1. **Authentication Testing**:
   - Check if the system redirects unauthenticated users
   - Verify that login/logout functionality works correctly

2. **Synchronization Testing**:
   - Test offline functionality by disabling network
   - Test synchronization by making changes on multiple devices
   - Check conflict handling by making conflicting changes

3. **Debugging**:
   - Check browser console for JavaScript errors
   - Review Django server logs for API errors
   - Use the sync status indicator for visual feedback

## Deployment Considerations

For deployment to HelioHost, ensure:

1. Static files are collected and served correctly
2. API endpoints are accessible from the client
3. Authentication flow works in the production environment
4. CSRF protection is properly configured

## Future Improvements

1. **Enhanced Conflict Resolution**:
   - Add UI for resolving conflicts manually
   - Implement more sophisticated conflict resolution strategies

2. **Performance Optimization**:
   - Batch updates to reduce API calls
   - Use WebSockets for real-time synchronization

3. **User Experience**:
   - Add more detailed sync status reporting
   - Implement progress indicators for large syncs
