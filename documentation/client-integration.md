# Client-Side API Integration Plan

## Overview

The client-side code needs to be modified to integrate with the server API for authentication and data synchronization. This document outlines the changes required to implement this integration.

## Current Architecture

The client currently uses:
- IndexedDB for primary storage (with localStorage fallback)
- In-memory concepts model for data management
- Hash-based routing for navigation
- Vanilla JavaScript for all functionality

## Required Changes

### 1. Authentication Integration

1. **Create an auth.js Module:**
   ```javascript
   // static/js/utils/auth.js
   
   class AuthClient {
     constructor() {
       this.isAuthenticated = false;
       this.checkAuthentication();
     }
     
     async checkAuthentication() {
       try {
         const response = await fetch('/api/concepts/', {
           method: 'GET',
           credentials: 'same-origin'
         });
         
         if (response.status === 200) {
           this.isAuthenticated = true;
           return true;
         } else if (response.status === 401 || response.status === 403) {
           this.isAuthenticated = false;
           window.location.href = '/auth/request/';
           return false;
         }
       } catch (error) {
         console.error('Authentication check failed:', error);
         return false;
       }
     }
     
     async logout() {
       try {
         await fetch('/auth/logout/', {
           method: 'POST',
           credentials: 'same-origin',
           headers: {
             'X-CSRFToken': this.getCSRFToken()
           }
         });
         window.location.href = '/auth/request/';
       } catch (error) {
         console.error('Logout failed:', error);
       }
     }
     
     getCSRFToken() {
       return document.cookie
         .split('; ')
         .find(row => row.startsWith('csrftoken='))
         ?.split('=')[1] || '';
     }
   }
   
   export const authClient = new AuthClient();
   ```

2. **Modify app.js to Check Authentication:**
   ```javascript
   import { authClient } from './utils/auth.js';
   
   // In the app initialization
   if (!authClient.isAuthenticated) {
     authClient.checkAuthentication();
   }
   ```

### 2. Synchronization Module

1. **Create a sync.js Module:**
   ```javascript
   // static/js/utils/sync.js
   
   import { storage } from './storage.js';
   import { authClient } from './auth.js';
   
   class SyncClient {
     constructor() {
       this.deviceId = this.getOrCreateDeviceId();
       this.syncInProgress = false;
       this.lastSyncTime = null;
       this.syncErrors = [];
       this.setupBackgroundSync();
     }
     
     getOrCreateDeviceId() {
       let deviceId = localStorage.getItem('deviceId');
       if (!deviceId) {
         deviceId = 'device-' + Math.random().toString(36).substring(2, 15);
         localStorage.setItem('deviceId', deviceId);
       }
       return deviceId;
     }
     
     setupBackgroundSync() {
       // Sync every 5 minutes if changes are detected
       setInterval(() => {
         if (navigator.onLine && storage.hasUnsyncedChanges()) {
           this.sync();
         }
       }, 5 * 60 * 1000);
       
       // Also sync when we come back online
       window.addEventListener('online', () => {
         if (storage.hasUnsyncedChanges()) {
           this.sync();
         }
       });
     }
     
     async sync() {
       if (this.syncInProgress) return;
       if (!navigator.onLine) {
         this.syncErrors.push({ time: new Date(), error: 'Offline' });
         return;
       }
       
       this.syncInProgress = true;
       
       try {
         // Get concepts from storage
         const concepts = await storage.getAllConcepts();
         
         // Prepare data for sync
         const syncData = {
           device_id: this.deviceId,
           concepts: concepts.map(concept => ({
             concept_type: concept.type,
             position_x: concept.positionX,
             position_y: concept.positionY,
             width: concept.width,
             height: concept.height,
             desmos_state: concept.desmosState,
             description: concept.description,
             is_complete: concept.isComplete,
             version: concept.version || 1
           }))
         };
         
         // Send to server
         const response = await fetch('/api/sync/', {
           method: 'POST',
           credentials: 'same-origin',
           headers: {
             'Content-Type': 'application/json',
             'X-CSRFToken': authClient.getCSRFToken()
           },
           body: JSON.stringify(syncData)
         });
         
         if (!response.ok) {
           throw new Error(`Sync failed: ${response.status}`);
         }
         
         const result = await response.json();
         
         if (result.conflicts.length > 0) {
           console.warn('Sync conflicts detected:', result.conflicts);
           // Handle conflicts - for now just log them
         }
         
         // Update local storage with server data
         await this.updateLocalStorage(result.concepts);
         
         this.lastSyncTime = new Date();
         console.log(`Sync completed: ${result.items_synced} items synced`);
       } catch (error) {
         console.error('Sync error:', error);
         this.syncErrors.push({ time: new Date(), error: error.message });
       } finally {
         this.syncInProgress = false;
       }
     }
     
     async updateLocalStorage(serverConcepts) {
       for (const serverConcept of serverConcepts) {
         const localConcept = {
           type: serverConcept.concept_type,
           positionX: serverConcept.position_x,
           positionY: serverConcept.position_y,
           width: serverConcept.width,
           height: serverConcept.height,
           desmosState: serverConcept.desmos_state,
           description: serverConcept.description,
           isComplete: serverConcept.is_complete,
           version: serverConcept.version,
           lastSynced: new Date().toISOString()
         };
         
         await storage.updateConcept(localConcept);
       }
     }
     
     async getLastSyncStatus() {
       try {
         const response = await fetch('/api/sync/logs/', {
           method: 'GET',
           credentials: 'same-origin'
         });
         
         if (!response.ok) {
           throw new Error(`Failed to fetch sync logs: ${response.status}`);
         }
         
         return await response.json();
       } catch (error) {
         console.error('Error fetching sync logs:', error);
         return [];
       }
     }
     
     async forceSync() {
       // For manual sync triggering from UI
       return this.sync();
     }
   }
   
   export const syncClient = new SyncClient();
   ```

2. **Modify storage.js to Support Sync:**
   ```javascript
   // Add to storage.js
   
   hasUnsyncedChanges() {
     return this.unsyncedChanges > 0;
   }
   
   markConceptSynced(conceptType) {
     // Implementation details to mark a concept as synced
   }
   
   decrementUnsyncedChanges() {
     this.unsyncedChanges = Math.max(0, this.unsyncedChanges - 1);
   }
   
   incrementUnsyncedChanges() {
     this.unsyncedChanges += 1;
   }
   ```

3. **Add Sync Status UI:**
   ```html
   <!-- Add to index.html template -->
   <div id="sync-status" class="sync-status">
     <span class="sync-icon"></span>
     <span class="sync-text">All changes saved</span>
   </div>
   ```

   ```css
   /* Add to styles.css */
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
   }
   
   .sync-icon {
     width: 12px;
     height: 12px;
     border-radius: 50%;
     margin-right: 0.5rem;
   }
   
   .synced .sync-icon {
     background-color: #4caf50;
   }
   
   .syncing .sync-icon {
     background-color: #2196f3;
     animation: pulse 1.5s infinite;
   }
   
   .unsynced .sync-icon {
     background-color: #ff9800;
   }
   
   .error .sync-icon {
     background-color: #f44336;
   }
   
   @keyframes pulse {
     0% { opacity: 1; }
     50% { opacity: 0.5; }
     100% { opacity: 1; }
   }
   ```

### 3. User Preferences Integration

1. **Create a preferences.js Module:**
   ```javascript
   // static/js/utils/preferences.js
   
   import { storage } from './storage.js';
   import { authClient } from './auth.js';
   
   class PreferencesClient {
     constructor() {
       this.preferences = {
         onboardingDisabled: false,
         theme: 'light'
       };
       this.loaded = false;
       this.loadPreferences();
     }
     
     async loadPreferences() {
       try {
         // First try to load from local storage
         const localPrefs = await storage.getPreferences();
         if (localPrefs) {
           this.preferences = localPrefs;
         }
         
         // Then try to load from server if authenticated
         if (authClient.isAuthenticated) {
           const response = await fetch('/api/preferences/', {
             method: 'GET',
             credentials: 'same-origin'
           });
           
           if (response.ok) {
             const serverPrefs = await response.json();
             this.preferences = {
               onboardingDisabled: serverPrefs.onboarding_disabled,
               theme: serverPrefs.theme
             };
             
             // Update local storage
             await storage.savePreferences(this.preferences);
           }
         }
         
         this.loaded = true;
         this.applyPreferences();
       } catch (error) {
         console.error('Error loading preferences:', error);
       }
     }
     
     async savePreferences(newPrefs) {
       try {
         // Update local preferences
         this.preferences = { ...this.preferences, ...newPrefs };
         
         // Save to local storage
         await storage.savePreferences(this.preferences);
         
         // Save to server if authenticated
         if (authClient.isAuthenticated) {
           await fetch('/api/preferences/', {
             method: 'PUT',
             credentials: 'same-origin',
             headers: {
               'Content-Type': 'application/json',
               'X-CSRFToken': authClient.getCSRFToken()
             },
             body: JSON.stringify({
               onboarding_disabled: this.preferences.onboardingDisabled,
               theme: this.preferences.theme
             })
           });
         }
         
         this.applyPreferences();
       } catch (error) {
         console.error('Error saving preferences:', error);
       }
     }
     
     applyPreferences() {
       // Apply theme
       document.body.className = this.preferences.theme;
     }
     
     isOnboardingDisabled() {
       return this.preferences.onboardingDisabled;
     }
     
     getTheme() {
       return this.preferences.theme;
     }
   }
   
   export const preferencesClient = new PreferencesClient();
   ```

### 4. Modify OnboardingController

Update the onboarding controller to check server-side preference:

```javascript
// Modify in static/js/controllers/onboarding.js

import { preferencesClient } from '../utils/preferences.js';

// Replace existing onboarding checks with:
shouldShowOnboarding() {
  if (!preferencesClient.loaded) {
    return false; // Don't show onboarding until preferences are loaded
  }
  
  return !preferencesClient.isOnboardingDisabled();
}

disableOnboarding() {
  preferencesClient.savePreferences({ onboardingDisabled: true });
}
```

## Implementation Plan

1. Create the new modules:
   - auth.js
   - sync.js
   - preferences.js

2. Modify existing modules:
   - storage.js (add sync support)
   - onboarding.js (use preferences client)
   - app.js (check authentication)

3. Add sync status UI to index.html and styles.css

4. Test synchronization:
   - Verify offline operation
   - Test sync when coming online
   - Verify conflict resolution
   - Test background sync timing

## Schedule

- Day 1: Implement auth.js and preferences.js
- Day 2: Implement sync.js and modify storage.js
- Day 3: Modify onboarding controller and add sync UI
- Day 4: Testing and debugging

## Testing Strategy

1. **Authentication Testing:**
   - Test login/logout flow
   - Verify redirect to login page when unauthenticated
   - Test session persistence

2. **Sync Testing:**
   - Test data synchronization with server
   - Verify offline functionality
   - Test conflict detection and resolution
   - Verify background sync timing

3. **User Experience Testing:**
   - Ensure seamless offline/online transition
   - Verify sync status indicator works correctly
   - Test preferences sync between devices
