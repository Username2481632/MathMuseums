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
        'inverse',
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
            case 'inverse': return 'Inverse';
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
