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
        const homePoster = document.querySelector('.tiles-container');
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

        // Store original left padding for each header
        const originalLeftPaddings = headers.map(header => {
            const style = window.getComputedStyle(header);
            return style.paddingLeft;
        });

        // Double the left padding before search
        headers.forEach((header, i) => {
            const orig = originalLeftPaddings[i];
            // If value is in px, double it; otherwise, fallback to computed value
            let px = parseFloat(orig);
            if (!isNaN(px)) {
                header.style.paddingLeft = (2 * px) + 'px';
            }
        });

        // Reset font size to a reasonable value before starting
        headers.forEach(header => {
            header.style.fontSize = '16px';
        });
        headers.forEach(header => {
            header.style.whiteSpace = 'nowrap';
        });
        let absHeader = null;
        for (const header of headers) {
            if (header.textContent && header.textContent.trim().toLowerCase() === 'absolute value') {
                absHeader = header;
                break;
            }
        }
        let low = 4;
        let high = 64;
        let best = 4;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            headers.forEach(header => {
                header.style.fontSize = mid + 'px';
            });
            void headers[0].offsetWidth;
            const anyWraps = headers.some(header => {
                return header.scrollWidth > header.clientWidth;
            });
            if (absHeader) {
                const style = window.getComputedStyle(absHeader);
                const absRect = absHeader.getBoundingClientRect();
                const text = absHeader.textContent;
                const textLen = text ? text.length : 0;
                console.log(`[FontSizer][ABS][DEBUG] fontSize: ${mid}px, text: '${text}', textLen: ${textLen}, clientWidth: ${absHeader.clientWidth}, scrollWidth: ${absHeader.scrollWidth}, clientHeight: ${absHeader.clientHeight}, scrollHeight: ${absHeader.scrollHeight}, boundingRect:`, absRect, 'computedStyle:', style);
            }
            if (!anyWraps) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        headers.forEach(header => {
            header.style.fontSize = best + 'px';
            header.style.whiteSpace = 'nowrap';
        });
        if (absHeader) {
            const style = window.getComputedStyle(absHeader);
            const absRect = absHeader.getBoundingClientRect();
            const text = absHeader.textContent;
            const textLen = text ? text.length : 0;
            console.log(`[FontSizer][ABS][FINAL][DEBUG] fontSize: ${best}px, text: '${text}', textLen: ${textLen}, clientWidth: ${absHeader.clientWidth}, scrollWidth: ${absHeader.scrollWidth}, clientHeight: ${absHeader.clientHeight}, scrollHeight: ${absHeader.scrollHeight}, boundingRect:`, absRect, 'computedStyle:', style);
        }

        // Restore original left padding
        headers.forEach((header, i) => {
            header.style.paddingLeft = originalLeftPaddings[i];
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
