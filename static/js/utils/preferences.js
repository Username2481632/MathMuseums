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
        aspectRatioWidth: 1, // Default aspect ratio 1:1
        aspectRatioHeight: 1,
        screenFit: 'fit' // Default screen fit mode (fit or fill) - stored in localStorage only
    };
    let loaded = false;
    let originalContentBounds = null; // Store original content bounds for consistent scaling
    
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
                        
                        // Get screen fit from localStorage (not stored on server)
                        const localScreenFit = localStorage.getItem('screenFit') || 'fit';
                        
                        preferences = {
                            onboardingDisabled: serverPrefs.onboarding_disabled,
                            theme: serverPrefs.theme,
                            share_with_classmates: serverPrefs.share_with_classmates,
                            aspectRatioWidth: serverPrefs.aspect_ratio_width || 1,
                            aspectRatioHeight: serverPrefs.aspect_ratio_height || 1,
                            screenFit: localScreenFit
                        };
                        
                        // Update local storage (but screen fit is handled separately)
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
            // Track previous aspect ratio before updating
            if ((newPrefs.aspectRatioWidth !== undefined || newPrefs.aspectRatioHeight !== undefined) &&
                (newPrefs.aspectRatioWidth !== preferences.aspectRatioWidth || 
                 newPrefs.aspectRatioHeight !== preferences.aspectRatioHeight)) {
                lastAspectRatio = `${preferences.aspectRatioWidth}:${preferences.aspectRatioHeight}`;
                console.log('Saved previous aspect ratio:', lastAspectRatio);
            }
            
            // Update local preferences
            preferences = { ...preferences, ...newPrefs };
            
            // Save screen fit to localStorage only
            if (newPrefs.screenFit) {
                localStorage.setItem('screenFit', newPrefs.screenFit);
            }
            
            // Save to local storage
            savePreferencesToLocalStorage(preferences);
            
            // Save to server if authenticated (excluding screenFit which is localStorage only)
            if (AuthClient.isAuthenticated()) {
                const payload = {
                    onboarding_disabled: preferences.onboardingDisabled,
                    theme: preferences.theme,
                    share_with_classmates: preferences.share_with_classmates,
                    aspect_ratio_width: preferences.aspectRatioWidth,
                    aspect_ratio_height: preferences.aspectRatioHeight,
                    screen_fit: preferences.screenFit // Still include for now, but will be localStorage only
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
    // Track last aspect ratio to detect changes
    let lastAspectRatio = null;

    function getLastAspectRatio() {
        // Return previous aspect ratio, but if this is the first call, we need to figure out
        // what the previous dimensions actually were
        if (lastAspectRatio && lastAspectRatio !== `${preferences.aspectRatioWidth}:${preferences.aspectRatioHeight}`) {
            const parts = lastAspectRatio.split(':');
            return {
                width: parseFloat(parts[0]) || 1,
                height: parseFloat(parts[1]) || 1
            };
        }
        
        // If no previous aspect ratio, try to determine from current container size
        const aspectRatioContainer = document.querySelector('#home-view .aspect-ratio-container');
        if (aspectRatioContainer && aspectRatioContainer.style.width && aspectRatioContainer.style.height) {
            const currentWidth = parseInt(aspectRatioContainer.style.width, 10);
            const currentHeight = parseInt(aspectRatioContainer.style.height, 10);
            const currentAspect = currentWidth / currentHeight;
            
            // Convert back to whole number ratio
            const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
            const ratio = currentAspect;
            
            // Try to match common ratios
            if (Math.abs(ratio - 1) < 0.1) return { width: 1, height: 1 };
            if (Math.abs(ratio - 0.5) < 0.1) return { width: 1, height: 2 };
            if (Math.abs(ratio - 2) < 0.1) return { width: 2, height: 1 };
            if (Math.abs(ratio - 16/9) < 0.1) return { width: 16, height: 9 };
            if (Math.abs(ratio - 4/3) < 0.1) return { width: 4, height: 3 };
            
            return { width: 1, height: 1 }; // Default fallback
        }
        
        // Final fallback - assume square
        return { width: 1, height: 1 };
    }

    function applyDisplaySettings() {
        const homeView = document.getElementById('home-view');
        const aspectRatioContainer = document.querySelector('#home-view .aspect-ratio-container');
        if (!homeView) return;

        // Clean existing classes from home view
        homeView.classList.remove('screen-fit-mode', 'screen-fill-mode');

        // Clean up aspect ratio container
        if (aspectRatioContainer) {
            aspectRatioContainer.classList.remove('aspect-ratio-16-9', 'aspect-ratio-4-3', 'aspect-ratio-1-1');
            aspectRatioContainer.style.transform = '';
            aspectRatioContainer.style.width = '';
            aspectRatioContainer.style.height = '';
            aspectRatioContainer.style.maxWidth = '';
            aspectRatioContainer.style.maxHeight = '';
        }

        // Always set up the container with the correct aspect ratio
        if (aspectRatioContainer) {
            // Calculate container dimensions based on current aspect ratio
            const headerHeight = 70;
            const availableWidth = window.innerWidth;
            const availableHeight = window.innerHeight - headerHeight;
            const targetAspect = preferences.aspectRatioWidth / preferences.aspectRatioHeight;
            
            let containerWidth = availableWidth;
            let containerHeight = containerWidth / targetAspect;
            if (containerHeight > availableHeight) {
                containerHeight = availableHeight;
                containerWidth = containerHeight * targetAspect;
            }
            
            aspectRatioContainer.style.width = `${containerWidth}px`;
            aspectRatioContainer.style.height = `${containerHeight}px`;
            aspectRatioContainer.style.maxWidth = 'none';
            aspectRatioContainer.style.maxHeight = 'none';
        }

        // Detect aspect ratio change
        const currentAspectRatio = `${preferences.aspectRatioWidth}:${preferences.aspectRatioHeight}`;
        const aspectRatioChanged = lastAspectRatio !== null && lastAspectRatio !== currentAspectRatio;
        
        // Only scale tiles if aspect ratio changed (not on initial load)
        if (aspectRatioChanged && aspectRatioContainer) {
            // Run async scaling in background
            scaleTilesForAspectRatioChange(aspectRatioContainer, preferences.aspectRatioWidth, preferences.aspectRatioHeight)
                .catch(error => console.error('Error scaling tiles:', error));
        }
        
        // Update last aspect ratio after processing
        lastAspectRatio = currentAspectRatio;

        // Apply screen fit/fill mode for display scaling only
        if (preferences.screenFit === 'fit') {
            homeView.classList.add('screen-fit-mode');
            setTimeout(() => applyFitModeDisplayScaling(), 100);
        } else if (preferences.screenFit === 'fill') {
            homeView.classList.add('screen-fill-mode');
            setTimeout(() => applyFillModeDisplayScaling(), 100);
        }
    }
    
    /**
     * Apply scaling to fit the content within the viewport for fit mode
     */
    // Only handles display scaling/letterboxing for fit mode
    function applyFitModeDisplayScaling() {
        const homeView = document.getElementById('home-view');
        const aspectRatioContainer = document.querySelector('#home-view .aspect-ratio-container');
        if (!homeView || !aspectRatioContainer || !homeView.classList.contains('screen-fit-mode')) return;

        // Calculate available viewport dimensions (accounting for header)
        const headerHeight = 70;
        const availableWidth = window.innerWidth;
        const availableHeight = window.innerHeight - headerHeight;
        const targetAspectRatio = preferences.aspectRatioWidth / preferences.aspectRatioHeight;

        console.log('Container sizing debug:', {
            aspectRatioWidth: preferences.aspectRatioWidth,
            aspectRatioHeight: preferences.aspectRatioHeight,
            targetAspectRatio,
            availableWidth,
            availableHeight
        });

        // Compute the largest size for the aspect ratio container that fits in the viewport
        let containerWidth = availableWidth;
        let containerHeight = containerWidth / targetAspectRatio;
        if (containerHeight > availableHeight) {
            containerHeight = availableHeight;
            containerWidth = containerHeight * targetAspectRatio;
        }

        console.log('Calculated container size:', { containerWidth, containerHeight });

        // Set the container size (this creates black bars if needed)
        aspectRatioContainer.style.width = `${containerWidth}px`;
        aspectRatioContainer.style.height = `${containerHeight}px`;
        aspectRatioContainer.style.maxWidth = 'none';
        aspectRatioContainer.style.maxHeight = 'none';
        aspectRatioContainer.style.transform = 'none';

        // Center the container
        homeView.style.alignItems = 'center';
        homeView.style.justifyContent = 'center';
        
        // Re-render tiles now that container has proper dimensions
        function waitForRenderTilesOnPoster(callback) {
            if (window.renderTilesOnPoster) {
                callback();
            } else {
                setTimeout(() => waitForRenderTilesOnPoster(callback), 50);
            }
        }

        waitForRenderTilesOnPoster(() => {
            console.log('Container sizing complete - dispatching containerSized event');
            document.dispatchEvent(new CustomEvent('containerSized'));
        });
    }
    
    /**
     * Apply proportional scaling for fill mode
     */
    // Only handles display scaling for fill mode (fills viewport in one dimension, allows scrolling in the other)
    function applyFillModeDisplayScaling() {
        const homeView = document.getElementById('home-view');
        const aspectRatioContainer = document.querySelector('#home-view .aspect-ratio-container');
        if (!homeView || !aspectRatioContainer || !homeView.classList.contains('screen-fill-mode')) return;

        // Calculate available viewport dimensions (accounting for header)
        const headerHeight = 70;
        const availableWidth = window.innerWidth;
        const availableHeight = window.innerHeight - headerHeight;
        const targetAspectRatio = preferences.aspectRatioWidth / preferences.aspectRatioHeight;

        console.log('Fill mode sizing debug:', {
            aspectRatioWidth: preferences.aspectRatioWidth,
            aspectRatioHeight: preferences.aspectRatioHeight,
            targetAspectRatio,
            availableWidth,
            availableHeight
        });

        // Calculate dimensions for both scenarios:
        // 1. Fill width (height might exceed viewport)
        const fillWidthHeight = availableWidth / targetAspectRatio;
        
        // 2. Fill height (width might exceed viewport)
        const fillHeightWidth = availableHeight * targetAspectRatio;

        let containerWidth, containerHeight;
        
        // Choose the option that makes the container larger (maximizes content area)
        // This ensures fill mode actually "fills" the viewport, allowing scrolling for overflow
        if (fillWidthHeight >= fillHeightWidth) {
            // Fill width, allow vertical scrolling if needed
            containerWidth = availableWidth;
            containerHeight = fillWidthHeight;
        } else {
            // Fill height, allow horizontal scrolling if needed
            containerWidth = fillHeightWidth;
            containerHeight = availableHeight;
        }

        console.log('Fill mode calculated size:', { containerWidth, containerHeight });

        // Set the container size
        aspectRatioContainer.style.width = `${containerWidth}px`;
        aspectRatioContainer.style.height = `${containerHeight}px`;
        aspectRatioContainer.style.maxWidth = 'none';
        aspectRatioContainer.style.maxHeight = 'none';
        aspectRatioContainer.style.transform = 'none';

        // Configure scrolling for home view
        // If container is larger than viewport, enable scrolling
        if (containerWidth > availableWidth || containerHeight > availableHeight) {
            homeView.style.overflow = 'auto';
        } else {
            homeView.style.overflow = 'hidden';
        }

        // Center the container if it's smaller than viewport
        homeView.style.alignItems = containerHeight <= availableHeight ? 'center' : 'flex-start';
        homeView.style.justifyContent = containerWidth <= availableWidth ? 'center' : 'flex-start';
        
        // Re-render tiles now that container has proper dimensions
        function waitForRenderTilesOnPoster(callback) {
            if (window.renderTilesOnPoster) {
                callback();
            } else {
                setTimeout(() => waitForRenderTilesOnPoster(callback), 50);
            }
        }

        waitForRenderTilesOnPoster(() => {
            console.log('Fill mode container sizing complete - dispatching containerSized event');
            document.dispatchEvent(new CustomEvent('containerSized'));
        });
    }

    // Scale tiles for aspect ratio change using center-based proportional scaling
    async function scaleTilesForAspectRatioChange(aspectRatioContainer, aspectRatioWidth, aspectRatioHeight) {
        console.log(`Scaling tiles for aspect ratio change: ${aspectRatioWidth}:${aspectRatioHeight}`);
        
        const tiles = aspectRatioContainer.querySelectorAll('.concept-tile');
        if (!tiles || tiles.length === 0) return;
        
        // Get old aspect ratio
        const oldAspectRatio = getLastAspectRatio();
        if (!oldAspectRatio) {
            console.log('No previous aspect ratio found, using simple re-render');
            return simpleReRenderTiles(aspectRatioContainer, aspectRatioWidth, aspectRatioHeight);
        }
        
        const oldRatio = oldAspectRatio.width / oldAspectRatio.height;
        const newRatio = aspectRatioWidth / aspectRatioHeight;
        
        console.log(`Old ratio: ${oldRatio.toFixed(3)}, New ratio: ${newRatio.toFixed(3)}`);
        
        // Calculate scale factor to fit content into new aspect ratio
        // If new ratio is wider (landscape), scale based on height
        // If new ratio is taller (portrait), scale based on width
        let scaleX, scaleY;
        
        if (newRatio > oldRatio) {
            // New aspect is wider - scale to fit height, center horizontally
            scaleY = 1.0;
            scaleX = oldRatio / newRatio;
        } else {
            // New aspect is taller - scale to fit width, center vertically  
            scaleX = 1.0;
            scaleY = newRatio / oldRatio;
        }
        
        console.log(`Scale factors: scaleX=${scaleX.toFixed(3)}, scaleY=${scaleY.toFixed(3)}`);
        
        // Transform all tiles using center-based scaling
        for (const tile of tiles) {
            const conceptId = tile.dataset.id;
            if (conceptId && window.StorageManager && window.ConceptModel) {
                try {
                    const concept = await window.StorageManager.getConcept(conceptId);
                    if (concept) {
                        const coords = window.ConceptModel.getCoordinates(concept);
                        
                        // Scale coordinates from center (50, 50)
                        // Transform: newPos = 50 + (oldPos - 50) * scale
                        const scaledCoords = {
                            centerX: 50 + (coords.centerX - 50) * scaleX,
                            centerY: 50 + (coords.centerY - 50) * scaleY,
                            width: coords.width * scaleX,
                            height: coords.height * scaleY
                        };
                        
                        console.log(`Tile ${conceptId}: (${coords.centerX.toFixed(1)}, ${coords.centerY.toFixed(1)}) → (${scaledCoords.centerX.toFixed(1)}, ${scaledCoords.centerY.toFixed(1)})`);
                        
                        // Update the concept with scaled coordinates
                        const updatedConcept = window.ConceptModel.updateCoordinates(concept, scaledCoords);
                        await window.StorageManager.saveConcept(updatedConcept);
                        
                        // Convert to pixels and apply to tile
                        const containerWidth = aspectRatioContainer.offsetWidth;
                        const containerHeight = aspectRatioContainer.offsetHeight;
                        const pixelCoords = window.CoordinateUtils.percentageToPixels(
                            scaledCoords.centerX, scaledCoords.centerY, 
                            scaledCoords.width, scaledCoords.height,
                            containerWidth, containerHeight
                        );
                        
                        tile.style.left = `${pixelCoords.x}px`;
                        tile.style.top = `${pixelCoords.y}px`;
                        tile.style.width = `${pixelCoords.width}px`;
                        tile.style.height = `${pixelCoords.height}px`;
                    }
                } catch (error) {
                    console.error(`Error scaling tile ${conceptId}:`, error);
                }
            }
        }
        
        console.log('Aspect ratio scaling complete');
    }

    // Simple re-render fallback for when no previous aspect ratio is available
    async function simpleReRenderTiles(aspectRatioContainer, aspectRatioWidth, aspectRatioHeight) {
        const tiles = aspectRatioContainer.querySelectorAll('.concept-tile');
        if (!tiles || tiles.length === 0) return;
        
        // Get new container dimensions using consistent offsetWidth/offsetHeight
        const containerWidth = aspectRatioContainer.offsetWidth;
        const containerHeight = aspectRatioContainer.offsetHeight;
        
        // Simply re-render all tiles using their existing percentage coordinates
        for (const tile of tiles) {
            const conceptId = tile.dataset.id;
            if (conceptId && window.StorageManager && window.ConceptModel) {
                try {
                    const concept = await window.StorageManager.getConcept(conceptId);
                    if (concept) {
                        const coords = window.ConceptModel.getCoordinates(concept);
                        
                        const pixelCoords = window.CoordinateUtils.percentageToPixels(
                            coords.centerX, coords.centerY, coords.width, coords.height,
                            containerWidth, containerHeight
                        );
                        
                        tile.style.left = `${pixelCoords.x}px`;
                        tile.style.top = `${pixelCoords.y}px`;
                        tile.style.width = `${pixelCoords.width}px`;
                        tile.style.height = `${pixelCoords.height}px`;
                    }
                } catch (error) {
                    console.error(`Error re-rendering tile ${conceptId}:`, error);
                }
            }
        }
    }
    
    /**
     * Calculate the bounding box of all tiles (kept for backward compatibility)
     * @param {NodeList} tiles - All tile elements
     * @returns {Object|null} Bounding box {minX, minY, maxX, maxY, width, height}
     */
    function calculateContentBounds(tiles) {
        if (!tiles || tiles.length === 0) return null;
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        tiles.forEach(tile => {
            const x = parseInt(tile.style.left, 10) || 0;
            const y = parseInt(tile.style.top, 10) || 0;
            const width = parseInt(tile.style.width, 10) || 250;
            const height = parseInt(tile.style.height, 10) || 200;
            
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        });
        
        return {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY
        };
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
        
        // Add window resize listener for scaling
        window.addEventListener('resize', () => {
            if (preferences.screenFit === 'fit') {
                applyFitModeDisplayScaling();
            } else if (preferences.screenFit === 'fill') {
                applyFillModeDisplayScaling();
            }
        });
    }
    
    /**
     * Get aspect ratio setting
     * @returns {Object} Current aspect ratio setting with width and height
     */
    function getAspectRatio() {
        return {
            width: preferences.aspectRatioWidth,
            height: preferences.aspectRatioHeight,
            ratio: preferences.aspectRatioWidth / preferences.aspectRatioHeight
        };
    }
    
    /**
     * Get aspect ratio width
     * @returns {number} Current aspect ratio width
     */
    function getAspectRatioWidth() {
        return preferences.aspectRatioWidth;
    }
    
    /**
     * Get aspect ratio height
     * @returns {number} Current aspect ratio height
     */
    function getAspectRatioHeight() {
        return preferences.aspectRatioHeight;
    }
    
    /**
     * Get screen fit mode setting
     * @returns {string} Current screen fit mode
     */
    function getScreenFit() {
        return preferences.screenFit;
    }
    
    /**
     * Reset the stored original content bounds
     * Call this when tiles are added, removed, or manually repositioned
     */
    function resetOriginalContentBounds() {
        originalContentBounds = null;
    }
    
    /**
     * Calculate optimal scaling factor for percentage coordinates
     * @param {number} newWidth - New aspect ratio width
     * @param {number} newHeight - New aspect ratio height
     * @param {number} oldWidth - Previous aspect ratio width  
     * @param {number} oldHeight - Previous aspect ratio height
     * @returns {number} Scale factor to apply to percentage coordinates
     */
    function calculateOptimalScaling(newWidth, newHeight, oldWidth, oldHeight) {
        // Calculate the base size change (max dimension change)
        const oldBaseSize = Math.max(oldWidth, oldHeight);
        const newBaseSize = Math.max(newWidth, newHeight);
        
        // Return the simple scale factor
        return newBaseSize / oldBaseSize;
    }
    
    /**
     * Debug function to log scaling information
     * @param {string} action - Action being performed
     * @param {Object} data - Data to log
     */
    function debugScaling(action, data) {
        if (window.location.search.includes('debug=true')) {
            console.log(`[AspectRatio] ${action}:`, data);
        }
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
        getAspectRatioWidth,
        getAspectRatioHeight,
        getScreenFit,
        applyDisplaySettings,
        applyFitModeDisplayScaling,
        applyFillModeDisplayScaling,
        calculateContentBounds,
        calculateOptimalScaling,
        resetOriginalContentBounds // Expose the reset function
    };
})();

// Expose PreferencesClient globally
if (typeof window !== 'undefined') {
    window.PreferencesClient = PreferencesClient;
}
