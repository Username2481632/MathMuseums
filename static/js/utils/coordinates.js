/**
 * Simple Tile-Center-Based Coordinate System
 * Stores tile center positions and sizes as percentages of container dimensions
 */
const CoordinateUtils = (function() {
    
    /**
     * Convert pixel coordinates to simple percentage coordinates
     * @param {number} pixelX - Tile top-left X in pixels
     * @param {number} pixelY - Tile top-left Y in pixels
     * @param {number} tileWidth - Tile width in pixels
     * @param {number} tileHeight - Tile height in pixels
     * @param {number} containerWidth - Container width in pixels
     * @param {number} containerHeight - Container height in pixels
     * @returns {Object} {centerX, centerY, width, height} as percentages (0-100)
     */
    function pixelsToPercentage(pixelX, pixelY, tileWidth, tileHeight, containerWidth, containerHeight) {
        // Calculate tile center in pixels
        const centerPixelX = pixelX + (tileWidth / 2);
        const centerPixelY = pixelY + (tileHeight / 2);
        
        // Convert to simple percentages of container dimensions
        const centerX = (centerPixelX / containerWidth) * 100;
        const centerY = (centerPixelY / containerHeight) * 100;
        const width = (tileWidth / containerWidth) * 100;
        const height = (tileHeight / containerHeight) * 100;
        
        return { centerX, centerY, width, height };
    }

    /**
     * Convert simple percentage coordinates to pixel coordinates
     * @param {number} centerX - Center X as percentage (0-100)
     * @param {number} centerY - Center Y as percentage (0-100)
     * @param {number} width - Width as percentage (0-100)
     * @param {number} height - Height as percentage (0-100)
     * @param {number} containerWidth - Container width in pixels
     * @param {number} containerHeight - Container height in pixels
     * @returns {Object} {x, y, width, height} in pixels (top-left based)
     */
    function percentageToPixels(centerX, centerY, width, height, containerWidth, containerHeight) {
        // Convert percentages to pixels
        const centerPixelX = (centerX / 100) * containerWidth;
        const centerPixelY = (centerY / 100) * containerHeight;
        const pixelWidth = (width / 100) * containerWidth;
        const pixelHeight = (height / 100) * containerHeight;
        
        // Calculate top-left position from center
        const x = centerPixelX - (pixelWidth / 2);
        const y = centerPixelY - (pixelHeight / 2);
        
        return { x, y, width: pixelWidth, height: pixelHeight };
    }
    
    /**
     * Constrain tile center coordinates to keep tile within container bounds
     * @param {number} centerX - Center X percentage
     * @param {number} centerY - Center Y percentage  
     * @param {number} width - Width percentage
     * @param {number} height - Height percentage
     * @returns {Object} Constrained coordinates
     */
    function constrainCoordinates(centerX, centerY, width, height) {
        // Calculate the bounds for the center position
        const minCenterX = width / 2;  // Half tile width from left edge
        const maxCenterX = 100 - (width / 2);  // Half tile width from right edge
        const minCenterY = height / 2;  // Half tile height from top edge
        const maxCenterY = 100 - (height / 2);  // Half tile height from bottom edge
        
        const constrainedCenterX = Math.max(minCenterX, Math.min(maxCenterX, centerX));
        const constrainedCenterY = Math.max(minCenterY, Math.min(maxCenterY, centerY));
        
        return {
            centerX: constrainedCenterX,
            centerY: constrainedCenterY,
            width,
            height
        };
    }
    
    // Public API
    return {
        pixelsToPercentage,
        percentageToPixels,
        constrainCoordinates
    };
})();

// Expose CoordinateUtils globally
if (typeof window !== 'undefined') {
    window.CoordinateUtils = CoordinateUtils;
}
