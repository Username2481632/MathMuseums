/**
 * Font Sizer Utility
 * Handles font size adjustment for tile titles on every tile render.
 * Window resize triggers tile re-rendering, which calls this utility.
 */
const FontSizer = (function() {
    let isInitialized = false;
    
    /**
     * Initialize the font sizer (no event listeners needed)
     * Font sizing now happens exclusively on tile renders for consistency
     */
    function init() {
        if (isInitialized) return;
        
        // No event listeners needed - all font sizing triggered by tile renders:
        // - Window resize → tile re-render → FontSizer.forceAdjustment()
        // - Container size changes → tile re-render → FontSizer.forceAdjustment()
        // - Manual tile resize → FontSizer.forceAdjustment() (during resize)
        
        isInitialized = true;
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
     * Measure text width in an unconstrained environment (fixes layout interference)
     */
    function measureTextWidth(text, fontSize, fontFamily, fontWeight) {
        const measurer = document.createElement('span');
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            white-space: nowrap;
            font-size: ${fontSize}px;
            font-family: ${fontFamily || 'inherit'};
            font-weight: ${fontWeight || 'normal'};
            visibility: hidden;
            pointer-events: none;
        `;
        measurer.textContent = text;
        document.body.appendChild(measurer);
        
        const width = measurer.offsetWidth;
        document.body.removeChild(measurer);
        return width;
    }

    /**
     * Calculate and apply optimal font size using binary search with accurate text measurement
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
                whiteSpace: style.whiteSpace,
                fontFamily: style.fontFamily,
                fontWeight: style.fontWeight
            };
        });

        // Reset font size to a reasonable value before starting
        elements.forEach(element => {
            element.style.fontSize = '16px';
            element.style.whiteSpace = 'nowrap';
        });

        // Use proper binary search with NO artificial bounds
        // Start from container-based reasonable range and let it find the true limits
        const containerWidths = elements.map(el => el.clientWidth);
        const minContainerWidth = Math.min(...containerWidths);
        
        // Dynamic range based on actual container - no arbitrary caps
        let low = 4;  // Absolute minimum for any text
        let high = Math.floor(minContainerWidth); // Could theoretically fit 1 character at container width
        
        let best = low;
        
        // Binary search to find largest font that fits
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            
            const anyTooBig = elements.some(element => {
                const text = element.textContent.trim();
                if (!text) return false;
                
                const style = originalStyling[elements.indexOf(element)];
                const textWidth = measureTextWidth(text, mid, style.fontFamily, style.fontWeight);
                
                // Get actual computed padding that scales with CSS variables and viewport
                const computedStyle = window.getComputedStyle(element);
                const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
                const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
                const availableWidth = element.clientWidth - paddingLeft - paddingRight;
                
                return textWidth > availableWidth;
            });
            
            if (!anyTooBig) {
                best = mid;
                low = mid + 1;  // Try larger
            } else {
                high = mid - 1; // Try smaller
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
    }
    
    /**
     * Force immediate font size adjustment (useful for programmatic calls)
     */
    function forceAdjustment() {
        adjustTileFontSizes();
    }
    
    /**
     * Cleanup - no event listeners to remove
     */
    function cleanup() {
        // No event listeners to remove since all font sizing is triggered by tile renders
        
        isInitialized = false;
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
