/**
 * Storage Module - Local File Based
 * Handles data persistence using IndexedDB with localStorage fallback
 * Server sync functionality removed - data is now stored locally in files
 */
const StorageManager = (function() {
    const DB_NAME = 'MathMuseums';
    const DB_VERSION = 1;
    const STORE_NAME = 'concepts';
    const LS_KEY_PREFIX = 'mm_concept_';
    
    // Private variables
    let db = null;
    let isDbAvailable = false;
    
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
                console.log('IndexedDB connection established for local storage');
                resolve(true);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('type', 'type', { unique: false });
                    console.log('Object store created for local storage');
                }
            };
        });
    }
    
    /**
     * Initialize the storage manager
     * @returns {Promise} Resolves when storage is ready
     */
    async function init() {
        // Clean up deprecated localStorage entries
        localStorage.removeItem('mm_image_skill_shown');
        
        return await initDatabase();
    }
    
    /**
     * Save concept to local storage
     * @param {Object} concept - The concept data to save
     * @returns {Promise<Object>} The saved concept
     */
    async function saveConcept(concept) {
        const processedConcept = {
            ...concept,
            lastModified: new Date().toISOString()
        };
        
        if (isDbAvailable && db) {
            try {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(processedConcept);
                
                await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
                
                console.log('Concept saved to IndexedDB:', processedConcept.id);
                return processedConcept;
            } catch (error) {
                console.error('Error saving to IndexedDB:', error);
                // Fall back to localStorage
            }
        }
        
        // Use localStorage as fallback
        const key = LS_KEY_PREFIX + processedConcept.id;
        localStorage.setItem(key, JSON.stringify(processedConcept));
        console.log('Concept saved to localStorage:', processedConcept.id);
        return processedConcept;
    }
    
    /**
     * Get concept from local storage
     * @param {string} conceptId - The concept ID
     * @returns {Promise<Object|null>} The concept data or null if not found
     */
    async function getConcept(conceptId) {
        if (isDbAvailable && db) {
            try {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(conceptId);
                
                const result = await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
                
                if (result) {
                    return result;
                }
            } catch (error) {
                console.error('Error reading from IndexedDB:', error);
                // Fall back to localStorage
            }
        }
        
        // Use localStorage as fallback
        const key = LS_KEY_PREFIX + conceptId;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    }
    
    /**
     * Get all concepts from local storage
     * @returns {Promise<Array>} Array of all concepts
     */
    async function getAllConcepts() {
        if (isDbAvailable && db) {
            try {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                
                const results = await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
                
                return results || [];
            } catch (error) {
                console.error('Error reading all from IndexedDB:', error);
                // Fall back to localStorage
            }
        }
        
        // Use localStorage as fallback
        const concepts = [];
        const keys = Object.keys(localStorage);
        for (const key of keys) {
            if (key.startsWith(LS_KEY_PREFIX)) {
                try {
                    const concept = JSON.parse(localStorage.getItem(key));
                    concepts.push(concept);
                } catch (error) {
                    console.error('Error parsing concept from localStorage:', error);
                }
            }
        }
        return concepts;
    }
    
    /**
     * Delete concept from local storage
     * @param {string} conceptId - The concept ID to delete
     * @returns {Promise<boolean>} Success status
     */
    async function deleteConcept(conceptId) {
        if (isDbAvailable && db) {
            try {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(conceptId);
                
                await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
                
                console.log('Concept deleted from IndexedDB:', conceptId);
            } catch (error) {
                console.error('Error deleting from IndexedDB:', error);
                // Fall back to localStorage
            }
        }
        
        // Use localStorage as fallback
        const key = LS_KEY_PREFIX + conceptId;
        localStorage.removeItem(key);
        console.log('Concept deleted from localStorage:', conceptId);
        return true;
    }
    
    /**
     * Clear all concepts from storage
     * @returns {Promise<void>}
     */
    async function clearAllConcepts() {
        if (isDbAvailable && db) {
            try {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                await new Promise((resolve, reject) => {
                    const request = store.clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
                console.log('All concepts cleared from IndexedDB');
            } catch (error) {
                console.error('Error clearing concepts from IndexedDB:', error);
                throw error;
            }
        } else {
            // Clear from localStorage
            const keys = Object.keys(localStorage);
            for (const key of keys) {
                if (key.startsWith(LS_KEY_PREFIX)) {
                    localStorage.removeItem(key);
                }
            }
            console.log('All concepts cleared from localStorage');
        }
    }
    
    /**
     * Save onboarding preference
     * @param {boolean} disabled - Whether onboarding is disabled
     */
    function saveOnboardingPreference(disabled) {
        localStorage.setItem('mm_onboarding_disabled', disabled.toString());
    }
    
    /**
     * Get onboarding preference
     * @returns {boolean} Whether onboarding is disabled
     */
    function getOnboardingPreference() {
        const stored = localStorage.getItem('mm_onboarding_disabled');
        return stored === 'true';
    }
    
    /**
     * Save onboarding session state
     * @param {boolean} shown - Whether onboarding was shown in this session
     */
    function saveOnboardingSession(shown) {
        sessionStorage.setItem('mm_onboarding_shown', shown.toString());
    }
    
    /**
     * Get onboarding session state
     * @returns {boolean} Whether onboarding was shown in this session
     */
    function getOnboardingSession() {
        const stored = sessionStorage.getItem('mm_onboarding_shown');
        return stored === 'true';
    }
    
    /**
     * Clear onboarding session state
     */
    function clearOnboardingSession() {
        sessionStorage.removeItem('mm_onboarding_shown');
    }
    
    // Public API
    return {
        init,
        initDatabase,
        saveConcept,
        getConcept,
        getAllConcepts,
        deleteConcept,
        clearAllConcepts,
        saveOnboardingPreference,
        getOnboardingPreference,
        saveOnboardingSession,
        getOnboardingSession,
        clearOnboardingSession
    };
})();

// Expose StorageManager globally
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}
