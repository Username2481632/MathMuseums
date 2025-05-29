/**
 * User Preferences Client
 * Handles user preferences across devices
 */
const PreferencesClient = (function() {
    // Private variables
    let preferences = {
        onboardingDisabled: false,
        theme: 'light',
        share_with_classmates: true // Default to true
    };
    let loaded = false;
    
    /**
     * Load preferences from storage or server
     */
    async function loadPreferences() {
        try {
            // First try to load from local storage
            const localPrefs = getPreferencesFromLocalStorage();
            if (localPrefs) {
                // Merge with defaults to ensure all keys are present
                preferences = { ...preferences, ...localPrefs };
            }
            
            // Then try to load from server if authenticated
            if (AuthClient.isAuthenticated()) {
                try {
                    const response = await fetch('/api/preferences/', {
                        method: 'GET',
                        credentials: 'same-origin'
                    });
                    
                    if (response.ok) {
                        const serverPrefs = await response.json();
                        preferences = {
                            onboardingDisabled: serverPrefs.onboarding_disabled,
                            theme: serverPrefs.theme,
                            share_with_classmates: serverPrefs.share_with_classmates 
                        };
                        
                        // Update local storage
                        savePreferencesToLocalStorage(preferences);
                    } else {
                        console.warn('Failed to load preferences from server, using local/default.');
                    }
                } catch (error) {
                    console.error('Error loading preferences from server:', error);
                }
            }
            
            loaded = true;
            applyPreferences();
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    }
    
    /**
     * Save preferences to storage and server
     * @param {Object} newPrefs - New preferences
     */
    async function savePreferences(newPrefs) {
        try {
            // Update local preferences
            preferences = { ...preferences, ...newPrefs };
            
            // Save to local storage
            savePreferencesToLocalStorage(preferences);
            
            // Save to server if authenticated
            if (AuthClient.isAuthenticated()) {
                const payload = {
                    onboarding_disabled: preferences.onboardingDisabled,
                    theme: preferences.theme,
                    share_with_classmates: preferences.share_with_classmates
                };
                console.log('Saving preferences to server:', payload); // Debug log
                await fetch('/api/preferences/', {
                    method: 'PUT',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': AuthClient.getCSRFToken()
                    },
                    body: JSON.stringify(payload)
                });
            }
            
            applyPreferences();
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }
    
    /**
     * Apply preferences to the UI
     */
    function applyPreferences() {
        // Apply theme
        document.body.className = preferences.theme;
    }
    
    /**
     * Save preferences to localStorage
     * @param {Object} prefs - Preferences to save
     */
    function savePreferencesToLocalStorage(prefs) {
        try {
            localStorage.setItem('mm_preferences', JSON.stringify(prefs));
        } catch (error) {
            console.error('Error saving preferences to localStorage:', error);
        }
    }
    
    /**
     * Get preferences from localStorage
     * @returns {Object|null} Preferences or null if not found
     */
    function getPreferencesFromLocalStorage() {
        try {
            const data = localStorage.getItem('mm_preferences');
            // Ensure share_with_classmates has a default if not present
            const parsed = data ? JSON.parse(data) : {};
            return {
                onboardingDisabled: parsed.onboardingDisabled || false,
                theme: parsed.theme || 'light',
                share_with_classmates: typeof parsed.share_with_classmates === 'boolean' ? parsed.share_with_classmates : true
            };
        } catch (error) {
            console.error('Error reading preferences from localStorage:', error);
            return { onboardingDisabled: false, theme: 'light', share_with_classmates: true }; // Return defaults on error
        }
    }
    
    /**
     * Check if onboarding is disabled
     * @returns {boolean}
     */
    function isOnboardingDisabled() {
        return preferences.onboardingDisabled;
    }
    
    /**
     * Get the current theme
     * @returns {string}
     */
    function getTheme() {
        return preferences.theme;
    }

    /**
     * Get all current preferences
     * @returns {Object}
     */
    function getPreferences() {
        return { ...preferences };
    }
    
    /**
     * Initialize the preferences client
     */
    function init() {
        loadPreferences();
    }
    
    // Public API
    return {
        init,
        savePreferences,
        isOnboardingDisabled,
        getTheme,
        getPreferences, // Expose getPreferences
        isLoaded: () => loaded
    };
})();
