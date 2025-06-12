/**
 * Concept Model
 * Represents a mathematical concept in the application
 */
const ConceptModel = (function() {
    // List of predefined concept types
    const CONCEPT_TYPES = [
        'linear',
        'quadratic',
        'cubic',
        'square-root',
        'cube-root',
        'absolute-value',
        'rational',
        'exponential',
        'logarithmic',
        'trigonometric',
        'piecewise'
    ];
    
    /**
     * Get the display name for a concept type
     * @param {string} type - Concept type
     * @returns {string} Human-readable name
     */
    function getDisplayName(type) {
        switch (type) {
            case 'linear': return 'Linear';
            case 'quadratic': return 'Quadratic';
            case 'cubic': return 'Cubic';
            case 'square-root': return 'Square Root';
            case 'cube-root': return 'Cube Root';
            case 'absolute-value': return 'Absolute Value';
            case 'rational': return 'Rational/Inverse';
            case 'exponential': return 'Exponential';
            case 'logarithmic': return 'Logarithmic';
            case 'trigonometric': return 'Trigonometric';
            case 'piecewise': return 'Piecewise';
            default: return 'Unknown';
        }
    }
    
    /**
     * Create a new concept
     * @param {string} type - Concept type
     * @param {number} index - Index for positioning (optional)
     * @returns {Object} New concept object
     */
    function createConcept(type, index = 0) {
        if (!CONCEPT_TYPES.includes(type)) {
            console.error(`Invalid concept type: ${type}`);
            return null;
        }

        return {
            id: type,
            type: type,
            displayName: getDisplayName(type),
            // No coordinates - let the grid layout position new concepts
            // coordinates: undefined,
            // Legacy pixel-based coordinates (for backward compatibility)
            position: { x: 0, y: 0 },
            size: { width: 250, height: 200 },
            description: '',
            desmosState: null,
            lastModified: Date.now()
        };
    }
    
    /**
     * Update a concept
     * @param {Object} concept - Concept to update
     * @param {Object} updates - Properties to update
     * @returns {Object} Updated concept
     */
    function updateConcept(concept, updates) {
        const updatedConcept = {
            ...concept,
            ...updates,
            lastModified: Date.now()
        };
        
        return updatedConcept;
    }
    
    /**
     * Create all predefined concepts
     * @returns {Array} Array of all concept objects
     */
    function createAllConcepts() {
        return CONCEPT_TYPES.map((type, index) => createConcept(type, index));
    }
    
    /**
     * Check if a concept has an image
     * @param {Object} concept - Concept to check
     * @returns {boolean} True if the concept has an image
     */
    function hasImage(concept) {
        if (!concept || !concept.desmosState) {
            return false;
        }
        
        try {
            const state = JSON.parse(concept.desmosState);
            return state && 
                   state.expressions && 
                   state.expressions.list && 
                   state.expressions.list.some(item => item.type === 'image');
        } catch (error) {
            console.error('Error parsing Desmos state:', error);
            return false;
        }
    }
    
    /**
     * Migrate a concept from pixel coordinates to percentage coordinates
     * @param {Object} concept - Concept to migrate
     * @param {number} containerWidth - Container width in pixels
     * @param {number} containerHeight - Container height in pixels
     * @returns {Object} Migrated concept
     */
    function migrateToPercentageCoordinates(concept, containerWidth, containerHeight) {
        // If already has percentage coordinates with anchor points, return as-is
        if (concept.coordinates && 
            concept.coordinates.anchorX !== undefined && 
            concept.coordinates.anchorY !== undefined) {
            return concept;
        }
        
        // If has old center-based coordinates, migrate them to anchor-based
        if (concept.coordinates && 
            concept.coordinates.centerX !== undefined && 
            concept.coordinates.centerY !== undefined) {
            return migrateCenterToAnchorCoordinates(concept, containerWidth, containerHeight);
        }
        
        // Get pixel coordinates from either format
        let pixelX, pixelY, pixelWidth, pixelHeight;
        
        if (concept.x !== undefined && concept.y !== undefined) {
            pixelX = concept.x;
            pixelY = concept.y;
        } else if (concept.position) {
            pixelX = concept.position.x || 0;
            pixelY = concept.position.y || 0;
        } else {
            pixelX = 0;
            pixelY = 0;
        }
        
        if (concept.width !== undefined && concept.height !== undefined) {
            pixelWidth = concept.width;
            pixelHeight = concept.height;
        } else if (concept.size) {
            pixelWidth = concept.size.width || 250;
            pixelHeight = concept.size.height || 200;
        } else {
            pixelWidth = 250;
            pixelHeight = 200;
        }
        
        // Convert to percentage coordinates
        const percentageCoords = window.CoordinateUtils.pixelsToPercentage(
            pixelX, pixelY, pixelWidth, pixelHeight, containerWidth, containerHeight
        );
        
        return updateConcept(concept, {
            coordinates: percentageCoords
        });
    }
    
    /**
     * Migrate from center-based coordinates to anchor-based coordinates
     * @param {Object} concept - Concept with center-based coordinates
     * @param {number} containerWidth - Container width in pixels
     * @param {number} containerHeight - Container height in pixels
     * @returns {Object} Migrated concept with anchor-based coordinates
     */
    function migrateCenterToAnchorCoordinates(concept, containerWidth, containerHeight) {
        const coords = concept.coordinates;
        const baseSize = Math.max(containerWidth, containerHeight);
        
        // Convert to pixel coordinates first to determine the anchor point
        const pixelWidth = (coords.width / 100) * baseSize;
        const pixelHeight = (coords.height / 100) * baseSize;
        const centerPixelX = (coords.centerX / 100) * containerWidth;
        const centerPixelY = (coords.centerY / 100) * containerHeight;
        
        // Calculate top-left position
        const pixelX = centerPixelX - (pixelWidth / 2);
        const pixelY = centerPixelY - (pixelHeight / 2);
        
        // Now convert to anchor-based coordinates using the new system
        const anchorCoords = window.CoordinateUtils.pixelsToPercentage(
            pixelX, pixelY, pixelWidth, pixelHeight, containerWidth, containerHeight
        );
        
        return updateConcept(concept, {
            coordinates: anchorCoords
        });
    }
    
    /**
     * Get simple center-based coordinates for a concept
     * @param {Object} concept - Concept object
     * @returns {Object} Simple center-based coordinates {centerX, centerY, width, height} as percentages (0-100)
     */
    function getCoordinates(concept) {
        // Return simple center-based coordinates or defaults
        if (concept.coordinates && 
            concept.coordinates.centerX !== undefined && 
            concept.coordinates.centerY !== undefined) {
            return {
                centerX: concept.coordinates.centerX || 50,  // Default to center
                centerY: concept.coordinates.centerY || 50,  // Default to center
                width: concept.coordinates.width || 25,     // Default to 25% width
                height: concept.coordinates.height || 20    // Default to 20% height
            };
        }
        
        // If no coordinates, return defaults (center of container)
        return {
            centerX: 50,    // 50% = center horizontally
            centerY: 50,    // 50% = center vertically
            width: 25,      // 25% of container width
            height: 20      // 20% of container height
        };
    }
    
    /**
     * Update coordinates for a concept (simplified)
     * @param {Object} concept - Concept to update
     * @param {Object} coordinates - New coordinates {centerX, centerY, width, height}
     * @returns {Object} Updated concept
     */
    function updateCoordinates(concept, coordinates) {
        return updateConcept(concept, {
            coordinates: {
                centerX: coordinates.centerX,
                centerY: coordinates.centerY,
                width: coordinates.width,
                height: coordinates.height
            }
        });
    }

    // Public API
    return {
        CONCEPT_TYPES,
        createConcept,
        updateConcept,
        createAllConcepts,
        hasImage,
        getDisplayName,
        getCoordinates,
        updateCoordinates
    };
})();

// Expose ConceptModel globally
if (typeof window !== 'undefined') {
    window.ConceptModel = ConceptModel;
}
