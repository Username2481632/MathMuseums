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
     * @returns {Object} New concept object
     */
    function createConcept(type) {
        if (!CONCEPT_TYPES.includes(type)) {
            console.error(`Invalid concept type: ${type}`);
            return null;
        }
        
        return {
            id: type,
            type: type,
            displayName: getDisplayName(type),
            position: { x: 0, y: 0 },
            size: { width: 250, height: 200 }, // Default size
            description: '',
            isComplete: false,
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
        return CONCEPT_TYPES.map(type => createConcept(type));
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
    
    // Public API
    return {
        CONCEPT_TYPES,
        createConcept,
        updateConcept,
        createAllConcepts,
        hasImage,
        getDisplayName
    };
})();
