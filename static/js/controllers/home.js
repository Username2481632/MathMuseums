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
    let thumbnailQueue = new Set(); // Use Set for efficient lookups
    let thumbnailGenerationState = new Map(); // Track generation state per concept
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
            
            // Get actual tile size from bounding rect, not CSS styles (which may be percentages)
            const tileRect = tile.getBoundingClientRect();
            const tileWidth = tileRect.width;
            const tileHeight = tileRect.height;
            
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
            
            // Get current pixel position and size from actual rendered position
            const tileRect = tile.getBoundingClientRect();
            const containerRect = homePoster.getBoundingClientRect();
            
            const pixelX = tileRect.left - containerRect.left;
            const pixelY = tileRect.top - containerRect.top;
            const pixelWidth = tileRect.width;
            const pixelHeight = tileRect.height;
            
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
        getContainer: () => homePoster
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
            
            const conceptId = tile.dataset.id;
            const concept = concepts.find(c => c.id === conceptId);
            if (!concept) return;
            
            // Get current pixel position and size from actual rendered position
            const tileRect = tile.getBoundingClientRect();
            const containerRect = homePoster.getBoundingClientRect();
            
            const pixelX = tileRect.left - containerRect.left;
            const pixelY = tileRect.top - containerRect.top;
            const pixelWidth = tileRect.width;
            const pixelHeight = tileRect.height;
            
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
        if (renderDebounceTimer) {
            clearTimeout(renderDebounceTimer);
        }
        renderDebounceTimer = setTimeout(() => {
            if (homePoster && concepts.length > 0) {
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
        // First try to get concepts from session memory (in case they were imported)
        let concepts = await StorageManager.getAllConcepts();
        
        // If no concepts exist (or only defaults), check if we should create defaults
        if (!concepts || concepts.length === 0) {
            // Create all default concept types
            const defaultConcepts = ConceptModel.createAllConcepts();
            
            // Save them to session memory so they persist during the session
            for (const concept of defaultConcepts) {
                await StorageManager.saveConcept(concept);
            }
            
            concepts = defaultConcepts;
        }
        
        return concepts;
    }
    
    /**
     * Render the home view (home poster and tiles)
     */
    function render() {
        const appContainer = document.getElementById('app-container');
        appContainer.innerHTML = '';
        const template = document.getElementById('home-template');
        const homeView = template.content.cloneNode(true);
        appContainer.appendChild(homeView);
        homePoster = setupHomePoster();

        // Apply display settings now that the DOM elements exist, then render tiles
        requestAnimationFrame(() => {
            if (window.PreferencesClient && window.PreferencesClient.applyDisplaySettings) {
                window.PreferencesClient.applyDisplaySettings();
            }
            // Wait for CSS layout to complete after applyDisplaySettings
            function renderWhenReady() {
                const containerWidth = homePoster.offsetWidth;
                const containerHeight = homePoster.offsetHeight;
                if (containerWidth > 0 && containerHeight > 0) {
                    renderTilesOnPoster(homePoster, concepts, {
                        handleResizeStart: resizeManager.handleResizeStart,
                        handleTouchResizeStart: resizeManager.handleTouchResizeStart,
                        generateThumbnailWithRetry: generateThumbnailWithRetry
                    });
                    if (window.FontSizer) {
                        setTimeout(() => {
                            window.FontSizer.forceAdjustment();
                        }, 250);
                    }
                } else {
                    requestAnimationFrame(renderWhenReady);
                }
            }
            renderWhenReady();
        });
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
     * Generate a thumbnail with retry mechanism (ultra-fast for cache hits)
     * @param {Object} concept - Concept to generate thumbnail for
     * @param {HTMLElement} previewElement - Element to update with the thumbnail
     * @param {number} retryCount - Number of retries attempted
     */
    function generateThumbnailWithRetry(concept, previewElement, retryCount = 0) {
        const MAX_RETRIES = 1;
        
        // Prevent duplicate generation
        if (thumbnailQueue.has(concept.id)) return;
        
        // Double-check cache before any async operations (performance critical)
        if (window.DesmosUtils && window.DesmosUtils.getCachedThumbnail) {
            const cachedThumbnail = window.DesmosUtils.getCachedThumbnail(concept.desmosState);
            if (cachedThumbnail && previewElement.isConnected) {
                // Immediate cache hit - create image synchronously
                const img = document.createElement('img');
                img.alt = `${concept.displayName} preview`;
                img.src = cachedThumbnail;
                img.className = 'preview-image';
                img.draggable = false;
                img.addEventListener('dragstart', (e) => e.preventDefault());
                img.addEventListener('drag', (e) => e.preventDefault());
                previewElement.innerHTML = '';
                previewElement.appendChild(img);
                return; // Exit immediately for cache hits
            }
        }
        
        const tile = previewElement.closest('.concept-tile');
        const poster = tile ? tile.closest('.tiles-container') : null;
        const currentRenderGeneration = poster ? poster.dataset.renderGeneration : null;
        
        thumbnailQueue.add(concept.id);
        
        // No setTimeout delay - generate immediately for non-cached items
        if (!previewElement.isConnected) {
            thumbnailQueue.delete(concept.id);
            return;
        }
        
        // Use optimized DesmosUtils with fast memory caching
        DesmosUtils.generateThumbnail(concept.desmosState, concept.id)
            .then(dataUrl => {
                thumbnailQueue.delete(concept.id);
                
                if (!previewElement.isConnected) return;
                
                // Validate dataUrl before using it
                if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
                    console.warn('Invalid dataUrl received for concept:', concept.id);
                    return;
                }
                
                const currentTile = previewElement.closest('.concept-tile');
                const currentPoster = currentTile ? currentTile.closest('.tiles-container') : null;
                
                // Only update if still on same poster
                if (currentPoster && homePoster && currentPoster === homePoster) {
                    const img = document.createElement('img');
                    img.alt = `${concept.displayName} preview`;
                    img.src = dataUrl;
                    img.className = 'preview-image';
                    img.draggable = false;
                    img.addEventListener('dragstart', (e) => e.preventDefault());
                    img.addEventListener('drag', (e) => e.preventDefault());
                    previewElement.innerHTML = '';
                    previewElement.appendChild(img);
                }
            })
            .catch(error => {
                console.error('Error generating thumbnail for:', concept.id, error);
                thumbnailQueue.delete(concept.id);
                
                if (retryCount < MAX_RETRIES && previewElement.isConnected) {
                    const tile = previewElement.closest('.concept-tile');
                    const poster = tile ? tile.closest('.tiles-container') : null;
                    if (poster && homePoster && poster === homePoster && 
                        poster.dataset.renderGeneration === currentRenderGeneration) {
                        generateThumbnailWithRetry(concept, previewElement, retryCount + 1);
                    }
                } else if (previewElement.isConnected) {
                    const tile = previewElement.closest('.concept-tile');
                    const poster = tile ? tile.closest('.tiles-container') : null;
                    if (poster && homePoster && poster === homePoster && 
                        poster.dataset.renderGeneration === currentRenderGeneration) {
                        previewElement.innerHTML = '<div class="preview-error">Preview unavailable</div>';
                    }
                }
            });
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
        // Clear localStorage of any concept-related data with numeric IDs
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('concept') && (key.includes('_1') || key.includes('1'))) {
                keysToRemove.push(key);
            }
        }
        
        for (const key of keysToRemove) {
            localStorage.removeItem(key);
        }
        
        // Clear IndexedDB of corrupted concepts
        try {
            if (window.StorageManager && window.StorageManager.deleteConcept) {
                await window.StorageManager.deleteConcept('1');
                await window.StorageManager.deleteConcept(1);
            }
        } catch (error) {
            // Expected - concepts may not exist
        }
    }

    // Public API
    return {
        init,
        render,
        refresh: async function() {
            // Reload concepts and re-render
            concepts = await loadConcepts();
            render();
            setupEventListeners();
            debouncedRenderTiles();
        },
        clearThumbnailQueue: function() {
            thumbnailQueue.clear();
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
            thumbnailQueue.clear();
            
            // Note: Don't cleanup DesmosUtils here as it's a shared global resource
            // that may be used by other views. It will cleanup when the app unloads.
            
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
