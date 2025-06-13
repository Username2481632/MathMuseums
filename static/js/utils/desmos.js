/**
 * Desmos Utilities - Optimized Thumbnail Generation
 * Provides utilities for working with Desmos calculator states and thumbnails
 */
console.log('DesmosUtils module loading...');
const DesmosUtils = (function() {
    // Private variables
    let hiddenCalculator = null;
    let hiddenContainer = null;
    
    // Thumbnail cache for avoiding redundant generation
    const thumbnailCache = new Map();
    const MAX_CACHE_SIZE = 50; // Limit cache size to prevent memory issues
    const GENERATION_DELAY = 100; // Reduced delay for faster generation
    
    // Queue management for batch processing
    let generationQueue = [];
    let isProcessingQueue = false;
    
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
        if (!str) return 'empty';
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
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
                thumbnailCache.delete(keys[i]);
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
            // Process up to 3 thumbnails in parallel for better performance
            const batch = generationQueue.splice(0, 3);
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
            // Initialize hidden calculator
            const calculator = await initHiddenCalculator();
            
            // Parse the state
            const state = JSON.parse(stateString);
            
            // Set the calculator state
            calculator.setState(state);
            
            // Reduced wait time for better performance
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Capture the screenshot with optimized settings
            const dataUrl = calculator.screenshot({
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
            
            return dataUrl;
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * Generate a thumbnail from a Desmos state (optimized with caching)
     * @param {string} stateString - Stringified Desmos state
     * @returns {Promise<string>} Resolves with data URL of the thumbnail
     */
    async function generateThumbnail(stateString) {
        const startTime = performance.now();
        performanceStats.totalRequests++;
        
        // Generate cache key from state
        const cacheKey = simpleHash(stateString);
        
        // Check cache first
        if (thumbnailCache.has(cacheKey)) {
            performanceStats.cacheHits++;
            const endTime = performance.now();
            console.log(`Thumbnail cache hit for ${cacheKey} (${(endTime - startTime).toFixed(1)}ms)`);
            return Promise.resolve(thumbnailCache.get(cacheKey));
        }
        
        performanceStats.cacheMisses++;
        
        // Add to queue and return promise
        return new Promise((resolve, reject) => {
            generationQueue.push({
                stateString,
                startTime,
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
                    
                    console.log(`Thumbnail generated for ${cacheKey} (${generationTime.toFixed(1)}ms)`);
                    
                    // Cache the result
                    cleanupCache();
                    thumbnailCache.set(cacheKey, dataUrl);
                    resolve(dataUrl);
                },
                reject
            });
            
            // Start processing if not already running
            processQueue();
        });
    }
    
    /**
     * Clear thumbnail cache (useful when concepts are updated)
     * @param {string} conceptId - Optional specific concept to clear
     */
    function clearCache(conceptId = null) {
        if (conceptId) {
            // Find and remove cache entries for specific concept
            // Since we can't easily map conceptId to cache keys, we clear all
            // This could be optimized in the future with a concept-to-hash mapping
            thumbnailCache.clear();
        } else {
            thumbnailCache.clear();
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
        // Clear cache
        thumbnailCache.clear();
        
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
    
    // Expose the public API
    return {
        generateThumbnail,
        clearCache,
        getCacheStats,
        cleanup
    };
})();

window.DesmosUtils = DesmosUtils;

// Add a global debug function for easy console access
window.debugThumbnails = function() {
    console.log('=== Thumbnail Generation Debug Info ===');
    console.log(DesmosUtils.getCacheStats());
};