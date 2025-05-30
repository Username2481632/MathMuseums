/**
 * User Preferences Client
 * Handles user preferences across devices
 */
const PreferencesClient = (function() {
    // Private variables
    let preferences = {
        onboardingDisabled: false,
        theme: 'light',
        share_with_classmates: true, // Default to true
        aspectRatio: '16:9', // Default aspect ratio
        screenFit: 'fit' // Default screen fit mode (fit or fill)
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
                            share_with_classmates: serverPrefs.share_with_classmates,
                            aspectRatio: serverPrefs.aspect_ratio || '16:9',
                            screenFit: serverPrefs.screen_fit || 'fit'
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
                    share_with_classmates: preferences.share_with_classmates,
                    aspect_ratio: preferences.aspectRatio,
                    screen_fit: preferences.screenFit
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
        
        // Apply aspect ratio and screen fit mode
        applyDisplaySettings();
    }
    
    /**
     * Apply display settings (aspect ratio and screen fit mode)
     */
    function applyDisplaySettings() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        // Clean existing classes
        appContainer.classList.remove(
            'screen-fit-mode', 'screen-fill-mode',
            'aspect-ratio-16-9', 'aspect-ratio-4-3', 'aspect-ratio-1-1'
        );
        
        // Apply screen fit mode
        if (preferences.screenFit === 'fit') {
            appContainer.classList.add('screen-fit-mode');
        } else if (preferences.screenFit === 'fill') {
            appContainer.classList.add('screen-fill-mode');
        }
        
        // Apply aspect ratio if not 'none'
        if (preferences.aspectRatio !== 'none') {
            // Convert aspect ratio format (e.g., '16:9') to class name format ('aspect-ratio-16-9')
            const aspectRatioClass = 'aspect-ratio-' + preferences.aspectRatio.replace(':', '-');
            appContainer.classList.add(aspectRatioClass);
            
            // Wrap content in aspect ratio container if not already wrapped
            let container = document.querySelector('#app-container > .aspect-ratio-container');
            if (!container) {
                // Get all current children
                const children = Array.from(appContainer.children);
                
                // Create container
                container = document.createElement('div');
                container.className = 'aspect-ratio-container';
                
                // Create content div
                const content = document.createElement('div');
                content.className = 'aspect-ratio-content';
                
                // Move all children to content div
                children.forEach(child => content.appendChild(child));
                
                // Append content to container, and container to app
                container.appendChild(content);
                appContainer.appendChild(container);
            }
        } else {
            // If aspect ratio is 'none', remove the aspect ratio container wrapper if it exists
            const container = document.querySelector('#app-container > .aspect-ratio-container');
            if (container) {
                const content = container.querySelector('.aspect-ratio-content');
                if (content) {
                    // Move all children back to app container
                    Array.from(content.children).forEach(child => appContainer.appendChild(child));
                }
                // Remove the container
                container.remove();
            }
        }
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
                share_with_classmates: typeof parsed.share_with_classmates === 'boolean' ? parsed.share_with_classmates : true,
                aspectRatio: parsed.aspectRatio || '16:9',
                screenFit: parsed.screenFit || 'fit'
            };
        } catch (error) {
            console.error('Error reading preferences from localStorage:', error);
            return { 
                onboardingDisabled: false, 
                theme: 'light', 
                share_with_classmates: true,
                aspectRatio: '16:9',
                screenFit: 'fit'
            }; // Return defaults on error
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
    
    /**
     * Get aspect ratio setting
     * @returns {string} Current aspect ratio setting
     */
    function getAspectRatio() {
        return preferences.aspectRatio;
    }
    
    /**
     * Get screen fit mode setting
     * @returns {string} Current screen fit mode
     */
    function getScreenFit() {
        return preferences.screenFit;
    }
    
    // Public API
    return {
        init,
        savePreferences,
        isOnboardingDisabled,
        getTheme,
        getPreferences, // Expose getPreferences
        isLoaded: () => loaded,
        getAspectRatio,
        getScreenFit,
        applyDisplaySettings
    };
})();
