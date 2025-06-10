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
     * Adjust font sizes for all tile headers and no-preview elements to prevent wrapping
     * (Exception: no-preview elements allow wrapping when text doesn't fit at minimum size)
     * Called immediately without debouncing for real-time response
     */
    function adjustTileFontSizes() {
        const homePoster = document.querySelector('.tiles-container');
        if (!homePoster) return;

        const tiles = homePoster.querySelectorAll('.concept-tile');
        if (!tiles.length) return;

        const headers = [];
        const noPreviewElements = [];
        
        tiles.forEach(tile => {
            const header = tile.querySelector('.tile-header');
            if (header) {
                headers.push(header);
            }
            
            const noPreview = tile.querySelector('.no-preview');
            if (noPreview) {
                noPreviewElements.push(noPreview);
            }
        });

        // Calculate optimal font size for headers
        if (headers.length > 0) {
            calculateOptimalFontSize(headers, 'header');
        }
        
        // Calculate optimal font size for no-preview elements
        if (noPreviewElements.length > 0) {
            calculateOptimalFontSize(noPreviewElements, 'no-preview');
        }
    }
    
    /**
     * Calculate and apply optimal font size using binary search
     * @param {HTMLElement[]} elements - Array of elements to resize
     * @param {string} elementType - Type of elements ('header' or 'no-preview')
     */
    function calculateOptimalFontSize(elements, elementType = 'header') {
        if (!elements.length) return;

        // Store original styling for each element
        const originalStyling = elements.map(element => {
            const style = window.getComputedStyle(element);
            return {
                paddingLeft: style.paddingLeft,
                fontSize: style.fontSize,
                whiteSpace: style.whiteSpace
            };
        });

        // Apply specific styling based on element type
        if (elementType === 'header') {
            // Double the left padding for headers before search
            elements.forEach((element, i) => {
                const orig = originalStyling[i].paddingLeft;
                let px = parseFloat(orig);
                if (!isNaN(px)) {
                    element.style.paddingLeft = (2 * px) + 'px';
                }
            });
        } else if (elementType === 'no-preview') {
            // For no-preview elements, ensure they have some padding and center alignment
            elements.forEach(element => {
                element.style.padding = '8px';
                element.style.textAlign = 'center';
            });
        }

        // Reset font size to a reasonable value before starting
        elements.forEach(element => {
            element.style.fontSize = '16px';
            element.style.whiteSpace = 'nowrap';
        });

        // Debug logging for specific elements if needed
        let debugElement = null;
        if (elementType === 'header') {
            for (const element of elements) {
                if (element.textContent && element.textContent.trim().toLowerCase() === 'absolute value') {
                    debugElement = element;
                    break;
                }
            }
        } else if (elementType === 'no-preview') {
            // Debug the first no-preview element
            debugElement = elements[0];
        }

        // Use different size ranges based on element type
        let low, high;
        if (elementType === 'no-preview') {
            // Smaller range for no-preview elements since they're in a preview area
            low = 8;
            high = 32;
        } else {
            // Original range for headers
            low = 4;
            high = 64;
        }
        
        let best = low;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            elements.forEach(element => {
                element.style.fontSize = mid + 'px';
            });
            void elements[0].offsetWidth;
            
            const anyWraps = elements.some(element => {
                return element.scrollWidth > element.clientWidth;
            });
            
            if (debugElement) {
                const style = window.getComputedStyle(debugElement);
                const rect = debugElement.getBoundingClientRect();
                const text = debugElement.textContent;
                const textLen = text ? text.length : 0;
                console.log(`[FontSizer][${elementType.toUpperCase()}][DEBUG] fontSize: ${mid}px, text: '${text}', textLen: ${textLen}, clientWidth: ${debugElement.clientWidth}, scrollWidth: ${debugElement.scrollWidth}, clientHeight: ${debugElement.clientHeight}, scrollHeight: ${debugElement.scrollHeight}, boundingRect:`, rect, 'computedStyle:', style);
            }
            
            if (!anyWraps) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        
        // Apply final font size
        elements.forEach(element => {
            element.style.fontSize = best + 'px';
            
            // For no-preview elements, check if text fits at minimum size
            // If not, allow wrapping for better readability on small tiles
            if (elementType === 'no-preview' && best <= 8) {
                // Check if text still doesn't fit at minimum size
                element.style.whiteSpace = 'nowrap';
                // Force layout update
                void element.offsetWidth;
                
                if (element.scrollWidth > element.clientWidth) {
                    // Text doesn't fit even at minimum size, allow wrapping and reduce padding
                    element.style.whiteSpace = 'normal';
                    element.style.lineHeight = '1.1';
                    element.style.wordBreak = 'break-word';
                    element.style.padding = '2px'; // Minimal padding for very small tiles
                } else {
                    // Text fits, keep nowrap and original padding
                    element.style.whiteSpace = 'nowrap';
                }
            } else {
                // For headers and larger no-preview elements, always prevent wrapping
                element.style.whiteSpace = 'nowrap';
            }
        });
        
        if (debugElement) {
            const style = window.getComputedStyle(debugElement);
            const rect = debugElement.getBoundingClientRect();
            const text = debugElement.textContent;
            const textLen = text ? text.length : 0;
            console.log(`[FontSizer][${elementType.toUpperCase()}][FINAL][DEBUG] fontSize: ${best}px, text: '${text}', textLen: ${textLen}, clientWidth: ${debugElement.clientWidth}, scrollWidth: ${debugElement.scrollWidth}, clientHeight: ${debugElement.clientHeight}, scrollHeight: ${debugElement.scrollHeight}, boundingRect:`, rect, 'computedStyle:', style);
        }

        // Restore original styling (except font size and optimized wrapping/padding)
        elements.forEach((element, i) => {
            if (elementType === 'header') {
                element.style.paddingLeft = originalStyling[i].paddingLeft;
            }
            // For no-preview elements, restore original padding if wrapping isn't enabled
            if (elementType === 'no-preview' && element.style.whiteSpace === 'nowrap') {
                element.style.padding = '8px'; // Restore original padding for larger tiles
            }
            // Keep the computed font size and whiteSpace settings
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
