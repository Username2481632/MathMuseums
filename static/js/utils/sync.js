/**
 * Synchronization Client
 * Handles synchronization between client-side storage and the server
 */
const SyncClient = (function() {
    // Private variables
    let deviceId = null;
    let syncInProgress = false;
    let lastSyncTime = null;
    let syncErrors = [];
    let syncStatus = 'unknown'; // 'synced', 'syncing', 'unsynced', 'error'
    
    /**
     * Get or create a device ID for this browser
     * @returns {string} Device ID
     */
    function getOrCreateDeviceId() {
        let id = localStorage.getItem('mm_device_id');
        if (!id) {
            id = 'device-' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('mm_device_id', id);
        }
        return id;
    }
    
    /**
     * Set up background synchronization
     */
    function setupBackgroundSync() {
        // Sync every 5 minutes if changes are detected
        setInterval(() => {
            if (navigator.onLine && StorageManager.hasUnsyncedChanges && AuthClient.isAuthenticated()) {
                sync();
            }
        }, 5 * 60 * 1000);
        
        // Also sync when we come back online
        window.addEventListener('online', () => {
            if (StorageManager.hasUnsyncedChanges && AuthClient.isAuthenticated()) {
                sync();
            }
        });
    }
    
    /**
     * Update the sync status UI
     * @param {string} status - The new status ('synced', 'syncing', 'unsynced', 'error')
     * @param {string} message - Optional message to display
     */
    function updateSyncStatusUI(status, message = '') {
        syncStatus = status;
        
        const statusElement = document.getElementById('sync-status');
        if (!statusElement) return;
        
        // Remove all status classes
        statusElement.classList.remove('synced', 'syncing', 'unsynced', 'error');
        // Add the current status class
        statusElement.classList.add(status);
        
        // Update the text
        const textElement = statusElement.querySelector('.sync-text');
        if (textElement) {
            let statusText = '';
            switch (status) {
                case 'synced':
                    statusText = 'All changes saved';
                    break;
                case 'syncing':
                    statusText = 'Syncing...';
                    break;
                case 'unsynced':
                    statusText = 'Changes pending';
                    break;
                case 'error':
                    statusText = message || 'Sync error';
                    break;
                default:
                    statusText = 'Unknown status';
            }
            textElement.textContent = statusText;
        }
    }
    
    /**
     * Synchronize local data with the server
     * @returns {Promise<Object>} Sync result
     */
    async function sync() {
        if (syncInProgress || !AuthClient.isAuthenticated()) return;
        if (!navigator.onLine) {
            syncErrors.push({ time: new Date(), error: 'Offline' });
            updateSyncStatusUI('unsynced', 'You are offline');
            return;
        }
        
        syncInProgress = true;
        updateSyncStatusUI('syncing');
        
        try {
            // Get concepts from storage
            const concepts = await StorageManager.getAllConcepts();
            
            // Format data for API
            const syncData = {
                device_id: deviceId,
                concepts: concepts.map(concept => ({
                    id: concept.id,
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
                    'X-CSRFToken': AuthClient.getCSRFToken()
                },
                body: JSON.stringify(syncData)
            });
            
            if (!response.ok) {
                throw new Error(`Sync failed: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.conflicts && result.conflicts.length > 0) {
                console.warn('Sync conflicts detected:', result.conflicts);
                updateSyncStatusUI('unsynced', `${result.conflicts.length} conflicts detected`);
                // TODO: Implement conflict resolution UI
            } else {
                // Update local storage with server data
                await updateLocalStorage(result.concepts);
                lastSyncTime = new Date();
                updateSyncStatusUI('synced');
                console.log(`Sync completed: ${result.items_synced} items synced`);
            }
            
            return result;
        } catch (error) {
            console.error('Sync error:', error);
            syncErrors.push({ time: new Date(), error: error.message });
            updateSyncStatusUI('error', error.message);
        } finally {
            syncInProgress = false;
        }
    }
    
    /**
     * Update local storage with data from the server
     * @param {Array} serverConcepts - Concepts from the server
     * @returns {Promise<void>}
     */
    async function updateLocalStorage(serverConcepts) {
        for (const serverConcept of serverConcepts) {
            const localConcept = {
                id: serverConcept.id,
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
            
            await StorageManager.saveConcept(localConcept);
        }
    }
    
    /**
     * Get the last sync log from the server
     * @returns {Promise<Array>} Sync logs
     */
    async function getLastSyncLogs() {
        if (!AuthClient.isAuthenticated()) return [];
        
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
    
    /**
     * Force a synchronization
     * @returns {Promise<Object>} Sync result
     */
    async function forceSync() {
        return sync();
    }
    
    /**
     * Initialize the sync client
     */
    function init() {
        deviceId = getOrCreateDeviceId();
        setupBackgroundSync();
        
        // Add sync status UI to the document
        const syncStatusDiv = document.createElement('div');
        syncStatusDiv.id = 'sync-status';
        syncStatusDiv.className = 'sync-status';
        syncStatusDiv.innerHTML = `
            <span class="sync-icon"></span>
            <span class="sync-text">Initializing...</span>
        `;
        document.body.appendChild(syncStatusDiv);
        
        // Initialize with unknown status
        updateSyncStatusUI('unknown');
        
        // Check sync status
        if (AuthClient.isAuthenticated()) {
            // Try to sync immediately if authenticated
            setTimeout(sync, 2000);
        }
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
