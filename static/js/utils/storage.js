/**
 * Storage Module
 * Handles data persistence using IndexedDB with localStorage fallback
 */
const StorageManager = (function() {
    const DB_NAME = 'MathMuseums';
    const DB_VERSION = 1;
    const STORE_NAME = 'concepts';
    const LS_KEY_PREFIX = 'mm_concept_';
    
    // Private variables
    let db = null;
    let isDbAvailable = false;
    let unsyncedChanges = 0;
    
    /**
     * Initialize the IndexedDB database
     * @returns {Promise} Resolves when DB is ready
     */
    async function initDatabase() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                console.warn('IndexedDB not supported, using localStorage fallback');
                isDbAvailable = false;
                return resolve(false);
            }
            
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                isDbAvailable = false;
                resolve(false);
            };
            
            request.onsuccess = (event) => {
                db = event.target.result;
                isDbAvailable = true;
                console.log('IndexedDB connection established');
                resolve(true);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('type', 'type', { unique: false });
                    console.log('Object store created');
                }
            };
        });
    }
    
    /**
     * Check if user is authenticated (by presence of a session cookie)
     * @returns {boolean}
     */
    function isAuthenticated() {
        // Simple check for Django sessionid cookie
        return document.cookie.split(';').some(c => c.trim().startsWith('sessionid='));
    }

    /**
     * Helper for API requests
     */
    async function apiRequest(url, options = {}) {
        options.credentials = 'same-origin';
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }

    /**
     * Save a concept to storage or API
     */
    async function saveConcept(concept) {
        // Increment unsynced changes counter
        incrementUnsyncedChanges();
        
        if (isAuthenticated()) {
            // If concept has an id, update; else, create
            const method = concept.id ? 'PUT' : 'POST';
            const url = concept.id
                ? `/api/concepts/${concept.id}/`
                : '/api/concepts/';
            try {
                const resp = await apiRequest(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(concept)
                });
                // Mark as synced
                decrementUnsyncedChanges();
                return resp;
            } catch (error) {
                console.error('Error saving to API, falling back to local storage', error);
                // Continue with local storage
            }
        }
        // Fallback: IndexedDB/localStorage
        saveToLocalStorage(concept);
        if (!isDbAvailable) return concept;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(concept);
            request.onsuccess = () => resolve(concept);
            request.onerror = (event) => {
                console.error('Error saving concept:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Update a concept in storage
     * @param {Object} concept - The concept to update
     * @returns {Promise<Object>} The updated concept
     */
    async function updateConcept(concept) {
        // Update timestamp
        concept.lastSynced = new Date().toISOString();
        
        // Save to local storage
        saveToLocalStorage(concept);
        
        if (!isDbAvailable) return concept;
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(concept);
            request.onsuccess = () => resolve(concept);
            request.onerror = (event) => {
                console.error('Error updating concept:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Check if there are unsynced changes
     * @returns {boolean}
     */
    function hasUnsyncedChanges() {
        return unsyncedChanges > 0;
    }
    
    /**
     * Mark a concept as synced
     * @param {string} conceptId - ID of the concept
     */
    function markConceptSynced(conceptId) {
        if (unsyncedChanges > 0) {
            unsyncedChanges--;
        }
    }
    
    /**
     * Increment unsynced changes counter
     */
    function incrementUnsyncedChanges() {
        unsyncedChanges++;
    }
    
    /**
     * Decrement unsynced changes counter
     */
    function decrementUnsyncedChanges() {
        if (unsyncedChanges > 0) {
            unsyncedChanges--;
        }
    }
    
    /**
     * Get a concept by ID
     */
    async function getConcept(id) {
        if (isAuthenticated()) {
            try {
                return await apiRequest(`/api/concepts/${id}/`);
            } catch (e) {
                // Fallback to local
            }
        }
        if (!isDbAvailable) return getFromLocalStorage(id);
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);
            request.onsuccess = () => {
                const result = request.result;
                if (!result) resolve(getFromLocalStorage(id));
                else resolve(result);
            };
            request.onerror = (event) => {
                console.error('Error getting concept:', event.target.error);
                resolve(getFromLocalStorage(id));
            };
        });
    }

    /**
     * Get all concepts
     */
    async function getAllConcepts() {
        if (isAuthenticated()) {
            try {
                return await apiRequest('/api/concepts/');
            } catch (e) {
                // Fallback to local
            }
        }
        if (!isDbAvailable) return getAllFromLocalStorage();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                const result = request.result;
                if (!result || result.length === 0) resolve(getAllFromLocalStorage());
                else resolve(result);
            };
            request.onerror = (event) => {
                console.error('Error getting all concepts:', event.target.error);
                resolve(getAllFromLocalStorage());
            };
        });
    }
    
    /**
     * Save a concept to localStorage
     * @param {Object} concept - The concept object to save
     */
    function saveToLocalStorage(concept) {
        try {
            localStorage.setItem(`${LS_KEY_PREFIX}${concept.id}`, JSON.stringify(concept));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    
    /**
     * Get a concept from localStorage
     * @param {string} id - Concept ID
     * @returns {Object|null} The concept or null if not found
     */
    function getFromLocalStorage(id) {
        try {
            const data = localStorage.getItem(`${LS_KEY_PREFIX}${id}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }
    
    /**
     * Get all concepts from localStorage
     * @returns {Array} Array of concepts
     */
    function getAllFromLocalStorage() {
        const concepts = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(LS_KEY_PREFIX)) {
                    const data = localStorage.getItem(key);
                    if (data) {
                        concepts.push(JSON.parse(data));
                    }
                }
            }
        } catch (error) {
            console.error('Error reading all from localStorage:', error);
        }
        return concepts;
    }
    
    /**
     * Save onboarding preference
     * @param {boolean} disabled - Whether onboarding should be disabled
     */
    function saveOnboardingPreference(disabled) {
        try {
            localStorage.setItem('mm_onboarding_disabled', JSON.stringify(disabled));
        } catch (error) {
            console.error('Error saving onboarding preference:', error);
        }
    }
    
    /**
     * Save onboarding session state
     * @param {boolean} shown - Whether onboarding has been shown in this session
     */
    function saveOnboardingSession(shown) {
        try {
            sessionStorage.setItem('mm_onboarding_shown', JSON.stringify(shown));
            console.log(`Onboarding session status updated: ${shown ? 'shown' : 'not shown'}`);
        } catch (error) {
            console.error('Error saving onboarding session state:', error);
        }
    }
    
    /**
     * Clear onboarding session state
     * This can be used to force onboarding to show again in the current session
     */
    function clearOnboardingSession() {
        try {
            sessionStorage.removeItem('mm_onboarding_shown');
            console.log('Onboarding session status cleared');
        } catch (error) {
            console.error('Error clearing onboarding session state:', error);
        }
    }
    
    /**
     * Get onboarding session state
     * @returns {boolean} Whether onboarding has been shown in this session
     */
    function getOnboardingSession() {
        try {
            const data = sessionStorage.getItem('mm_onboarding_shown');
            const result = data ? JSON.parse(data) : false;
            console.log(`Checking onboarding session status: ${result ? 'shown' : 'not shown'}`);
            return result;
        } catch (error) {
            console.error('Error reading onboarding session state:', error);
            return false;
        }
    }
    
    /**
     * Get onboarding preference
     * @returns {boolean} Whether onboarding is disabled
     */
    function getOnboardingPreference() {
        try {
            const data = localStorage.getItem('mm_onboarding_disabled');
            return data ? JSON.parse(data) : false;
        } catch (error) {
            console.error('Error reading onboarding preference:', error);
            return false;
        }
    }
    
    /**
     * Save user's image skill flag
     * @param {boolean} hasSkill - Whether user has demonstrated image skill
     */
    function saveImageSkill(hasSkill) {
        try {
            localStorage.setItem('mm_image_skill', JSON.stringify(hasSkill));
        } catch (error) {
            console.error('Error saving image skill flag:', error);
        }
    }
    
    /**
     * Get user's image skill flag
     * @returns {boolean} Whether user has demonstrated image skill
     */
    function getImageSkill() {
        try {
            const data = localStorage.getItem('mm_image_skill');
            return data ? JSON.parse(data) : false;
        } catch (error) {
            console.error('Error reading image skill flag:', error);
            return false;
        }
    }
    
    // Public API
    return {
        init: initDatabase,
        saveConcept,
        updateConcept,
        getConcept,
        getAllConcepts,
        saveOnboardingPreference,
        getOnboardingPreference,
        saveOnboardingSession,
        getOnboardingSession,
        clearOnboardingSession,
        saveImageSkill,
        getImageSkill,
        hasUnsyncedChanges,
        markConceptSynced,
        incrementUnsyncedChanges,
        decrementUnsyncedChanges
    };
})();

// Expose StorageManager globally
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}
