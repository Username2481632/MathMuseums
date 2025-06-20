/**
 * Desmos Utilities - Optimized Thumbnail Generation
 * Provides utilities for working with Desmos calculator states and thumbnails
 */
const DesmosUtils = (function() {
    // Private variables
    let hiddenCalculator = null;
    let hiddenContainer = null;
    
    // Thumbnail cache for avoiding redundant generation with sessionStorage persistence
    const thumbnailCache = new Map();
    
    // Queue management for batch processing
    let generationQueue = [];
    let isProcessingQueue = false;
    let pendingGenerations = new Map(); // Track pending generations to avoid duplicates
    let isCleaningUp = false; // Track cleanup state to prevent operations on destroyed calculator
    
    // Performance monitoring
    let performanceStats = {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        averageGenerationTime: 0,
        generationTimes: []
    };
    
    /**
     * Generate a simple hash from a string
     * @param {string} str - String to hash
     * @returns {string} Simple hash
     */
    function simpleHash(str) {
        // Hash only the state content - conceptId is irrelevant for caching
        const fullString = str || '';
        let hash = 0;
        for (let i = 0; i < fullString.length; i++) {
            const char = fullString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    
    /**
     * Load cache from sessionStorage on initialization
     */
    function loadCacheFromSession() {
        try {
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith(window.THUMBNAIL_CACHE_PREFIX)) {
                    const hash = key.substring(window.THUMBNAIL_CACHE_PREFIX.length);
                    const dataUrl = sessionStorage.getItem(key);
                    if (dataUrl) {
                        thumbnailCache.set(hash, dataUrl);
                    }
                }
            }
        } catch (error) {
            console.warn('Error loading cache from sessionStorage:', error);
        }
    }
    
    /**
     * Save cache item to sessionStorage
     * @param {string} hash - Cache key hash
     * @param {string} dataUrl - Image data URL
     */
    function saveCacheToSession(hash, dataUrl) {
        try {
            sessionStorage.setItem(window.THUMBNAIL_CACHE_PREFIX + hash, dataUrl);
        } catch (error) {
            // SessionStorage full or unavailable - continue with memory cache only
            console.warn('SessionStorage unavailable, using memory cache only:', error);
        }
    }
    
    /**
     * Clean up old cache entries when cache is full
     */
    function cleanupCache() {
        if (thumbnailCache.size >= window.MAX_THUMBNAIL_CACHE_SIZE) {
            // Remove oldest entries (first quarter of cache)
            const entriesToRemove = Math.floor(window.MAX_THUMBNAIL_CACHE_SIZE / 4);
            const keys = Array.from(thumbnailCache.keys());
            for (let i = 0; i < entriesToRemove; i++) {
                const hash = keys[i];
                thumbnailCache.delete(hash);
                
                // Also remove from sessionStorage
                try {
                    sessionStorage.removeItem(window.THUMBNAIL_CACHE_PREFIX + hash);
                } catch (error) {
                    // Ignore sessionStorage errors
                }
            }
        }
    }
    
    /**
     * Initialize the hidden calculator for thumbnail generation
     * @returns {Promise} Resolves when the calculator is ready
     */
    async function initHiddenCalculator() {
        return new Promise((resolve, reject) => {
            try {
                // If the calculator is already initialized, resolve immediately
                if (hiddenCalculator) {
                    return resolve(hiddenCalculator);
                }
                
                // Check if Desmos is loaded
                if (typeof Desmos === 'undefined') {
                    return reject(new Error('Desmos API not loaded'));
                }
                
                // Create a hidden container for the calculator
                if (!hiddenContainer) {
                    hiddenContainer = document.createElement('div');
                    hiddenContainer.style.position = 'absolute';
                    hiddenContainer.style.opacity = '0';
                    hiddenContainer.style.visibility = 'hidden';
                    hiddenContainer.style.width = '300px';
                    hiddenContainer.style.height = '200px';
                    hiddenContainer.style.pointerEvents = 'none';
                    hiddenContainer.style.top = '-9999px'; // Move completely off-screen
                    hiddenContainer.id = 'hidden-calculator-container';
                    document.body.appendChild(hiddenContainer);
                }
                
                // Create a hidden calculator instance with optimized settings
                hiddenCalculator = Desmos.GraphingCalculator(hiddenContainer, {
                    expressions: true, // must be true to render equations/images
                    images: true,     // enable image rendering in state
                    settingsMenu: false,
                    zoomButtons: false,
                    expressionsTopbar: false,
                    border: false,
                    lockViewport: true,
                    autosize: false,
                    pointsOfInterest: false, // Disable for faster rendering
                    trace: false,            // Disable for faster rendering
                    sliders: false,          // Disable for faster rendering
                    keypad: false,           // Disable for faster rendering
                    graphpaper: true,        // Keep for better previews
                    showGrid: true,          // Keep for better previews
                    xAxisLabel: '',          // Remove labels for cleaner thumbnails
                    yAxisLabel: ''           // Remove labels for cleaner thumbnails
                });
                
                // Calculator is ready immediately after creation
                resolve(hiddenCalculator);
            } catch (error) {
                console.error('Error initializing hidden calculator:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Process the thumbnail generation queue
     */
    async function processQueue() {
        if (isProcessingQueue || generationQueue.length === 0) {
            return;
        }
        
        isProcessingQueue = true;
        
        try {
            // Process ONE thumbnail at a time to prevent calculator state contamination
            // The shared hidden calculator can't handle concurrent setState() calls
            const batch = generationQueue.splice(0, 1);
            const promises = batch.map(async (item) => {
                try {
                    const dataUrl = await generateThumbnailDirect(item.stateString);
                    item.resolve(dataUrl);
                } catch (error) {
                    item.reject(error);
                }
            });
            
            await Promise.all(promises);
            
            // Small delay between batches to prevent overwhelming the system
            if (generationQueue.length > 0) {
                setTimeout(() => {
                    isProcessingQueue = false;
                    processQueue();
                }, window.THUMBNAIL_GENERATION_DELAY);
            } else {
                isProcessingQueue = false;
            }
        } catch (error) {
            console.error('Error processing thumbnail queue:', error);
            isProcessingQueue = false;
        }
    }
    
    /**
     * Generate a thumbnail directly (internal method)
     * @param {string} stateString - Stringified Desmos state
     * @returns {Promise<string>} Resolves with data URL of the thumbnail
     */
    async function generateThumbnailDirect(stateString) {
        // Check if DesmosUtils is being cleaned up
        if (isCleaningUp) {
            throw new Error('DesmosUtils is being cleaned up, cannot generate thumbnail');
        }
        
        if (!stateString) {
            // Create a blank state for preview
            const blankState = {
                version: 10,
                randomSeed: "",
                graph: {
                    viewport: {
                        xmin: -10,
                        ymin: -10,
                        xmax: 10,
                        ymax: 10
                    }
                },
                expressions: {
                    list: []
                }
            };
            stateString = JSON.stringify(blankState);
        }
        
        try {
            // Parse the state for thumbnail generation
            const parsedState = JSON.parse(stateString);
            
            // Initialize hidden calculator
            const calculator = await initHiddenCalculator();
            
            // Check again if cleanup started while we were initializing
            if (isCleaningUp) {
                throw new Error('DesmosUtils cleanup started during initialization');
            }
            
            // Clear any existing state first to prevent contamination
            calculator.setState({
                version: 11,
                randomSeed: "",
                graph: { viewport: { xmin: -10, ymin: -10, xmax: 10, ymax: 10 } },
                expressions: { list: [] }
            });
            
            // Set the actual calculator state immediately
            calculator.setState(parsedState);
            
            // Use proper async screenshot with callback for guaranteed state evaluation
            // This ensures the graph state is fully evaluated before screenshot
            // Respect the saved viewport/zoom level from the Desmos state
            const screenshotConfig = {
                width: 250,
                height: 200,
                targetPixelRatio: 1.25,
                preserveAxisNumbers: false
                // Note: No mathBounds specified - respects current viewport from state
            };
            
            // Use asyncScreenshot instead of screenshot for proper state evaluation
            return new Promise((resolve, reject) => {
                calculator.asyncScreenshot(screenshotConfig, (dataUrl) => {
                    // Final check before returning
                    if (isCleaningUp) {
                        reject(new Error('DesmosUtils cleanup started during screenshot'));
                        return;
                    }
                    
                    // Validate the returned dataUrl
                    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
                        reject(new Error('Invalid screenshot data returned from Desmos'));
                        return;
                    }
                    
                    resolve(dataUrl);
                });
            });
        } catch (error) {
            console.error('Thumbnail generation failed:', error);
            throw error;
        }
    }
    
    /**
     * Check if a thumbnail is cached (synchronous) - checks memory and sessionStorage
     * @param {string} stateString - Stringified Desmos state
     * @returns {string|null} Cached data URL or null if not cached
     */
    function getCachedThumbnail(stateString) {
        const cacheKey = simpleHash(stateString);
        
        // First check memory cache (fastest)
        if (thumbnailCache.has(cacheKey)) {
            return thumbnailCache.get(cacheKey);
        }
        
        // Check sessionStorage as fallback
        try {
            const dataUrl = sessionStorage.getItem(window.THUMBNAIL_CACHE_PREFIX + cacheKey);
            if (dataUrl) {
                // Add back to memory cache for faster future access
                thumbnailCache.set(cacheKey, dataUrl);
                return dataUrl;
            }
        } catch (error) {
            // SessionStorage not available, continue with memory cache only
        }
        
        return null;
    }
    
    /**
     * Generate a thumbnail from a Desmos state with concept-specific caching
     * @param {string} stateString - Stringified Desmos state
     * @param {string} conceptId - Optional concept ID for unique cache keys
     * @returns {Promise<string>} Resolves with data URL of the thumbnail
     */
    async function generateThumbnail(stateString, conceptId = '') {
        const startTime = performance.now();
        performanceStats.totalRequests++;
        
        
        // Generate cache key from state only (conceptId is irrelevant for caching)
        const cacheKey = simpleHash(stateString);
        
        // Check cache first
        if (thumbnailCache.has(cacheKey)) {
            performanceStats.cacheHits++;
            return Promise.resolve(thumbnailCache.get(cacheKey));
        }
        
        // Check sessionStorage as fallback
        try {
            const dataUrl = sessionStorage.getItem(window.THUMBNAIL_CACHE_PREFIX + cacheKey);
            if (dataUrl) {
                // Add back to memory cache for faster future access
                thumbnailCache.set(cacheKey, dataUrl);
                performanceStats.cacheHits++;
                return Promise.resolve(dataUrl);
            }
        } catch (error) {
            // SessionStorage not available, continue with generation
        }
        
        // Check if this thumbnail is already being generated
        if (pendingGenerations.has(cacheKey)) {
            // Return the existing promise to avoid duplicate generation
            return pendingGenerations.get(cacheKey);
        }
        
        performanceStats.cacheMisses++;
        
        // Create promise for this generation
        const generationPromise = new Promise((resolve, reject) => {
            generationQueue.push({
                stateString,
                startTime,
                cacheKey,
                resolve: (dataUrl) => {
                    const endTime = performance.now();
                    const generationTime = endTime - startTime;
                    
                    // Update performance stats
                    performanceStats.generationTimes.push(generationTime);
                    if (performanceStats.generationTimes.length > 20) {
                        performanceStats.generationTimes.shift(); // Keep only last 20 measurements
                    }
                    performanceStats.averageGenerationTime = 
                        performanceStats.generationTimes.reduce((a, b) => a + b, 0) / 
                        performanceStats.generationTimes.length;
                    
                    // Cache the result in memory and sessionStorage
                    cleanupCache();
                    thumbnailCache.set(cacheKey, dataUrl);
                    saveCacheToSession(cacheKey, dataUrl);
                    
                    // Remove from pending generations
                    pendingGenerations.delete(cacheKey);
                    
                    resolve(dataUrl);
                },
                reject: (error) => {
                    // Remove from pending generations on error
                    pendingGenerations.delete(cacheKey);
                    reject(error);
                }
            });
            
            // Start processing if not already running
            processQueue();
        });
        
        // Track this pending generation
        pendingGenerations.set(cacheKey, generationPromise);
        
        return generationPromise;
    }
    
    /**
     * Clear thumbnail cache
     */
    function clearCache() {
        // Clear all cache
        thumbnailCache.clear();
        
        // Clear sessionStorage
        try {
            const keysToRemove = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith(window.THUMBNAIL_CACHE_PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => sessionStorage.removeItem(key));
        } catch (error) {
            // Ignore sessionStorage errors
        }
    }
    
    /**
     * Get cache statistics for debugging
     * @returns {Object} Cache stats
     */
    function getCacheStats() {
        return {
            size: thumbnailCache.size,
            maxSize: window.MAX_THUMBNAIL_CACHE_SIZE,
            queueLength: generationQueue.length,
            pendingGenerations: pendingGenerations.size,
            isProcessing: isProcessingQueue,
            performance: {
                totalRequests: performanceStats.totalRequests,
                cacheHits: performanceStats.cacheHits,
                cacheMisses: performanceStats.cacheMisses,
                cacheHitRate: performanceStats.totalRequests > 0 ? 
                    (performanceStats.cacheHits / performanceStats.totalRequests * 100).toFixed(1) + '%' : '0%',
                averageGenerationTime: performanceStats.averageGenerationTime.toFixed(1) + 'ms'
            }
        };
    }
    
    /**
     * Clean up resources
     */
    function cleanup() {
        // Set cleanup flag to prevent new operations
        isCleaningUp = true;
        
        // Clear cache (memory only - keep sessionStorage for next page load)
        thumbnailCache.clear();
        
        // Clear pending generations
        pendingGenerations.clear();
        
        // Reset performance stats
        performanceStats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageGenerationTime: 0,
            generationTimes: []
        };
        
        // Clear queue
        generationQueue.forEach(item => {
            item.reject(new Error('DesmosUtils cleanup called'));
        });
        generationQueue = [];
        isProcessingQueue = false;
        
        // Clear pending generations
        pendingGenerations.forEach(promise => {
            // Promises will be rejected by the queue cleanup above
        });
        pendingGenerations.clear();
        
        // Destroy calculator
        if (hiddenCalculator) {
            try {
                hiddenCalculator.destroy();
                hiddenCalculator = null;
            } catch (error) {
                console.error('Error destroying hidden calculator:', error);
            }
        }
        
        // Remove container
        if (hiddenContainer && hiddenContainer.parentNode) {
            hiddenContainer.parentNode.removeChild(hiddenContainer);
            hiddenContainer = null;
        }
    }
    
    /**
     * Reset cleanup state (for development/testing)
     */
    function reset() {
        isCleaningUp = false;
    }
    
    // Load cache from sessionStorage on initialization
    loadCacheFromSession();
    
    // Expose the public API
    return {
        generateThumbnail,
        getCachedThumbnail,
        clearCache,
        getCacheStats,
        cleanup,
        reset
    };
})();

window.DesmosUtils = DesmosUtils;