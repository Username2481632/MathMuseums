/**
 * Home Controller
 * Manages the home poster view with draggable tile grid
 */
import { setupHomePoster } from './homePoster.js';
import { renderTilesOnPoster } from './tileRenderer.js';
import { createUndoRedoManager } from '../managers/undoRedoManager.js';
import { createDragManager } from '../managers/dragManager.js';
import { createResizeManager } from '../managers/resizeManager.js';
import { constrainResizeDimensions, getHomePosterPadding } from '../helpers/homeHelpers.js';
import { applyScreenFitMode, getSavedScreenFitMode, saveScreenFitMode, setupScreenFitListeners } from '../helpers/screenFitMode.js';

const HomeController = (function() {
    // Private variables
    let homePoster; // formerly tilesContainer
    let concepts = [];
    let isDragging = false;
    let draggedTile = null;
    let dragOffset = { x: 0, y: 0 };
    let saveTimeout;
    let recentlyDragged = false; // Track whether dragging just ended
    let dragCooldownTimer = null; // Timer for drag cooldown
    let renderDebounceTimer = null; // Timer for debounced rendering
    let thumbnailQueue = []; // Queue for thumbnail generation to prevent overloading
    let isResizing = false; // Track whether resizing is in progress
    let recentlyResized = false; // Track whether resizing just ended
    let resizingTile = null; // Track which tile is currently being resized
    let resizeHandle = null; // Track the resize handle being used

    // Undo/Redo manager for layout editing
    const undoRedoManager = createUndoRedoManager({
        getCurrentLayoutState,
        restoreLayoutState
    });

    // Safe pushUndoState function that checks restoration state
    const safePushUndoState = () => {
        // The undoRedoManager internally checks isRestoring flag
        undoRedoManager.pushUndoState();
    };

    // Drag manager with constrained coordinates
    const dragManager = createDragManager({
        onStart: () => {},
        onUpdate: (tile, clientX, clientY, dragOffset) => {
            // Calculate new position relative to container using consistent offsetWidth/offsetHeight
            const containerRect = homePoster.getBoundingClientRect();
            const containerWidth = homePoster.offsetWidth;
            const containerHeight = homePoster.offsetHeight;
            
            const x = clientX - containerRect.left - dragOffset.x;
            const y = clientY - containerRect.top - dragOffset.y;
            const tileWidth = parseInt(tile.style.width, 10) || 250;
            const tileHeight = parseInt(tile.style.height, 10) || 200;
            
            // Simple boundary constraints - keep tile fully within container
            const minX = 0;
            const minY = 0;
            const maxX = containerWidth - tileWidth;
            const maxY = containerHeight - tileHeight;
            
            const constrainedX = Math.max(minX, Math.min(x, maxX));
            const constrainedY = Math.max(minY, Math.min(y, maxY));
            
            tile.style.left = `${constrainedX}px`;
            tile.style.top = `${constrainedY}px`;
        },
        onFinish: (tile) => {
            const conceptId = tile.dataset.id;
            const concept = concepts.find(c => c.id === conceptId);
            if (!concept) return;
            
            // Get current pixel position and size
            const pixelX = parseInt(tile.style.left, 10);
            const pixelY = parseInt(tile.style.top, 10);
            const pixelWidth = parseInt(tile.style.width, 10);
            const pixelHeight = parseInt(tile.style.height, 10);
            
            // Convert to simple center-based coordinates
            const containerWidth = homePoster.offsetWidth;
            const containerHeight = homePoster.offsetHeight;
            const centerCoords = window.CoordinateUtils.pixelsToPercentage(
                pixelX, pixelY, pixelWidth, pixelHeight, containerWidth, containerHeight
            );
            
            // Constrain coordinates to keep tile within bounds
            const constrainedCoords = window.CoordinateUtils.constrainCoordinates(
                centerCoords.centerX, centerCoords.centerY, centerCoords.width, centerCoords.height
            );
            
            // Update with constrained center coordinates
            const updatedConcept = ConceptModel.updateCoordinates(concept, constrainedCoords);
            const index = concepts.findIndex(c => c.id === conceptId);
            if (index !== -1) concepts[index] = updatedConcept;
            StorageManager.saveConcept(updatedConcept);
        },
        getTileById: id => concepts.find(c => c.id === id),
        pushUndoState: safePushUndoState
    });

    // Resize manager
    const resizeManager = createResizeManager({
        onStart: () => {
            isResizing = true;
            recentlyResized = false;
        },
        onUpdate: (tile, constrained) => {
            tile.style.width = `${constrained.width}px`;
            tile.style.height = `${constrained.height}px`;
            tile.style.left = `${constrained.x}px`;
            tile.style.top = `${constrained.y}px`;
            
            // Trigger immediate font size adjustment during resize for real-time feedback
            if (window.FontSizer) {
                window.FontSizer.forceAdjustment();
            }
        },
        onFinish: (tile) => {
            isResizing = false;
            recentlyResized = true;
            
            // Clear the recently resized flag after a short delay
            setTimeout(() => {
                recentlyResized = false;
            }, 100);
            
            // Trigger immediate font size adjustment after resize
            if (window.FontSizer) {
                window.FontSizer.forceAdjustment();
            }
            
            // Trigger font size adjustment after resize
            if (window.FontSizer) {
                window.FontSizer.forceAdjustment();
            }
            
            const conceptId = tile.dataset.id;
            const concept = concepts.find(c => c.id === conceptId);
            if (!concept) return;
            
            // Get current pixel position and size
            const pixelX = parseInt(tile.style.left, 10);
            const pixelY = parseInt(tile.style.top, 10);
            const pixelWidth = parseInt(tile.style.width, 10);
            const pixelHeight = parseInt(tile.style.height, 10);
            
            // Convert to simple center-based coordinates
            const containerWidth = homePoster.offsetWidth;
            const containerHeight = homePoster.offsetHeight;
            const centerCoords = window.CoordinateUtils.pixelsToPercentage(
                pixelX, pixelY, pixelWidth, pixelHeight, containerWidth, containerHeight
            );
            
            // Constrain coordinates to keep tile within bounds
            const constrainedCoords = window.CoordinateUtils.constrainCoordinates(
                centerCoords.centerX, centerCoords.centerY, centerCoords.width, centerCoords.height
            );
            
            // Update with constrained center coordinates
            const updatedConcept = ConceptModel.updateCoordinates(concept, constrainedCoords);
            const index = concepts.findIndex(c => c.id === conceptId);
            if (index !== -1) concepts[index] = updatedConcept;
            StorageManager.saveConcept(updatedConcept);
        },
        getTileById: id => concepts.find(c => c.id === id),
        pushUndoState: safePushUndoState,
        constrainDimensions: constrainResizeDimensions
    });

    // Debounced render function to prevent multiple rapid renders
    function debouncedRenderTiles() {
        // console.log('=== debouncedRenderTiles called ===');
        if (renderDebounceTimer) {
            clearTimeout(renderDebounceTimer);
            // console.log('Cleared existing render timer');
        }
        renderDebounceTimer = setTimeout(() => {
            // console.log('=== Executing debounced render ===');
            if (homePoster && concepts.length > 0) {
                // console.log('Calling renderTilesOnPoster with concepts:', concepts.length);
                renderTilesOnPoster(homePoster, concepts, { 
                    handleResizeStart: resizeManager.handleResizeStart, 
                    handleTouchResizeStart: resizeManager.handleTouchResizeStart,
                    generateThumbnailWithRetry: generateThumbnailWithRetry
                });
            }
            renderDebounceTimer = null;
        }, 50); // Wait 50ms before rendering
    }
    
    // Immediate render function for window resize events
    function immediateRenderTiles() {
        if (homePoster && concepts.length > 0) {
            renderTilesOnPoster(homePoster, concepts, { 
                handleResizeStart: resizeManager.handleResizeStart, 
                handleTouchResizeStart: resizeManager.handleTouchResizeStart,
                generateThumbnailWithRetry: generateThumbnailWithRetry
            });
        }
    }
    
    // Helper: Get current layout state (center-based coordinates)
    function getCurrentLayoutState() {
        const state = concepts.map(concept => {
            const coords = ConceptModel.getCoordinates(concept);
            return {
                id: concept.id,
                coordinates: {
                    centerX: coords.centerX,
                    centerY: coords.centerY,
                    width: coords.width,
                    height: coords.height
                }
            };
        });
        
        return state;
    }
    
    // Helper: Restore layout state (center-based coordinates)
    function restoreLayoutState(state) {
        console.log('Restoring layout state:', state);
        if (!Array.isArray(state)) return;
        for (const s of state) {
            const conceptIndex = concepts.findIndex(c => c.id === s.id);
            if (conceptIndex !== -1) {
                const concept = concepts[conceptIndex];
                
                // Update using center-based coordinates
                const updatedConcept = ConceptModel.updateCoordinates(concept, s.coordinates);
                
                // Update the concept in the array
                concepts[conceptIndex] = updatedConcept;
                
                // Save to storage to maintain persistence
                StorageManager.saveConcept(updatedConcept);
            }
        }
        debouncedRenderTiles();
    }
    
    /**
     * Initialize the home controller
     */
    async function init() {
        // Force cleanup of any corrupted data first
        await forceCleanupCorruptedData();
        
        // Restore undo/redo stacks from localStorage
        undoRedoManager.loadStacks();
        
        // Get concepts from storage
        concepts = await loadConcepts();
        
        // Render the home view
        render();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize FontSizer for real-time font resizing
        if (window.FontSizer) {
            window.FontSizer.init();
        }
    }
    
    /**
     * Load concepts from storage
     * @returns {Array} Array of concept objects
     */
    async function loadConcepts() {
        // console.log('=== loadConcepts called ===');
        let concepts = await StorageManager.getAllConcepts();
        // console.log('Raw concepts from StorageManager:', concepts);
        // console.log('Concepts count:', concepts ? concepts.length : 0);
        if (concepts) {
            // console.log('Concept details:', concepts.map(c => ({ id: c.id, displayName: c.displayName, type: typeof c.id })));
            
            // Log each concept's full structure for debugging - disabled for performance
            /*
            concepts.forEach((concept, index) => {
                console.log(`Concept ${index} full structure:`, {
                    id: concept.id,
                    type: concept.type, 
                    displayName: concept.displayName,
                    hasCoordinates: !!concept.coordinates,
                    hasPosition: !!concept.position,
                    hasX: concept.x !== undefined,
                    hasY: concept.y !== undefined,
                    fullObject: concept
                });
            });
            */
        }
        
        // If no concepts found, create defaults
        if (!concepts || concepts.length === 0) {
            // console.log('No concepts found, creating defaults');
            concepts = ConceptModel.createAllConcepts();
            // console.log('Created default concepts:', concepts);
            
            // Save default concepts
            for (const concept of concepts) {
                await StorageManager.saveConcept(concept);
            }
        }
        
        // Validate and filter concepts to remove corrupted data
        const validConcepts = concepts.filter(concept => {
            const isValid = concept && 
                           concept.id && 
                           concept.displayName && 
                           typeof concept.displayName === 'string' &&
                           concept.displayName !== 'undefined';
            
            if (!isValid) {
                console.warn('Filtering out invalid concept:', concept);
            }
            return isValid;
        });
        
        if (validConcepts.length !== concepts.length) {
            // console.log(`Filtered out ${concepts.length - validConcepts.length} invalid concepts`);
            // console.log('Valid concepts:', validConcepts);
            
            // Clean up corrupted concepts from storage
            const corruptedConcepts = concepts.filter(concept => !validConcepts.includes(concept));
            for (const corruptedConcept of corruptedConcepts) {
                // console.log('Removing corrupted concept from storage:', corruptedConcept);
                try {
                    await StorageManager.deleteConcept(corruptedConcept.id);
                } catch (error) {
                    console.error('Error removing corrupted concept:', error);
                }
            }
        }
        
        console.log('Final loaded concepts:', validConcepts);
        return validConcepts;
    }
    
    /**
     * Render the home view (home poster and tiles)
     */
    function render() {
        // console.log('=== Home render called ===');
        const appContainer = document.getElementById('app-container');
        appContainer.innerHTML = '';
        const template = document.getElementById('home-template');
        const homeView = template.content.cloneNode(true);
        appContainer.appendChild(homeView);
        homePoster = setupHomePoster();
        
        // Apply display settings now that the DOM elements exist, then render tiles
        setTimeout(() => {
            if (window.PreferencesClient && window.PreferencesClient.applyDisplaySettings) {
                window.PreferencesClient.applyDisplaySettings();
            }
            
            // Render tiles after aspect ratio is applied
            // console.log('Home poster set up, calling renderTilesOnPoster');
            renderTilesOnPoster(homePoster, concepts, { 
                handleResizeStart: resizeManager.handleResizeStart, 
                handleTouchResizeStart: resizeManager.handleTouchResizeStart,
                generateThumbnailWithRetry: generateThumbnailWithRetry
            });
        }, 0);
    }
    
    /**
     * Setup event listeners for tiles and dragging on the home poster
     */
    function setupEventListeners() {
        homePoster.addEventListener('click', handleTileClick);
        homePoster.addEventListener('mousedown', dragManager.handleTileMouseDown);
        homePoster.addEventListener('touchstart', dragManager.handleTileTouchStart);
        document.addEventListener('mousemove', dragManager.handleMouseMove);
        document.addEventListener('mouseup', dragManager.handleMouseUp);
        document.addEventListener('touchmove', dragManager.handleTouchMove, { passive: false });
        document.addEventListener('touchend', dragManager.handleTouchEnd);
        document.addEventListener('mousemove', (e) => resizeManager.handleResizeMove(e, { width: homePoster.offsetWidth, height: homePoster.offsetHeight }));
        document.addEventListener('mouseup', resizeManager.handleResizeEnd);
        document.addEventListener('touchmove', (e) => resizeManager.handleTouchResizeMove(e, { width: homePoster.offsetWidth, height: homePoster.offsetHeight }), { passive: false });
        document.addEventListener('touchend', resizeManager.handleTouchResizeEnd);
    }
    
    /**
     * Handle tile click
     * @param {MouseEvent} event - Click event
     */
    function handleTileClick(event) {
        // Ignore clicks during drag operations
        if (dragManager.isDragging()) {
            return;
        }
        // Ignore clicks immediately after dragging (prevents detail view opening after drag)
        if (dragManager.recentlyDragged()) {
            return;
        }
        // Ignore clicks during resize operations
        if (isResizing) {
            return;
        }
        // Ignore clicks immediately after resizing
        if (recentlyResized) {
            return;
        }
        // Don't trigger clicks when the resize handle is clicked
        if (event.target.classList.contains('resize-handle')) {
            event.stopPropagation();
            return;
        }
        // Check for explicit resizing data attribute
        const tile = event.target.closest('.concept-tile');
        if (tile && tile.dataset.resizing === 'true') {
            event.stopPropagation();
            event.preventDefault();
            return;
        }
        if (!tile) {
            return;
        }
        // Get the concept ID
        const conceptId = tile.dataset.id;
        // Navigate to the detail view
        Router.navigate('detail', { id: conceptId });
    }
    
    /**
     * Generate a thumbnail with retry mechanism
     * @param {Object} concept - Concept to generate thumbnail for
     * @param {HTMLElement} previewElement - Element to update with the thumbnail
     * @param {number} retryCount - Number of retries attempted
     */
    function generateThumbnailWithRetry(concept, previewElement, retryCount = 0) {
        // Max number of retries
        const MAX_RETRIES = 2;
        
        // Store the current render generation for this thumbnail
        const tile = previewElement.closest('.concept-tile');
        const poster = tile ? tile.closest('.tiles-container') : null;
        const currentRenderGeneration = poster ? poster.dataset.renderGeneration : null;
        
        // Add to the queue with a slight delay to prevent overloading
        const queueIndex = thumbnailQueue.length;
        thumbnailQueue.push(concept.id);
        
        // Slight delay based on queue position to prevent multiple calculators
        // from being created at the same time
        setTimeout(() => {
            // Only proceed if still in DOM and not already processed
            if (!previewElement.isConnected || thumbnailQueue[queueIndex] !== concept.id) {
                thumbnailQueue[queueIndex] = null; // Clear from queue
                return;
            }
            
            // Check if the preview element is still part of the current render generation
            const tile = previewElement.closest('.concept-tile');
            const poster = tile ? tile.closest('.tiles-container') : null;
            if (!poster || !homePoster || poster !== homePoster || poster.dataset.renderGeneration !== currentRenderGeneration) {
                thumbnailQueue[queueIndex] = null; // Clear from queue
                return;
            }
            
            // Check for direct image first
            console.log('generateThumbnailWithRetry: Checking for direct image for concept:', concept.id);
            const directImageUrl = DesmosUtils.extractImageUrl(concept.desmosState);
            console.log('generateThumbnailWithRetry: Direct image URL result:', directImageUrl);
            
            if (directImageUrl) {
                // Use the direct image instead of generating a thumbnail
                console.log('generateThumbnailWithRetry: Using direct image for concept:', concept.id);
                thumbnailQueue[queueIndex] = null; // Clear from queue
                
                const img = document.createElement('img');
                img.alt = `${concept.displayName} preview`;
                img.src = directImageUrl;
                img.className = 'preview-image';
                img.draggable = false;
                
                // Prevent default drag behavior
                img.addEventListener('dragstart', (e) => e.preventDefault());
                img.addEventListener('drag', (e) => e.preventDefault());
                
                // Handle image load/error
                img.onload = () => {
                    if (previewElement.isConnected) {
                        const tile = previewElement.closest('.concept-tile');
                        const poster = tile ? tile.closest('.tiles-container') : null;
                        if (poster && homePoster && poster === homePoster && poster.dataset.renderGeneration === currentRenderGeneration) {
                            previewElement.innerHTML = '';
                            previewElement.appendChild(img);
                        }
                    }
                };
                
                img.onerror = () => {
                    console.warn('generateThumbnailWithRetry: Direct image failed to load, falling back to thumbnail generation for concept:', concept.id);
                    // Fall back to thumbnail generation
                    generateThumbnailFromDesmos();
                };
                
                return; // Exit early, using direct image
            }
            
            // If no direct image, generate thumbnail from Desmos state
            generateThumbnailFromDesmos();
            
            function generateThumbnailFromDesmos() {
                DesmosUtils.generateThumbnail(concept.desmosState)
                    .then(dataUrl => {
                        // Clear from queue
                        thumbnailQueue[queueIndex] = null;
                        
                        // Create image with generated thumbnail
                        const img = document.createElement('img');
                        img.alt = `${concept.displayName} preview`;
                        img.src = dataUrl;
                        img.className = 'preview-image';
                        img.draggable = false;
                        
                        // Prevent default drag behavior
                        img.addEventListener('dragstart', (e) => e.preventDefault());
                        img.addEventListener('drag', (e) => e.preventDefault());
                        
                        // Replace loading with image - with additional safety checks
                        if (previewElement.isConnected) {
                            const tile = previewElement.closest('.concept-tile');
                            const poster = tile ? tile.closest('.tiles-container') : null;
                            if (poster && homePoster && poster === homePoster && poster.dataset.renderGeneration === currentRenderGeneration) {
                                previewElement.innerHTML = '';
                                previewElement.appendChild(img);
                            }
                        }
                    })
                    .catch(error => {
                        // Clear from queue
                        thumbnailQueue[queueIndex] = null;
                        
                        console.error('Error generating thumbnail:', error);
                        
                        // Retry if under the limit
                        if (retryCount < MAX_RETRIES && previewElement.isConnected) {
                            const tile = previewElement.closest('.concept-tile');
                            const poster = tile ? tile.closest('.tiles-container') : null;
                            if (poster && homePoster && poster === homePoster && poster.dataset.renderGeneration === currentRenderGeneration) {
                                console.log(`Retrying thumbnail generation (${retryCount + 1}/${MAX_RETRIES})`);
                                generateThumbnailWithRetry(concept, previewElement, retryCount + 1);
                            }
                        } else if (previewElement.isConnected) {
                            const tile = previewElement.closest('.concept-tile');
                            const poster = tile ? tile.closest('.tiles-container') : null;
                            if (poster && homePoster && poster === homePoster && poster.dataset.renderGeneration === currentRenderGeneration) {
                                previewElement.innerHTML = '<div class="preview-error">Preview unavailable</div>';
                            }
                        }
                    });
            }
        }, queueIndex * 100); // Stagger by 100ms per item in queue
    }
    
    // --- FIT/FILL MODE LOGIC ---
    function applyScreenFitMode(mode) {
        const homeView = document.getElementById('home-view');
        if (!homeView) return;
        homeView.classList.remove('screen-fit-mode', 'screen-fill-mode');
        if (mode === 'fit') {
            homeView.classList.add('screen-fit-mode');
        } else if (mode === 'fill') {
            homeView.classList.add('screen-fill-mode');
        }
    }

    function getSavedScreenFitMode() {
        // Try to get from localStorage or default to 'fit'
        return (localStorage.getItem('screen-fit-mode') || 'fit');
    }

    function saveScreenFitMode(mode) {
        localStorage.setItem('screen-fit-mode', mode);
    }

    function setupScreenFitListeners() {
        const fitRadio = document.getElementById('screen-fit-radio-fit');
        const fillRadio = document.getElementById('screen-fit-radio-fill');
        if (!fitRadio || !fillRadio) return;
        [fitRadio, fillRadio].forEach(radio => {
            radio.addEventListener('change', () => {
                if (fitRadio.checked) {
                    applyScreenFitMode('fit');
                    saveScreenFitMode('fit');
                } else if (fillRadio.checked) {
                    applyScreenFitMode('fill');
                    saveScreenFitMode('fill');
                }
            });
        });
    }

    // Patch render to apply mode and listeners after rendering
    const origRender = render;
    render = function() {
        origRender.apply(this, arguments);
        // Apply screen fit mode immediately without delay
        applyScreenFitMode(getSavedScreenFitMode());
        setupScreenFitListeners();
    };

    // --- Keyboard Undo/Redo Shortcuts ---
    document.addEventListener('keydown', function(e) {
        // Only trigger if home view is visible
        const homeView = document.getElementById('home-view');
        if (!homeView || (homeView.style.display === 'none')) return;
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undoRedoManager.undoLayout();
        } else if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key.toLowerCase() === 'z') || e.key.toLowerCase() === 'y')) {
            e.preventDefault();
            undoRedoManager.redoLayout();
        }
    });

    // --- Listen for containerSized event from preferences.js ---
    document.addEventListener('containerSized', function() {
        if (homePoster && concepts.length > 0) {
            // Use immediate rendering for container size changes to enable real-time font resizing
            immediateRenderTiles();
        }
    });

    /**
     * Force cleanup of all corrupted data from storage
     */
    async function forceCleanupCorruptedData() {
        console.log('=== Force cleanup of corrupted data ===');
        
        // Clear localStorage of any concept-related data with numeric IDs
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('concept') && (key.includes('_1') || key.includes('1'))) {
                keysToRemove.push(key);
            }
        }
        
        for (const key of keysToRemove) {
            console.log('Removing corrupted localStorage key:', key);
            localStorage.removeItem(key);
        }
        
        // Clear IndexedDB of corrupted concepts
        try {
            if (window.StorageManager && window.StorageManager.deleteConcept) {
                await window.StorageManager.deleteConcept('1');
                await window.StorageManager.deleteConcept(1);
                console.log('Attempted to delete concept with ID 1 from storage');
            }
        } catch (error) {
            console.log('Error during storage cleanup (expected):', error);
        }
        
        console.log('Force cleanup completed');
    }

    // Public API
    return {
        init,
        render,
        clearThumbnailQueue: function() {
            // Clear the thumbnail queue to prevent ghost tiles
            thumbnailQueue = [];
        },
        cleanup: function() {
            // Clear any pending operations
            if (dragCooldownTimer) {
                clearTimeout(dragCooldownTimer);
                dragCooldownTimer = null;
            }
            
            // Clear render debounce timer
            if (renderDebounceTimer) {
                clearTimeout(renderDebounceTimer);
                renderDebounceTimer = null;
            }
            
            // Clear thumbnail queue
            thumbnailQueue = [];
            
            // Clean up Desmos calculator resources
            DesmosUtils.cleanup();
            
            // Clean up FontSizer
            if (window.FontSizer) {
                window.FontSizer.cleanup();
            }
            
            // Reset resize state
            isResizing = false;
            resizingTile = null;
            resizeHandle = null;
            
            // Remove event listeners
            if (homePoster) {
                homePoster.removeEventListener('click', handleTileClick);
                homePoster.removeEventListener('mousedown', dragManager.handleTileMouseDown);
                homePoster.removeEventListener('touchstart', dragManager.handleTileTouchStart);
            }
            
            document.removeEventListener('mousemove', dragManager.handleMouseMove);
            document.removeEventListener('mouseup', dragManager.handleMouseUp);
            document.removeEventListener('touchmove', dragManager.handleTouchMove);
            document.removeEventListener('touchend', dragManager.handleTouchEnd);
            
            // Note: Anonymous resize event listeners cannot be removed individually
            // This is a limitation but doesn't cause memory leaks since the page is refreshing
        }
    };
})();

window.HomeController = HomeController;
window.renderTilesOnPoster = renderTilesOnPoster;
