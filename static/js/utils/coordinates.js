/**
 * Coordinate System Utilities
 * Handles conversion between percentage-based proportional anchor coordinates and pixel-based top-left coordinates
 */
const CoordinateUtils = (function() {
    
/**
 * Convert from top-left tile coordinates (pixelX, pixelY) to 
 * anchor percentages (anchorX%, anchorY%) in the bounding box.
 *
 * Forward was: pixelX = (anchorX/100) * (containerWidth - tilePixelWidth)
 *
 * Therefore invert:
 *   anchorX = pixelX / (containerWidth - tilePixelWidth) * 100
 *   anchorY = pixelY / (containerHeight - tilePixelHeight) * 100
 *
 * @param {number} pixelX           - The tile's current top-left x in px.
 * @param {number} pixelY           - The tile's current top-left y in px.
 * @param {number} tilePixelWidth   - The tile’s width in pixels (read from DOM).
 * @param {number} tilePixelHeight  - The tile’s height in pixels (read from DOM).
 * @param {number} containerWidth   - The container’s width in px.
 * @param {number} containerHeight  - The container’s height in px.
 * @returns {Object} 
 *   { anchorX: number, anchorY: number } 
 *   where each is clamped to [0, 100].
 */
function pixelsToPercentage(
  pixelX, 
  pixelY, 
  tilePixelWidth, 
  tilePixelHeight, 
  containerWidth, 
  containerHeight
) {
  // Avoid division by zero:
  const availableX = containerWidth  - tilePixelWidth;
  const availableY = containerHeight - tilePixelHeight;
  
  let anchorX, anchorY;

  if (availableX <= 0) {
    // If the tile is bigger than (or exactly) the container in X,
    // we’ll just pin anchorX to 0 (or you could decide 50 or 100).
    anchorX = 0;
  } else {
    anchorX = (pixelX / availableX) * 100;
  }

  if (availableY <= 0) {
    anchorY = 0;
  } else {
    anchorY = (pixelY / availableY) * 100;
  }
  
  // Clamp to [0..100]
  anchorX = Math.min(100, Math.max(0, anchorX));
  anchorY = Math.min(100, Math.max(0, anchorY));

  return { anchorX, anchorY };
}

    
    /**
     * Convert from percentage coordinates (proportional anchor-based) to pixel coordinates (top-left)
     * @param {number} anchorX - Anchor X position as percentage of container width
     * @param {number} anchorY - Anchor Y position as percentage of container height
     * @param {number} width - Width as percentage of base size
     * @param {number} height - Height as percentage of base size
     * @param {number} containerWidth - Container width in pixels
     * @param {number} containerHeight - Container height in pixels
     * @returns {Object} Pixel-based coordinates {x, y, width, height}
     */
    function percentageToPixels(anchorX, anchorY, width, height, containerWidth, containerHeight) {
        const baseSize = Math.max(containerWidth, containerHeight);

        // Calculate tile pixel size from percentages and baseSize
        const pixelWidth = (width / 100) * baseSize;
        const pixelHeight = (height / 100) * baseSize;
        
        console.log('percentageToPixels debug:');
        console.log('  Input %: width=', width, 'height=', height);
        console.log('  Container:', containerWidth, 'x', containerHeight);
        console.log('  BaseSize:', baseSize);
        console.log('  Calculated pixels:', pixelWidth, 'x', pixelHeight);

        // Anchor pixel position in container
        const anchorPixelX = (anchorX / 100) * containerWidth;
        const anchorPixelY = (anchorY / 100) * containerHeight;

        // Relative center position of tile anchor in container (0 to 1)
        const relativeCenterX = anchorPixelX / containerWidth;
        const relativeCenterY = anchorPixelY / containerHeight;

        // Anchor offset inside tile (based on proportional center)
        const anchorOffsetX = relativeCenterX * pixelWidth;
        const anchorOffsetY = relativeCenterY * pixelHeight;

        // Compute top-left pixel coords of tile
        const x = anchorPixelX - anchorOffsetX;
        const y = anchorPixelY - anchorOffsetY;

        return { x, y, width: pixelWidth, height: pixelHeight };
    }

    
    /**
     * Get the base size (min of width and height) for a container
     * @param {number} containerWidth - Container width in pixels
     * @param {number} containerHeight - Container height in pixels
     * @returns {number} Base size for percentage calculations
     */
    function getBaseSize(containerWidth, containerHeight) {
        return Math.max(containerWidth, containerHeight);
    }
    
    /**
     * Scale percentage coordinates for aspect ratio changes
     * @param {number} anchorX - Anchor X position as percentage
     * @param {number} anchorY - Anchor Y position as percentage
     * @param {number} width - Width as percentage
     * @param {number} height - Height as percentage
     * @param {number} scaleFactor - Scaling factor to apply
     * @returns {Object} Scaled coordinates {anchorX, anchorY, width, height}
     */
    function scalePercentageCoordinates(anchorX, anchorY, width, height, scaleFactor) {
        return {
            anchorX: anchorX * scaleFactor,
            anchorY: anchorY * scaleFactor,
            width: width * scaleFactor,
            height: height * scaleFactor
        };
    }
    
    /**
     * Get the valid coordinate limits for anchor-based coordinates
     * The anchor point itself should never exceed the container boundaries
     * @param {number} aspectRatioWidth - Aspect ratio width component
     * @param {number} aspectRatioHeight - Aspect ratio height component
     * @param {number} tileWidth - Tile width as percentage of base size (optional, unused for anchor limits)
     * @param {number} tileHeight - Tile height as percentage of base size (optional, unused for anchor limits)
     * @returns {Object} Coordinate limits {minX, maxX, minY, maxY}
     */
    function getCoordinateLimits(aspectRatioWidth, aspectRatioHeight, tileWidth = 0, tileHeight = 0) {
        // For anchor-based coordinates, the anchor point should simply stay within 
        // the container boundaries (0-100% of container width/height)
        return {
            minX: 0,
            maxX: 100,
            minY: 0,
            maxY: 100
        };
    }
    
    /**
     * Constrain coordinates to valid limits (anchor-based)
     * @param {number} anchorX - Anchor X position as percentage
     * @param {number} anchorY - Anchor Y position as percentage
     * @param {number} width - Width as percentage
     * @param {number} height - Height as percentage
     * @param {Object} limits - Coordinate limits from getCoordinateLimits()
     * @returns {Object} Constrained coordinates {anchorX, anchorY, width, height}
     */
    function constrainCoordinates(anchorX, anchorY, width, height, limits) {
        // Simply constrain the anchor point to stay within the container boundaries
        const constrainedAnchorX = Math.max(limits.minX, Math.min(limits.maxX, anchorX));
        const constrainedAnchorY = Math.max(limits.minY, Math.min(limits.maxY, anchorY));
        
        return {
            anchorX: constrainedAnchorX,
            anchorY: constrainedAnchorY,
            width,
            height
        };
    }
    
    // Public API
    return {
        pixelsToPercentage,
        percentageToPixels,
        getBaseSize,
        scalePercentageCoordinates,
        getCoordinateLimits,
        constrainCoordinates
    };
})();

// Expose CoordinateUtils globally
if (typeof window !== 'undefined') {
    window.CoordinateUtils = CoordinateUtils;
}
