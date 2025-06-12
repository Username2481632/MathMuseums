/**
 * Storage Module - Preferences and Settings Only
 * Handles user preferences and onboarding state
 * Concept data is now stored only in exported files
 */
const StorageManager = (function() {
    // All concept storage removed - data only stored in exported files
    
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
            'mm_has_saved_file'      // removed - file API doesn't persist
        ];
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Also clean up any old concept data
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
            if (key.startsWith('mm_concept_')) {
                localStorage.removeItem(key);
            }
        });
        
        console.log('Storage initialized - cleaned up concept data and deprecated entries');
        return Promise.resolve(true);
    }
    
    // Concept storage methods - now no-ops since data is only stored in files
    
    /**
     * Save concept (no-op - concepts no longer stored locally)
     * @param {Object} concept - The concept data
     * @returns {Promise<Object>} The concept (unchanged)
     */
    async function saveConcept(concept) {
        console.log('Concept save ignored - data only stored in exported files');
        return concept;
    }
    
    /**
     * Get concept (no-op - concepts no longer stored locally)
     * @param {string} conceptId - The concept ID
     * @returns {Promise<null>} Always returns null
     */
    async function getConcept(conceptId) {
        console.log('Concept retrieval ignored - data only stored in exported files');
        return null;
    }
    
    /**
     * Get all concepts (no-op - concepts no longer stored locally)
     * @returns {Promise<Array>} Always returns empty array
     */
    async function getAllConcepts() {
        console.log('Concept retrieval ignored - data only stored in exported files');
        return [];
    }
    
    /**
     * Delete concept (no-op - concepts no longer stored locally)
     * @param {string} conceptId - The concept ID
     * @returns {Promise<boolean>} Always returns true
     */
    async function deleteConcept(conceptId) {
        console.log('Concept deletion ignored - data only stored in exported files');
        return true;
    }
    
    /**
     * Clear all concepts (no-op - concepts no longer stored locally)
     * @returns {Promise<void>}
     */
    async function clearAllConcepts() {
        console.log('Concept clearing ignored - data only stored in exported files');
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
