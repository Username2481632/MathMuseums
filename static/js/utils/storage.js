/**
 * Storage Module - Preferences and Settings Only
 * Handles user preferences and onboarding state
 * Concept data is now stored only in exported files
 */
const StorageManager = (function() {
    // All concept storage removed - data only stored in exported files
    // But we maintain an in-memory store of current session concepts for detail views
    let sessionConcepts = {};
    let conceptsInitialized = false;
    
    /**
     * Initialize the storage manager
     * @returns {Promise} Resolves when storage is ready
     */
    async function init() {
        // Clean up all deprecated and removed localStorage entries
        const keysToRemove = [
            'mm_image_skill_shown',  // deprecated
            'mm_layout_state',       // removed - only in files now
            'mm_museum_name',        // removed - only in files now  
            'mm_has_saved_file',     // removed - file API doesn't persist
            'mm_undoStack',          // removed - undo/redo now runtime only
            'mm_redoStack'           // removed - undo/redo now runtime only
        ];
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Also clean up any old concept data
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
            if (key.startsWith('mm_concept_')) {
                localStorage.removeItem(key);
            }
        });
        
        return Promise.resolve(true);
    }
    
    // Concept storage methods - now use in-memory session storage only
    
    /**
     * Initialize default concepts in memory if not already done
     */
    function initializeDefaultConcepts() {
        if (!conceptsInitialized && typeof ConceptModel !== 'undefined') {
            const defaultConcepts = ConceptModel.createAllConcepts();
            defaultConcepts.forEach(concept => {
                sessionConcepts[concept.id] = concept;
            });
            conceptsInitialized = true;
        }
    }
    
    /**
     * Save concept (in-memory only for current session)
     * @param {Object} concept - The concept data
     * @returns {Promise<Object>} The concept (unchanged)
     */
    async function saveConcept(concept) {
        initializeDefaultConcepts();
        sessionConcepts[concept.id] = concept;
        return concept;
    }
    
    /**
     * Get concept (from in-memory session store)
     * @param {string} conceptId - The concept ID
     * @returns {Promise<Object|null>} The concept or null if not found
     */
    async function getConcept(conceptId) {
        initializeDefaultConcepts();
        const concept = sessionConcepts[conceptId] || null;
        return concept;
    }
    
    /**
     * Get all concepts (from in-memory session store)
     * @returns {Promise<Array>} Array of concepts
     */
    async function getAllConcepts() {
        initializeDefaultConcepts();
        const concepts = Object.values(sessionConcepts);
        return concepts;
    }
    
    /**
     * Delete concept (from in-memory session store)
     * @param {string} conceptId - The concept ID
     * @returns {Promise<boolean>} Always returns true
     */
    async function deleteConcept(conceptId) {
        initializeDefaultConcepts();
        delete sessionConcepts[conceptId];
        return true;
    }
    
    /**
     * Clear all concepts (from in-memory session store)
     * @returns {Promise<void>}
     */
    async function clearAllConcepts() {
        sessionConcepts = {};
        conceptsInitialized = false;
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
     * @returns {boolean|null} Whether onboarding was shown in this session, or null if not set
     */
    function getOnboardingSession() {
        const stored = sessionStorage.getItem('mm_onboarding_shown');
        return stored === null ? null : stored === 'true';
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
