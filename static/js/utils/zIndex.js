/**
 * Z-Index Management Utilities
 * Handles tile layering and overlap detection for vertical positioning
 */

const ZIndexManager = (function() {
    // Use a more efficient layering system
    const layerGroups = new Map(); // Map of overlapping tile groups
    let nextLayerId = 1;
    
    /**
     * Check if two rectangular tiles overlap
     * @param {Object} rect1 - {x, y, width, height}
     * @param {Object} rect2 - {x, y, width, height}
     * @returns {boolean} True if rectangles overlap
     */
    function rectanglesOverlap(rect1, rect2) {
        return !(
            rect1.x + rect1.width <= rect2.x ||    // rect1 is to the left of rect2
            rect2.x + rect2.width <= rect1.x ||    // rect2 is to the left of rect1
            rect1.y + rect1.height <= rect2.y ||   // rect1 is above rect2
            rect2.y + rect2.height <= rect1.y      // rect2 is above rect1
        );
    }
    
    /**
     * Get pixel coordinates for a concept
     * @param {Object} concept - Concept with coordinates
     * @param {number} containerWidth - Container width
     * @param {number} containerHeight - Container height
     * @returns {Object} {x, y, width, height} in pixels
     */
    function getConceptPixelRect(concept, containerWidth, containerHeight) {
        const coords = window.ConceptModel.getCoordinates(concept);
        
        const pixelRect = window.CoordinateUtils.percentageToPixels(
            coords.centerX, coords.centerY, coords.width, coords.height,
            containerWidth, containerHeight
        );
        
        return pixelRect;
    }
    
    /**
     * Find all concepts that overlap with a given concept
     * @param {string} targetConceptId - ID of the concept to check
     * @param {Array} allConcepts - All concepts to check against
     * @param {number} containerWidth - Container width
     * @param {number} containerHeight - Container height
     * @returns {Array} Array of concept IDs that overlap with the target
     */
    function findOverlappingConcepts(targetConceptId, allConcepts, containerWidth, containerHeight) {
        const targetConcept = allConcepts.find(c => c.id === targetConceptId);
        if (!targetConcept) {
            return [];
        }
        
        const targetRect = getConceptPixelRect(targetConcept, containerWidth, containerHeight);
        
        const overlapping = [];
        
        for (const concept of allConcepts) {
            if (concept.id === targetConceptId) continue;
            
            const conceptRect = getConceptPixelRect(concept, containerWidth, containerHeight);
            
            if (rectanglesOverlap(targetRect, conceptRect)) {
                overlapping.push(concept.id);
            }
        }
        
        return overlapping;
    }
    
    /**
     * Get the current z-index for a concept, defaulting to auto if not set
     * @param {Object} concept - The concept
     * @returns {number|string} Current z-index or 'auto'
     */
    function getConceptZIndex(concept) {
        return concept.zIndex || 'auto';
    }
    
    /**
     * Clean up z-index assignments by removing unnecessary ones
     * @param {Array} allConcepts - All concepts
     * @param {number} containerWidth - Container width
     * @param {number} containerHeight - Container height
     */
    function cleanupZIndexes(allConcepts, containerWidth, containerHeight) {
        // Find all concepts that have z-index but no longer overlap with anything
        allConcepts.forEach(concept => {
            if (concept.zIndex !== undefined) {
                const overlapping = findOverlappingConcepts(concept.id, allConcepts, containerWidth, containerHeight);
                
                // If no overlaps, remove z-index to return to auto
                if (overlapping.length === 0) {
                    delete concept.zIndex;
                }
            }
        });
        
        // Compact remaining z-indexes to small sequential numbers
        const conceptsWithZIndex = allConcepts.filter(c => c.zIndex !== undefined);
        if (conceptsWithZIndex.length > 0) {
            // Sort by current z-index and reassign compact values
            conceptsWithZIndex.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
            conceptsWithZIndex.forEach((concept, index) => {
                concept.zIndex = index + 1;
            });
        }
    }
    
    /**
     * Bring a concept to the front of its overlapping group
     * @param {string} conceptId - ID of the concept to bring to front
     * @param {Array} allConcepts - All concepts (will be modified)
     * @param {number} containerWidth - Container width
     * @param {number} containerHeight - Container height
     * @returns {boolean} True if z-index was actually changed (visual change occurred)
     */
    function bringConceptToFront(conceptId, allConcepts, containerWidth, containerHeight) {
        // Find the concept
        const conceptIndex = allConcepts.findIndex(c => c.id === conceptId);
        if (conceptIndex === -1) {
            return false;
        }
        
        const concept = allConcepts[conceptIndex];
        
        // Find overlapping concepts
        const overlappingIds = findOverlappingConcepts(conceptId, allConcepts, containerWidth, containerHeight);
        
        // If no overlaps, ensure this concept has no z-index (auto layering)
        if (overlappingIds.length === 0) {
            if (concept.zIndex !== undefined) {
                delete allConcepts[conceptIndex].zIndex;
                return true; // Visual change occurred (removed explicit z-index)
            }
            return false;
        }
        
        // Find the highest z-index among overlapping concepts
        let maxZIndex = 0;
        overlappingIds.forEach(id => {
            const overlapConcept = allConcepts.find(c => c.id === id);
            if (overlapConcept && overlapConcept.zIndex && overlapConcept.zIndex > maxZIndex) {
                maxZIndex = overlapConcept.zIndex;
            }
        });
        
        // Ensure overlapping concepts without z-index get one
        // This is crucial for proper undo behavior
        overlappingIds.forEach(id => {
            const overlapIndex = allConcepts.findIndex(c => c.id === id);
            if (overlapIndex !== -1 && allConcepts[overlapIndex].zIndex === undefined) {
                // Give this overlapped concept a z-index if it doesn't have one
                maxZIndex += 1;
                allConcepts[overlapIndex] = {
                    ...allConcepts[overlapIndex],
                    zIndex: maxZIndex
                };
            }
        });
        
        // Assign this concept a z-index higher than the max
        const newZIndex = maxZIndex + 1;
        
        allConcepts[conceptIndex] = {
            ...allConcepts[conceptIndex],
            zIndex: newZIndex
        };
        
        // Clean up and compact z-indexes periodically
        if (newZIndex > 10) {
            cleanupZIndexes(allConcepts, containerWidth, containerHeight);
        }
        
        return true; // Visual change occurred
    }
    
    /**
     * Apply z-index styles to all tiles in the DOM
     * @param {HTMLElement} container - Container element with tiles
     * @param {Array} concepts - All concepts with their z-index data
     */
    function applyZIndexToTiles(container, concepts) {
        concepts.forEach(concept => {
            const tile = container.querySelector(`[data-id="${concept.id}"]`);
            if (tile) {
                const zIndex = getConceptZIndex(concept);
                if (zIndex === 'auto') {
                    tile.style.zIndex = 'auto';
                } else {
                    tile.style.zIndex = zIndex.toString();
                }
            }
        });
    }
    
    /**
     * Initialize z-index system - no longer needs a counter
     * @param {Array} concepts - All concepts
     */
    function initializeZIndexCounter(concepts) {
        // Clean up any unnecessarily high z-indexes from previous sessions
        concepts.forEach(concept => {
            if (concept.zIndex && concept.zIndex > 100) {
                delete concept.zIndex; // Reset high z-indexes to auto
            }
        });
    }
    
    // Public API
    return {
        findOverlappingConcepts,
        getConceptZIndex,
        bringConceptToFront,
        applyZIndexToTiles,
        initializeZIndexCounter,
        cleanupZIndexes
    };
})();

// Make available globally
window.ZIndexManager = ZIndexManager;
