/**
 * Font Sizer Utility
 * Handles real-time font size adjustment for tile titles based on window resizing
 */
const FontSizer = (function() {
    let isInitialized = false;
    
    /**
     * Initialize the font sizer with window resize listener
     */
    function init() {
        if (isInitialized) return;
        
        // Listen for window resize events - no debouncing for real-time response
        window.addEventListener('resize', adjustTileFontSizes);
        
        // Listen for container size changes (for aspect ratio changes)
        document.addEventListener('containerSized', adjustTileFontSizes);
        
        isInitialized = true;
        console.log('FontSizer initialized with real-time resizing');
    }
    
    /**
     * Adjust font sizes for all tile headers to prevent wrapping
     * Called immediately without debouncing for real-time response
     */
    function adjustTileFontSizes() {
        const homePoster = document.querySelector('#home-poster');
        if (!homePoster) return;
        
        const tiles = homePoster.querySelectorAll('.concept-tile');
        if (!tiles.length) return;
        
        const headers = [];
        tiles.forEach(tile => {
            const header = tile.querySelector('.tile-header');
            if (header) {
                headers.push(header);
            }
        });
        
        if (headers.length === 0) return;
        
        // Calculate optimal font size immediately - no requestAnimationFrame delay
        calculateOptimalFontSize(headers);
    }
    
    /**
     * Calculate and apply optimal font size using binary search
     * @param {HTMLElement[]} headers - Array of tile header elements
     */
    function calculateOptimalFontSize(headers) {
        if (!headers.length) return;
        
        // Binary search for max font size that fits all headers in one line
        let low = 4;   // Minimum font size
        let high = 64; // Maximum font size
        let best = 4;  // Best font size found
        
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            
            // Apply test font size to all headers
            headers.forEach(header => {
                header.style.fontSize = mid + 'px';
            });
            
            // Force reflow to get accurate measurements
            void headers[0].offsetWidth;
            
            // Check if any header wraps (scrollWidth > clientWidth indicates wrapping)
            const anyWraps = headers.some(header => 
                header.scrollWidth > header.clientWidth
            );
            
            if (!anyWraps) {
                // This font size works, try a larger one
                best = mid;
                low = mid + 1;
            } else {
                // This font size causes wrapping, try a smaller one
                high = mid - 1;
            }
        }
        
        // Apply the best font size found
        headers.forEach(header => {
            header.style.fontSize = best + 'px';
        });
    }
    
    /**
     * Force immediate font size adjustment (useful for programmatic calls)
     */
    function forceAdjustment() {
        adjustTileFontSizes();
    }
    
    /**
     * Cleanup - remove event listeners
     */
    function cleanup() {
        window.removeEventListener('resize', adjustTileFontSizes);
        document.removeEventListener('containerSized', adjustTileFontSizes);
        
        isInitialized = false;
        console.log('FontSizer cleaned up');
    }
    
    // Public API
    return {
        init,
        forceAdjustment,
        cleanup
    };
})();

// Export for use in other modules
window.FontSizer = FontSizer;
