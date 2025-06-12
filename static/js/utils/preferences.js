/**
 * User Preferences Client
 * Handles user preferences across devices
 */
const PreferencesClient = (function() {
    // Private variables
    let preferences = {
        onboardingDisabled: false,
        theme: 'light',
        aspectRatioWidth: 1, // Default aspect ratio 1:1
        aspectRatioHeight: 1,
        screenFit: 'fit', // Default screen fit mode (fit or fill) - stored in localStorage only
        autosave: false // New: autosave preference
    };
    let loaded = false;
    let originalContentBounds = null; // Store original content bounds for consistent scaling
    
    /**
     * Load preferences from local storage only (static site version)
     */
    async function loadPreferences() {
        try {
            // Load from local storage only
            const localPrefs = getPreferencesFromLocalStorage();
            if (localPrefs) {
                // Merge with defaults to ensure all keys are present
                preferences = { ...preferences, ...localPrefs };
            }
            
            loaded = true;
            applyPreferences();
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    }
    
    /**
     * Save preferences to local storage only (static site version)
     * @param {Object} newPrefs - New preferences
     */
    async function savePreferences(newPrefs) {
        try {
            // Track previous aspect ratio before updating
            if ((newPrefs.aspectRatioWidth !== undefined || newPrefs.aspectRatioHeight !== undefined) &&
                (newPrefs.aspectRatioWidth !== preferences.aspectRatioWidth || 
                 newPrefs.aspectRatioHeight !== preferences.aspectRatioHeight)) {
                lastAspectRatio = `${preferences.aspectRatioWidth}:${preferences.aspectRatioHeight}`;
            }
            
            // Update local preferences
            preferences = { ...preferences, ...newPrefs };
            
            // Save screen fit to localStorage
            if (newPrefs.screenFit) {
                localStorage.setItem('screenFit', newPrefs.screenFit);
            }
            
            // Save to local storage only (no server in static site)
            savePreferencesToLocalStorage(preferences);
            
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
            applyFitModeDisplayScaling();
        } else if (preferences.screenFit === 'fill') {
            homeView.classList.add('screen-fill-mode');
            applyFillModeDisplayScaling();
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
        if (window.renderTilesOnPoster) {
            document.dispatchEvent(new CustomEvent('containerSized'));
        }
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
        if (window.renderTilesOnPoster) {
            document.dispatchEvent(new CustomEvent('containerSized'));
        }
    }

    // Scale tiles for aspect ratio change using center-based proportional scaling
    async function scaleTilesForAspectRatioChange(aspectRatioContainer, aspectRatioWidth, aspectRatioHeight) {
        const tiles = aspectRatioContainer.querySelectorAll('.concept-tile');
        if (!tiles || tiles.length === 0) return;
        
        // Get old aspect ratio
        const oldAspectRatio = getLastAspectRatio();
        if (!oldAspectRatio) {
            return simpleReRenderTiles(aspectRatioContainer, aspectRatioWidth, aspectRatioHeight);
        }
        
        const oldRatio = oldAspectRatio.width / oldAspectRatio.height;
        const newRatio = aspectRatioWidth / aspectRatioHeight;
        
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
            const parsed = data ? JSON.parse(data) : {};
            return {
                onboardingDisabled: parsed.onboardingDisabled || false,
                theme: parsed.theme || 'light',
                aspectRatioWidth: parsed.aspectRatioWidth || 1,
                aspectRatioHeight: parsed.aspectRatioHeight || 1,
                screenFit: parsed.screenFit || 'fit',
                autosave: parsed.autosave || false
            };
        } catch (error) {
            console.error('Error reading preferences from localStorage:', error);
            return { 
                onboardingDisabled: false, 
                theme: 'light', 
                aspectRatioWidth: 1,
                aspectRatioHeight: 1,
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
        
        // Ensure display settings are reapplied on window resize for responsive tiles
        window.addEventListener('resize', () => {
            applyDisplaySettings();
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
