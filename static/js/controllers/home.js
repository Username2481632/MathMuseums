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
    let thumbnailQueue = new Set(); // Use Set for efficient lookups
    let thumbnailGenerationState = new Map(); // Track generation state per concept
    let isResizing = false; // Track whether resizing is in progress
    let recentlyResized = false; // Track whether resizing just ended
    let resizingTile = null; // Track which tile is currently being resized
    let resizeHandle = null; // Track the resize handle being used

    // Swap mode state
    let isSwapModeActive = false;
    let selectedTileForSwap = null;
    let swapInstructionElement = null;

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
        onStart: (tile) => {
            // Just start dragging without z-index changes
        },
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
            
            const currentPixelX = tileRect.left - containerRect.left;
            const currentPixelY = tileRect.top - containerRect.top;
            const currentPixelWidth = tileRect.width;
            const currentPixelHeight = tileRect.height;
            
            // Get original pixel position for comparison
            const originalCoords = ConceptModel.getCoordinates(concept);
            const containerWidth = homePoster.offsetWidth;
            const containerHeight = homePoster.offsetHeight;
            const originalPixelCoords = window.CoordinateUtils.percentageToPixels(
                originalCoords.centerX, originalCoords.centerY, originalCoords.width, originalCoords.height,
                containerWidth, containerHeight
            );
            
            // Check if position actually changed at pixel level (with small tolerance for rounding)
            const positionChanged = (
                Math.abs(currentPixelX - originalPixelCoords.x) > 1 ||
                Math.abs(currentPixelY - originalPixelCoords.y) > 1 ||
                Math.abs(currentPixelWidth - originalPixelCoords.width) > 1 ||
                Math.abs(currentPixelHeight - originalPixelCoords.height) > 1
            );
            
            // Convert to simple center-based coordinates
            const centerCoords = window.CoordinateUtils.pixelsToPercentage(
                currentPixelX, currentPixelY, currentPixelWidth, currentPixelHeight, containerWidth, containerHeight
            );
            
            // Constrain coordinates to keep tile within bounds
            const constrainedCoords = window.CoordinateUtils.constrainCoordinates(
                centerCoords.centerX, centerCoords.centerY, centerCoords.width, centerCoords.height
            );
            
            // PHASE 1: Update position only and check if z-index changes will be needed
            const updatedConcept = ConceptModel.updateCoordinates(concept, constrainedCoords);
            const index = concepts.findIndex(c => c.id === conceptId);
            if (index !== -1) concepts[index] = updatedConcept;
            
            // Check if z-index changes will be needed (before applying them)
            let willChangeZIndex = false;
            if (window.ZIndexManager) {
                // Check for overlaps to determine if z-index changes are needed
                const overlappingIds = window.ZIndexManager.findOverlappingConcepts(
                    conceptId, concepts, containerWidth, containerHeight
                );
                
                if (overlappingIds.length > 0) {
                    // There are overlaps, so z-index will likely change
                    const currentConcept = concepts.find(c => c.id === conceptId);
                    const currentZIndex = currentConcept ? currentConcept.zIndex : undefined;
                    
                    // Find max z-index among overlapping concepts
                    let maxZIndex = 0;
                    overlappingIds.forEach(id => {
                        const overlapConcept = concepts.find(c => c.id === id);
                        if (overlapConcept && overlapConcept.zIndex && overlapConcept.zIndex > maxZIndex) {
                            maxZIndex = overlapConcept.zIndex;
                        }
                    });
                    
                    const expectedNewZIndex = maxZIndex + 1;
                    willChangeZIndex = currentZIndex !== expectedNewZIndex;
                } else if (concepts.find(c => c.id === conceptId)?.zIndex !== undefined) {
                    // No overlaps but concept has z-index, so it will be removed
                    willChangeZIndex = true;
                }
            }
            
            // Save the concept with new position but old z-index
            StorageManager.saveConcept(concepts[index]);
            
            // PHASE 2: Now apply z-index changes
            if (window.ZIndexManager) {
                const wasChanged = window.ZIndexManager.bringConceptToFront(
                    conceptId, concepts, containerWidth, containerHeight
                );
                
                if (wasChanged) {
                    // Push intermediate undo state AFTER z-index changes to concepts but BEFORE DOM/storage updates
                    // This captures the state with new position AND the overlapped tile having proper z-index
                    // Only create intermediate state if BOTH position and z-index changed
                    if (willChangeZIndex && positionChanged) {
                        // Temporarily revert the moved tile's z-index for the intermediate state
                        const movedConcept = concepts.find(c => c.id === conceptId);
                        const originalZIndex = movedConcept ? movedConcept.zIndex : undefined;
                        
                        if (movedConcept) {
                            // Remove z-index from moved tile for intermediate state
                            delete movedConcept.zIndex;
                        }
                        
                        // Capture the intermediate state (new position, overlapped tile has z-index, moved tile doesn't)
                        safePushUndoState();
                        
                        // Restore the moved tile's z-index
                        if (movedConcept && originalZIndex !== undefined) {
                            movedConcept.zIndex = originalZIndex;
                        }
                    }
                    
                    // Apply z-index changes to ALL affected tiles (moved tile + overlapping tiles)
                    const overlappingIds = window.ZIndexManager.findOverlappingConcepts(
                        conceptId, concepts, containerWidth, containerHeight
                    );
                    
                    // Update the moved tile
                    const movedConcept = concepts.find(c => c.id === conceptId);
                    if (movedConcept) {
                        const zIndex = window.ZIndexManager.getConceptZIndex(movedConcept);
                        tile.style.zIndex = zIndex.toString();
                        StorageManager.saveConcept(movedConcept);
                    }
                    
                    // Update all overlapping tiles that might have gotten new z-indexes
                    overlappingIds.forEach(overlapId => {
                        const overlapConcept = concepts.find(c => c.id === overlapId);
                        const overlapTile = homePoster.querySelector(`[data-id="${overlapId}"]`);
                        if (overlapConcept && overlapTile) {
                            const zIndex = window.ZIndexManager.getConceptZIndex(overlapConcept);
                            overlapTile.style.zIndex = zIndex.toString();
                            StorageManager.saveConcept(overlapConcept);
                        }
                    });
                }
            }
        },
        getTileById: id => concepts.find(c => c.id === id),
        pushUndoState: safePushUndoState,
        getContainer: () => homePoster
    });

    // Resize manager
    const resizeManager = createResizeManager({
        onStart: (tile) => {
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
            
            const currentPixelX = tileRect.left - containerRect.left;
            const currentPixelY = tileRect.top - containerRect.top;
            const currentPixelWidth = tileRect.width;
            const currentPixelHeight = tileRect.height;
            
            // Get original pixel position for comparison
            const originalCoords = ConceptModel.getCoordinates(concept);
            const containerWidth = homePoster.offsetWidth;
            const containerHeight = homePoster.offsetHeight;
            const originalPixelCoords = window.CoordinateUtils.percentageToPixels(
                originalCoords.centerX, originalCoords.centerY, originalCoords.width, originalCoords.height,
                containerWidth, containerHeight
            );
            
            // Check if size/position actually changed at pixel level (with small tolerance for rounding)
            const sizeOrPositionChanged = (
                Math.abs(currentPixelX - originalPixelCoords.x) > 1 ||
                Math.abs(currentPixelY - originalPixelCoords.y) > 1 ||
                Math.abs(currentPixelWidth - originalPixelCoords.width) > 1 ||
                Math.abs(currentPixelHeight - originalPixelCoords.height) > 1
            );
            
            // Convert to simple center-based coordinates
            const centerCoords = window.CoordinateUtils.pixelsToPercentage(
                currentPixelX, currentPixelY, currentPixelWidth, currentPixelHeight, containerWidth, containerHeight
            );
            
            // Constrain coordinates to keep tile within bounds
            const constrainedCoords = window.CoordinateUtils.constrainCoordinates(
                centerCoords.centerX, centerCoords.centerY, centerCoords.width, centerCoords.height
            );
            
            // PHASE 1: Update size/position only and check if z-index changes will be needed
            const updatedConcept = ConceptModel.updateCoordinates(concept, constrainedCoords);
            const index = concepts.findIndex(c => c.id === conceptId);
            if (index !== -1) concepts[index] = updatedConcept;
            
            // Check if z-index changes will be needed (before applying them)
            let willChangeZIndex = false;
            if (window.ZIndexManager) {
                // Check for overlaps to determine if z-index changes are needed
                const overlappingIds = window.ZIndexManager.findOverlappingConcepts(
                    conceptId, concepts, containerWidth, containerHeight
                );
                
                if (overlappingIds.length > 0) {
                    // There are overlaps, so z-index will likely change
                    const currentConcept = concepts.find(c => c.id === conceptId);
                    const currentZIndex = currentConcept ? currentConcept.zIndex : undefined;
                    
                    // Find max z-index among overlapping concepts
                    let maxZIndex = 0;
                    overlappingIds.forEach(id => {
                        const overlapConcept = concepts.find(c => c.id === id);
                        if (overlapConcept && overlapConcept.zIndex && overlapConcept.zIndex > maxZIndex) {
                            maxZIndex = overlapConcept.zIndex;
                        }
                    });
                    
                    const expectedNewZIndex = maxZIndex + 1;
                    willChangeZIndex = currentZIndex !== expectedNewZIndex;
                } else if (concepts.find(c => c.id === conceptId)?.zIndex !== undefined) {
                    // No overlaps but concept has z-index, so it will be removed
                    willChangeZIndex = true;
                }
            }
            
            // Save the concept with new size/position but old z-index
            StorageManager.saveConcept(concepts[index]);
            
            // PHASE 2: Now apply z-index changes
            if (window.ZIndexManager) {
                const wasChanged = window.ZIndexManager.bringConceptToFront(
                    conceptId, concepts, containerWidth, containerHeight
                );
                
                if (wasChanged) {
                    // Push intermediate undo state AFTER z-index changes to concepts but BEFORE DOM/storage updates
                    // This captures the state with new size/position AND the overlapped tile having proper z-index
                    // Only create intermediate state if BOTH size/position and z-index changed
                    if (willChangeZIndex && sizeOrPositionChanged) {
                        // Temporarily revert the resized tile's z-index for the intermediate state
                        const resizedConcept = concepts.find(c => c.id === conceptId);
                        const originalZIndex = resizedConcept ? resizedConcept.zIndex : undefined;
                        
                        if (resizedConcept) {
                            // Remove z-index from resized tile for intermediate state
                            delete resizedConcept.zIndex;
                        }
                        
                        // Capture the intermediate state (new size/position, overlapped tile has z-index, resized tile doesn't)
                        safePushUndoState();
                        
                        // Restore the resized tile's z-index
                        if (resizedConcept && originalZIndex !== undefined) {
                            resizedConcept.zIndex = originalZIndex;
                        }
                    }
                    
                    // Apply z-index changes to ALL affected tiles (resized tile + overlapping tiles)
                    const overlappingIds = window.ZIndexManager.findOverlappingConcepts(
                        conceptId, concepts, containerWidth, containerHeight
                    );
                    
                    // Update the resized tile
                    const resizedConcept = concepts.find(c => c.id === conceptId);
                    if (resizedConcept) {
                        const zIndex = window.ZIndexManager.getConceptZIndex(resizedConcept);
                        tile.style.zIndex = zIndex.toString();
                        StorageManager.saveConcept(resizedConcept);
                    }
                    
                    // Update all overlapping tiles that might have gotten new z-indexes
                    overlappingIds.forEach(overlapId => {
                        const overlapConcept = concepts.find(c => c.id === overlapId);
                        const overlapTile = homePoster.querySelector(`[data-id="${overlapId}"]`);
                        if (overlapConcept && overlapTile) {
                            const zIndex = window.ZIndexManager.getConceptZIndex(overlapConcept);
                            overlapTile.style.zIndex = zIndex.toString();
                            StorageManager.saveConcept(overlapConcept);
                        }
                    });
                }
            }
        },
        getTileById: id => concepts.find(c => c.id === id),
        pushUndoState: safePushUndoState,
        constrainDimensions: constrainResizeDimensions,
        dragManager: dragManager  // Pass drag manager so resize manager can check drag state
    });

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
    
    // Update existing tiles in place without rebuilding (for undo operations)
    function updateTilesInPlace() {
        if (!homePoster || concepts.length === 0) return;
        
        const containerWidth = homePoster.offsetWidth;
        const containerHeight = homePoster.offsetHeight;
        
        concepts.forEach(concept => {
            const tile = homePoster.querySelector(`[data-id="${concept.id}"]`);
            if (!tile) return; // Skip if tile doesn't exist
            
            const coords = ConceptModel.getCoordinates(concept);
            const pixelCoords = window.CoordinateUtils.percentageToPixels(
                coords.centerX, coords.centerY, coords.width, coords.height,
                containerWidth, containerHeight
            );
            
            // Update tile position and size
            tile.style.left = `${pixelCoords.x}px`;
            tile.style.top = `${pixelCoords.y}px`;
            tile.style.width = `${pixelCoords.width}px`;
            tile.style.height = `${pixelCoords.height}px`;
            
            // Update z-index based on concept's z-index value
            if (concept.zIndex !== undefined) {
                tile.style.zIndex = concept.zIndex.toString();
            } else {
                tile.style.zIndex = 'auto';
            }
        });
        
        // Only call FontSizer once after all tiles are updated
        if (window.FontSizer) {
            window.FontSizer.forceAdjustment();
        }
    }
    
    // Helper: Get current layout state (center-based coordinates)
    function getCurrentLayoutState() {
        const state = concepts.map(concept => {
            const coords = ConceptModel.getCoordinates(concept);
            const layoutState = {
                id: concept.id,
                coordinates: {
                    centerX: coords.centerX,
                    centerY: coords.centerY,
                    width: coords.width,
                    height: coords.height
                }
            };
            
            // Include z-index if the concept has one
            if (concept.zIndex !== undefined) {
                layoutState.zIndex = concept.zIndex;
            }
            
            return layoutState;
        });
        
        return state;
    }
    
    // Helper: Restore layout state (center-based coordinates)
    function restoreLayoutState(state) {
        if (!Array.isArray(state)) {
            return;
        }
        
        for (const s of state) {
            const conceptIndex = concepts.findIndex(c => c.id === s.id);
            if (conceptIndex !== -1) {
                const concept = concepts[conceptIndex];
                
                // Prepare coordinates with z-index handling
                const coordinatesWithZIndex = { ...s.coordinates };
                
                // Always handle z-index explicitly - either set it or remove it
                if (s.zIndex !== undefined) {
                    coordinatesWithZIndex.zIndex = s.zIndex;
                } else {
                    // If the restored state has no z-index, explicitly remove it
                    coordinatesWithZIndex.zIndex = undefined;
                }
                
                // Update using center-based coordinates and z-index
                const updatedConcept = ConceptModel.updateCoordinates(concept, coordinatesWithZIndex);
                
                // Ensure the z-index is properly handled in the concept
                if (s.zIndex === undefined && updatedConcept.zIndex !== undefined) {
                    // Remove z-index from the updated concept
                    const { zIndex, ...conceptWithoutZIndex } = updatedConcept;
                    concepts[conceptIndex] = conceptWithoutZIndex;
                    StorageManager.saveConcept(conceptWithoutZIndex);
                } else {
                    // Update the concept in the array
                    concepts[conceptIndex] = updatedConcept;
                    StorageManager.saveConcept(updatedConcept);
                }
            }
        }
        
        // Update existing tiles in place to prevent font flash (no DOM clearing/rebuilding)
        updateTilesInPlace();
        
        // Apply z-index to all tiles after undo/redo
        if (window.ZIndexManager) {
            window.ZIndexManager.applyZIndexToTiles(homePoster, concepts);
        }
    }
    
    /**
     * Initialize the home controller
     */
    async function init() {
        // Force cleanup of any corrupted data first
        await forceCleanupCorruptedData();
        
        // Get concepts from storage
        concepts = await loadConcepts();
        
        // Initialize z-index counter based on existing concepts
        if (window.ZIndexManager) {
            window.ZIndexManager.initializeZIndexCounter(concepts);
        }
        
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

        // Apply display settings and render tiles
        window.PreferencesClient.applyDisplaySettings();
    }
    
    /**
     * Setup event listeners for tiles and dragging on the home poster
     */
    function setupEventListeners() {
        homePoster.addEventListener('click', handleTileClick);
        homePoster.addEventListener('mousedown', dragManager.handleTileMouseDown);
        homePoster.addEventListener('touchstart', dragManager.handleTileTouchStart);
        
        // Add touch-specific click handling for better touchscreen support
        homePoster.addEventListener('touchend', handleTileTouchEnd);
        
        // Prevent context menu on tiles
        homePoster.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.concept-tile')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
        
        document.addEventListener('mousemove', dragManager.handleMouseMove);
        document.addEventListener('mouseup', dragManager.handleMouseUp);
        document.addEventListener('touchmove', dragManager.handleTouchMove, { passive: false });
        document.addEventListener('touchend', dragManager.handleTouchEnd);
        document.addEventListener('mousemove', (e) => resizeManager.handleResizeMove(e, { width: homePoster.offsetWidth, height: homePoster.offsetHeight }));
        document.addEventListener('mouseup', resizeManager.handleResizeEnd);
        document.addEventListener('touchmove', (e) => resizeManager.handleTouchResizeMove(e, { width: homePoster.offsetWidth, height: homePoster.offsetHeight }), { passive: false });
        document.addEventListener('touchend', resizeManager.handleTouchResizeEnd);
        
        // Exit swap mode when clicking outside tiles
        document.addEventListener('click', (e) => {
            if (isSwapModeActive && !e.target.closest('.concept-tile')) {
                exitSwapMode();
            }
        });
        
        // Exit swap mode with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isSwapModeActive) {
                exitSwapMode();
            }
        });
    }
    
    /**
     * Common tile interaction logic for both click and touch
     * @param {HTMLElement} tile - The tile element
     * @param {Event} event - The original event
     */
    function handleTileInteraction(tile, event) {
        if (!tile) return;

        // Don't trigger interaction when the resize handle is clicked/touched
        if (event.target.classList.contains('resize-handle')) {
            event.stopPropagation();
            return;
        }
        
        // Check for explicit resizing data attribute
        if (tile.dataset.resizing === 'true') {
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        // Check if we're in swap mode first
        if (isSwapModeActive) {
            const handled = handleSwapTileClick(tile);
            if (handled) {
                event.stopPropagation();
                event.preventDefault();
                return;
            }
        }
        
        // Get the concept ID and navigate to detail view
        const conceptId = tile.dataset.id;
        if (conceptId) {
            Router.navigate('detail', { id: conceptId });
        }
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

        const tile = event.target.closest('.concept-tile');
        handleTileInteraction(tile, event);
    }
    
    // Private variables for touch debouncing
    let lastTouchNavigationTime = 0;
    const TOUCH_NAVIGATION_DEBOUNCE = 500; // 500ms debounce
    
    /**
     * Handle tile touch end (for touchscreen click detection)
     * @param {TouchEvent} event - Touch end event
     */
    function handleTileTouchEnd(event) {
        // Debounce touch navigation to prevent rapid duplicate events
        const now = Date.now();
        if (now - lastTouchNavigationTime < TOUCH_NAVIGATION_DEBOUNCE) {
            return;
        }
        
        // Only handle if this is a simple tap (not part of drag/resize)
        if (dragManager.isDragging() || dragManager.recentlyDragged()) {
            return;
        }
        if (isResizing || recentlyResized) {
            return;
        }
        
        const tile = event.target.closest('.concept-tile');
        if (!tile) {
            return;
        }
        
        // Skip if touching resize handle
        if (event.target.classList.contains('resize-handle')) {
            return;
        }
        
        // Skip if tile is in resizing state
        if (tile.dataset.resizing === 'true') {
            return;
        }
        
        // Prevent the click event from also firing
        event.preventDefault();
        
        // Update touch navigation time before handling interaction
        lastTouchNavigationTime = Date.now();
        
        // Use shared interaction logic
        handleTileInteraction(tile, event);
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
                console.error('Error generating thumbnail for:', concept.id, error, {
                    stack: error.stack,
                    desmosUtilsState: typeof window.DesmosUtils !== 'undefined' ? 'present' : 'undefined',
                    calledDuring: document.visibilityState,
                    renderGeneration: currentRenderGeneration,
                    previewElementConnected: previewElement.isConnected
                });
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

    // --- SWAP MODE LOGIC ---
    function exitSwapMode() {
        isSwapModeActive = false;
        selectedTileForSwap = null;
        
        // Remove visual states from all tiles
        const allTiles = homePoster.querySelectorAll('.concept-tile');
        allTiles.forEach(tile => {
            tile.classList.remove('swap-selected', 'swap-target');
        });
        
        // Remove instruction
        hideSwapInstruction();
    }

    function showSwapInstruction(text) {
        hideSwapInstruction(); // Remove any existing instruction
        
        swapInstructionElement = document.createElement('div');
        swapInstructionElement.className = 'swap-instruction';
        swapInstructionElement.textContent = text;
        document.body.appendChild(swapInstructionElement);
    }

    function hideSwapInstruction() {
        if (swapInstructionElement && swapInstructionElement.parentNode) {
            swapInstructionElement.parentNode.removeChild(swapInstructionElement);
            swapInstructionElement = null;
        }
    }

    function handleSwapTileClick(tile) {
        if (!isSwapModeActive) return false;
        
        const tileId = tile.dataset.id;
        const concept = concepts.find(c => c.id === tileId);
        if (!concept) return false;
        
        if (!selectedTileForSwap) {
            // First tile selection
            selectedTileForSwap = { tile, concept };
            tile.classList.add('swap-selected');
            showSwapInstruction('Now click on the second tile to swap content with');
            
            // Add visual indication to other tiles
            const allTiles = homePoster.querySelectorAll('.concept-tile');
            allTiles.forEach(otherTile => {
                if (otherTile !== tile) {
                    otherTile.classList.add('swap-target');
                }
            });
        } else if (selectedTileForSwap.tile === tile) {
            // Clicking the same tile - deselect
            selectedTileForSwap = null;
            tile.classList.remove('swap-selected');
            showSwapInstruction('Click on the first tile to select it for swapping');
            
            // Remove target states
            const allTiles = homePoster.querySelectorAll('.concept-tile');
            allTiles.forEach(otherTile => {
                otherTile.classList.remove('swap-target');
            });
        } else {
            // Second tile selection - perform swap
            const destinationConcept = performContentSwap(selectedTileForSwap.concept, concept);
            exitSwapMode();
            
            // Stay on home view to see the swap result
            // User can manually navigate to whichever tile they want to view
        }
        
        return true; // Indicate that we handled the click
    }

    function performContentSwap(concept1, concept2) {
        // Push undo state before making changes
        safePushUndoState();
        
        // Swap the desmos states and descriptions
        const tempDesmosState = concept1.desmosState;
        const tempDescription = concept1.description;
        
        // Update concept 1 with concept 2's content
        const updatedConcept1 = ConceptModel.updateConcept(concept1, {
            desmosState: concept2.desmosState,
            description: concept2.description
        });
        
        // Update concept 2 with concept 1's content  
        const updatedConcept2 = ConceptModel.updateConcept(concept2, {
            desmosState: tempDesmosState,
            description: tempDescription
        });
        
        // Update concepts array
        const index1 = concepts.findIndex(c => c.id === concept1.id);
        const index2 = concepts.findIndex(c => c.id === concept2.id);
        
        if (index1 !== -1) concepts[index1] = updatedConcept1;
        if (index2 !== -1) concepts[index2] = updatedConcept2;
        
        // Save the updated concepts
        StorageManager.saveConcept(updatedConcept1);
        StorageManager.saveConcept(updatedConcept2);
        
        // Clear all thumbnails since we're using state-based caching
        if (window.DesmosUtils) {
            window.DesmosUtils.clearCache();
        }
        
        // Find and update the tiles
        const tile1 = homePoster.querySelector(`[data-id="${concept1.id}"]`);
        const tile2 = homePoster.querySelector(`[data-id="${concept2.id}"]`);
        
        if (tile1 && tile2) {
            // Update thumbnails for both tiles
            const preview1 = tile1.querySelector('.tile-preview');
            const preview2 = tile2.querySelector('.tile-preview');
            
            if (preview1) {
                preview1.innerHTML = ''; // Clear existing preview
                requestAnimationFrame(() => {
                    generateThumbnailWithRetry(updatedConcept1, preview1);
                });
            }
            
            if (preview2) {
                preview2.innerHTML = ''; // Clear existing preview
                requestAnimationFrame(() => {
                    generateThumbnailWithRetry(updatedConcept2, preview2);
                });
            }
        }
        
        // Show success message
        showSwapInstruction(`✓ Content swapped between ${concept1.displayName} and ${concept2.displayName}`);
        setTimeout(() => {
            hideSwapInstruction();
        }, 3000);
        
        // Return the destination concept (where the original content now lives)
        return updatedConcept2;
    }
    
    function startSwapModeWithConcept(conceptId) {
        // Wait a moment for the view to render, then start swap mode
        setTimeout(() => {
            const sourceTile = homePoster.querySelector(`[data-id="${conceptId}"]`);
            const sourceConcept = concepts.find(c => c.id === conceptId);
            
            if (sourceTile && sourceConcept) {
                // Enter swap mode
                isSwapModeActive = true;
                
                // Pre-select the source tile
                selectedTileForSwap = { tile: sourceTile, concept: sourceConcept };
                sourceTile.classList.add('swap-selected');
                
                // Show instruction for selecting target
                showSwapInstruction(`Select where to move "${sourceConcept.displayName}" content`);
                
                // Add target state to other tiles
                const allTiles = homePoster.querySelectorAll('.concept-tile');
                allTiles.forEach(otherTile => {
                    if (otherTile !== sourceTile) {
                        otherTile.classList.add('swap-target');
                    }
                });
            }
        }, 100);
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
            // Wait for container to have proper dimensions before re-rendering
            function waitForContainerResize() {
                const containerWidth = homePoster.offsetWidth;
                const containerHeight = homePoster.offsetHeight;
                if (containerWidth > 0 && containerHeight > 0) {
                    // Use immediate rendering for container size changes to enable real-time font resizing
                    immediateRenderTiles();
                } else {
                    // Container not ready yet, try again
                    requestAnimationFrame(waitForContainerResize);
                }
            }
            waitForContainerResize();
        }
    });
    
    // --- Listen for viewport changes from PWA manager ---
    window.addEventListener('viewportChanged', function() {
        if (homePoster && concepts.length > 0) {
            // Re-apply display settings when viewport changes
            if (window.PreferencesClient) {
                window.PreferencesClient.applyDisplaySettings();
            }
            // Re-render tiles after viewport change
            setTimeout(() => {
                immediateRenderTiles();
            }, 100);
        }
    });

    // --- Listen for screen fit mode changes specifically ---
    function handleScreenFitModeChange() {
        if (homePoster && concepts.length > 0) {
            // Force re-application of display settings and re-render tiles
            setTimeout(() => {
                if (window.PreferencesClient && window.PreferencesClient.applyDisplaySettings) {
                    window.PreferencesClient.applyDisplaySettings();
                }
                // Wait for DOM to update, then re-render
                requestAnimationFrame(() => {
                    immediateRenderTiles();
                });
            }, 100);
        }
    }
    
    // Listen for preference changes
    document.addEventListener('preferencesChanged', handleScreenFitModeChange);
    
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
            // Use immediate render for refresh to avoid timing issues after import
            immediateRenderTiles();
        },
        forceReRender: function() {
            // Force immediate re-rendering of tiles with proper container dimensions
            if (homePoster && concepts.length > 0) {
                // Apply display settings first to ensure container is properly sized
                if (window.PreferencesClient && window.PreferencesClient.applyDisplaySettings) {
                    window.PreferencesClient.applyDisplaySettings();
                }
                // Then re-render tiles after a brief delay to allow container sizing
                setTimeout(() => {
                    immediateRenderTiles();
                }, 50);
            }
        },
        startSwapMode: function(conceptId) {
            // Simple swap mode entry without URL manipulation
            if (conceptId) {
                startSwapModeWithConcept(conceptId);
            } else {
                // Start swap mode without pre-selecting a concept
                isSwapModeActive = true;
                showSwapInstruction('Click on the first tile to start swapping');
            }
        },
        exitSwapMode: function() {
            exitSwapMode();
        },
        getConcepts: function() {
            return concepts;
        },
        getResizeManager: function() {
            return resizeManager;
        },
        generateThumbnailWithRetry: generateThumbnailWithRetry,
        clearThumbnailQueue: function() {
            thumbnailQueue.clear();
        },
        cleanup: function() {
            // Clear any pending operations
            if (dragCooldownTimer) {
                clearTimeout(dragCooldownTimer);
                dragCooldownTimer = null;
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
            
            // Clean up swap mode
            exitSwapMode();
            isSwapModeActive = false;
            selectedTileForSwap = null;
            
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
