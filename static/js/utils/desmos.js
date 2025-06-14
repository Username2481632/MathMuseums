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
    const MAX_CACHE_SIZE = 50; // Limit cache size to prevent memory issues
    const GENERATION_DELAY = 100; // Reduced delay for faster generation
    const SESSION_CACHE_PREFIX = 'thumb_';
    
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
                if (key && key.startsWith(SESSION_CACHE_PREFIX)) {
                    const hash = key.substring(SESSION_CACHE_PREFIX.length);
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
            sessionStorage.setItem(SESSION_CACHE_PREFIX + hash, dataUrl);
        } catch (error) {
            // SessionStorage full or unavailable - continue with memory cache only
            console.warn('SessionStorage unavailable, using memory cache only:', error);
        }
    }
    
    /**
     * Clean up old cache entries when cache is full
     */
    function cleanupCache() {
        if (thumbnailCache.size >= MAX_CACHE_SIZE) {
            // Remove oldest entries (first quarter of cache)
            const entriesToRemove = Math.floor(MAX_CACHE_SIZE / 4);
            const keys = Array.from(thumbnailCache.keys());
            for (let i = 0; i < entriesToRemove; i++) {
                const hash = keys[i];
                thumbnailCache.delete(hash);
                
                // Also remove from sessionStorage
                try {
                    sessionStorage.removeItem(SESSION_CACHE_PREFIX + hash);
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
                
                // Wait for initialization with shorter timeout
                setTimeout(() => {
                    resolve(hiddenCalculator);
                }, 50); // Reduced from 100ms
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
                }, GENERATION_DELAY);
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
        console.log('🖼️ generateThumbnailDirect() called at:', new Date().toISOString());
        
        // Check if DesmosUtils is being cleaned up
        if (isCleaningUp) {
            throw new Error('DesmosUtils is being cleaned up, cannot generate thumbnail');
        }
        
        if (!stateString) {
            console.log('🖼️ No state string provided - creating blank state');
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
            // Parse and log the state being used for thumbnail generation
            const parsedState = JSON.parse(stateString);
            const expressions = parsedState?.expressions?.list || [];
            const latexExpressions = expressions
                .filter(expr => expr.type === 'expression' && expr.latex)
                .map(expr => expr.latex);
            
            console.log('🖼️ Thumbnail generation state analysis:', {
                stateLength: stateString.length,
                expressionCount: expressions.length,
                latexExpressions: latexExpressions,
                hasLatex: latexExpressions.length > 0,
                firstExpression: latexExpressions[0] || 'none',
                viewport: parsedState?.graph?.viewport || null
            });
            
            // Initialize hidden calculator
            const calculator = await initHiddenCalculator();
            
            // Check again if cleanup started while we were initializing
            if (isCleaningUp) {
                throw new Error('DesmosUtils cleanup started during initialization');
            }
            
            console.log('🖼️ Setting calculator state...');
            
            // Clear any existing state first to prevent contamination
            calculator.setState({
                version: 11,
                randomSeed: "",
                graph: { viewport: { xmin: -10, ymin: -10, xmax: 10, ymax: 10 } },
                expressions: { list: [] }
            });
            
            // Small delay to ensure state is cleared
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Set the actual calculator state
            calculator.setState(parsedState);
            
            // Log the state that was actually set
            const actualSetState = calculator.getState();
            const actualExpressions = actualSetState?.expressions?.list || [];
            const actualLatexExpressions = actualExpressions
                .filter(expr => expr.type === 'expression' && expr.latex)
                .map(expr => expr.latex);
            
            console.log('🖼️ State verification after setState():', {
                actualExpressionCount: actualExpressions.length,
                actualLatexExpressions: actualLatexExpressions,
                stateMatches: JSON.stringify(actualSetState) === stateString,
                actualFirstExpression: actualLatexExpressions[0] || 'none'
            });
            
            // Increased wait time to ensure calculator fully processes the new state
            console.log('🖼️ Waiting 300ms for calculator to settle...');
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Final check before screenshot
            if (isCleaningUp) {
                throw new Error('DesmosUtils cleanup started before screenshot');
            }
            
            console.log('🖼️ Taking screenshot...');
            
            // Capture the screenshot with optimized settings
            let dataUrl;
            try {
                dataUrl = calculator.screenshot({
                    width: 250,
                    height: 200,
                    targetPixelRatio: 1.25, // Slightly reduced for better performance
                    preserveAxisNumbers: false,
                    mathBounds: {
                        left: -10,
                        right: 10,
                        bottom: -10,
                        top: 10
                    }
                });
                
                console.log('🖼️ Screenshot captured successfully:', {
                    dataUrlLength: dataUrl?.length || 0,
                    isValidDataUrl: dataUrl?.startsWith('data:') || false,
                    timestamp: new Date().toISOString()
                });
            } catch (screenshotError) {
                console.error('🖼️ Screenshot error:', screenshotError);
                if (screenshotError.message && screenshotError.message.includes('destroyed')) {
                    throw new Error('Calculator instance was destroyed during screenshot');
                }
                throw screenshotError;
            }
            
            // Validate the returned dataUrl
            if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
                console.error('🖼️ Invalid screenshot data returned:', {
                    dataUrl: dataUrl,
                    type: typeof dataUrl,
                    length: dataUrl?.length || 0
                });
                throw new Error('Invalid screenshot data returned from Desmos');
            }
            
            console.log('🖼️ Thumbnail generation completed successfully');
            return dataUrl;
        } catch (error) {
            console.error('🖼️ Thumbnail generation failed:', error);
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
            const dataUrl = sessionStorage.getItem(SESSION_CACHE_PREFIX + cacheKey);
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
        
        console.log('🎯 generateThumbnail() called:', {
            conceptId: conceptId,
            stateLength: stateString?.length || 0,
            timestamp: new Date().toISOString(),
            cacheKey: simpleHash(stateString)
        });
        
        // Generate cache key from state only (conceptId is irrelevant for caching)
        const cacheKey = simpleHash(stateString);
        
        // Check cache first
        if (thumbnailCache.has(cacheKey)) {
            performanceStats.cacheHits++;
            const endTime = performance.now();
            console.log('🎯 Cache hit for concept:', conceptId, 'in', (endTime - startTime).toFixed(2), 'ms');
            return Promise.resolve(thumbnailCache.get(cacheKey));
        }
        
        // Check sessionStorage as fallback
        try {
            const dataUrl = sessionStorage.getItem(SESSION_CACHE_PREFIX + cacheKey);
            if (dataUrl) {
                // Add back to memory cache for faster future access
                thumbnailCache.set(cacheKey, dataUrl);
                performanceStats.cacheHits++;
                const endTime = performance.now();
                console.log('🎯 Session cache hit for concept:', conceptId, 'in', (endTime - startTime).toFixed(2), 'ms');
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
     * Clear thumbnail cache (useful when concepts are updated)
     * @param {string} conceptId - Ignored - cache is now state-based only
     */
    function clearCache(conceptId = null) {
        if (conceptId) {
            console.log('🧹 Concept-specific cache clearing is no longer needed - cache is state-based');
            // No-op: since cache is now purely state-based, 
            // we don't need concept-specific clearing anymore
            return;
        } else {
            console.log('🧹 Clearing ALL cache entries');
            // Clear all cache
            thumbnailCache.clear();
            
            // Clear sessionStorage
            try {
                const keysToRemove = [];
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key && key.startsWith(SESSION_CACHE_PREFIX)) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => sessionStorage.removeItem(key));
            } catch (error) {
                // Ignore sessionStorage errors
            }
        }
    }
    
    /**
     * Get cache statistics for debugging
     * @returns {Object} Cache stats
     */
    function getCacheStats() {
        return {
            size: thumbnailCache.size,
            maxSize: MAX_CACHE_SIZE,
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

window.DesmosUtils = DesmosUtils;    // Add a global debug function for easy console access
    window.debugThumbnails = function() {
        return DesmosUtils.getCacheStats();
    };