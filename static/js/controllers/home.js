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
    let thumbnailQueue = []; // Queue for thumbnail generation to prevent overloading

    // Undo/Redo manager for layout editing
    const undoRedoManager = createUndoRedoManager({
        getCurrentLayoutState,
        restoreLayoutState
    });

    // Drag manager
    const dragManager = createDragManager({
        onStart: () => {},
        onUpdate: (tile, clientX, clientY, dragOffset) => {
            // Calculate new position relative to container
            const containerRect = homePoster.getBoundingClientRect();
            const padding = getHomePosterPadding();
            const x = clientX - containerRect.left - dragOffset.x;
            const y = clientY - containerRect.top - dragOffset.y;
            const tileWidth = parseInt(tile.style.width, 10) || 250;
            const tileHeight = parseInt(tile.style.height, 10) || 200;
            const minX = padding.left;
            const minY = padding.top;
            const maxX = containerRect.width - padding.right - tileWidth;
            const maxY = containerRect.height - padding.bottom - tileHeight;
            const constrainedX = Math.max(minX, Math.min(x, maxX));
            const constrainedY = Math.max(minY, Math.min(y, maxY));
            tile.style.left = `${constrainedX}px`;
            tile.style.top = `${constrainedY}px`;
        },
        onFinish: (tile) => {
            const conceptId = tile.dataset.id;
            const concept = concepts.find(c => c.id === conceptId);
            if (!concept) return;
            const position = {
                x: parseInt(tile.style.left, 10),
                y: parseInt(tile.style.top, 10)
            };
            const updatedConcept = ConceptModel.updateConcept(concept, { position });
            const index = concepts.findIndex(c => c.id === conceptId);
            if (index !== -1) concepts[index] = updatedConcept;
            StorageManager.saveConcept(updatedConcept);
        },
        getTileById: id => concepts.find(c => c.id === id),
        pushUndoState: () => undoRedoManager.pushUndoState()
    });

    // Resize manager
    const resizeManager = createResizeManager({
        onStart: () => {},
        onUpdate: (tile, constrained) => {
            tile.style.width = `${constrained.width}px`;
            tile.style.height = `${constrained.height}px`;
            tile.style.left = `${constrained.x}px`;
            tile.style.top = `${constrained.y}px`;
        },
        onFinish: (tile) => {
            const conceptId = tile.dataset.id;
            const concept = concepts.find(c => c.id === conceptId);
            if (!concept) return;
            const size = {
                width: parseInt(tile.style.width, 10),
                height: parseInt(tile.style.height, 10)
            };
            const position = {
                x: parseInt(tile.style.left, 10),
                y: parseInt(tile.style.top, 10)
            };
            const updatedConcept = ConceptModel.updateConcept(concept, { size, position });
            const index = concepts.findIndex(c => c.id === conceptId);
            if (index !== -1) concepts[index] = updatedConcept;
            StorageManager.saveConcept(updatedConcept);
        },
        getTileById: id => concepts.find(c => c.id === id),
        pushUndoState: () => undoRedoManager.pushUndoState(),
        constrainDimensions: constrainResizeDimensions
    });

    // Resize variables
    let isResizing = false;
    let resizingTile = null;
    let resizeHandle = null;
    let originalSize = { width: 0, height: 0 };
    let originalPosition = { x: 0, y: 0 };
    let resizeStartPos = { x: 0, y: 0 };
    let recentlyResized = false; // Track whether resize just ended
    let resizeCooldownTimer = null; // Timer for resize cooldown

    // Helper: Get current layout state (positions/sizes of all tiles)
    function getCurrentLayoutState() {
        const state = concepts.map(concept => {
            // Extract position and size from the nested objects (used by drag/resize handlers)
            const x = concept.position?.x ?? concept.x ?? 0;
            const y = concept.position?.y ?? concept.y ?? 0;
            const width = concept.size?.width ?? concept.width ?? 250;
            const height = concept.size?.height ?? concept.height ?? 200;
            
            return {
                id: concept.id,
                x: x,
                y: y,
                width: width,
                height: height
            };
        });
        
        return state;
    }
    
    // Helper: Restore layout state
    function restoreLayoutState(state) {
        if (!Array.isArray(state)) return;
        for (const s of state) {
            const conceptIndex = concepts.findIndex(c => c.id === s.id);
            if (conceptIndex !== -1) {
                const concept = concepts[conceptIndex];
                
                // Update using the same format as the drag/resize handlers
                const updatedConcept = ConceptModel.updateConcept(concept, {
                    position: { x: s.x, y: s.y },
                    size: { width: s.width, height: s.height }
                });
                
                // Update the concept in the array
                concepts[conceptIndex] = updatedConcept;
                
                // Save to storage to maintain persistence
                StorageManager.saveConcept(updatedConcept);
            }
        }
        renderTilesOnPoster(homePoster, concepts, { handleResizeStart, handleTouchResizeStart });
    }
    
    /**
     * Initialize the home controller
     */
    async function init() {
        // Restore undo/redo stacks from localStorage
        undoRedoManager.loadStacks();
        
        // Get concepts from storage
        concepts = await loadConcepts();
        
        // Render the home view
        render();
        
        // Setup event listeners
        setupEventListeners();
    }
    
    /**
     * Load concepts from storage
     * @returns {Array} Array of concept objects
     */
    async function loadConcepts() {
        let concepts = await StorageManager.getAllConcepts();
        
        // If no concepts found, create defaults
        if (!concepts || concepts.length === 0) {
            concepts = ConceptModel.createAllConcepts();
            
            // Save default concepts
            for (const concept of concepts) {
                await StorageManager.saveConcept(concept);
            }
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
        renderTilesOnPoster(homePoster, concepts, { handleResizeStart, handleTouchResizeStart });
    }
    
    /**
     * Create a concept tile element
     * @param {Object} concept - Concept data
     * @returns {HTMLElement} Tile element
     */
    function createConceptTile(concept) {
        // Create the tile element
        const tile = document.createElement('div');
        tile.className = 'concept-tile';
        tile.dataset.id = concept.id;
        
        // Apply tile size - check for both formats (width/height and size.width/height)
        let tileWidth, tileHeight;
        if (concept.width !== undefined && concept.height !== undefined) {
            tileWidth = concept.width;
            tileHeight = concept.height;
        } else if (concept.size) {
            tileWidth = concept.size.width;
            tileHeight = concept.size.height;
        } else {
            // Use default size if not set
            tileWidth = 250;
            tileHeight = 200;
            // Update the concept with default size
            concept.width = tileWidth;
            concept.height = tileHeight;
            concept.size = { width: tileWidth, height: tileHeight };
            StorageManager.saveConcept(concept);
        }
        
        tile.style.width = `${tileWidth}px`;
        tile.style.height = `${tileHeight}px`;
        
        // Create the tile header
        const header = document.createElement('div');
        header.className = 'tile-header';
        header.textContent = concept.displayName;
        tile.appendChild(header);
        
        // Create the tile content
        const content = document.createElement('div');
        content.className = 'tile-content';
        
        // Create the preview area
        const preview = document.createElement('div');
        preview.className = 'tile-preview';
        
        // Add a status indicator
        const status = document.createElement('div');
        status.className = `tile-status ${concept.isComplete ? 'complete' : 'in-progress'}`;
        tile.appendChild(status);
        
        // If the concept has a Desmos state with an image, show preview
        if (ConceptModel.hasImage(concept)) {
            try {
                // First show loading state
                preview.innerHTML = '<div class="loading-preview"></div>';
                
                // Try to extract direct image URL first (faster approach)
                const imageUrl = DesmosUtils.extractImageUrl(concept.desmosState);
                
                if (imageUrl) {
                    // Create image with direct URL
                    const img = document.createElement('img');
                    img.alt = `${concept.displayName} preview`;
                    img.src = imageUrl;
                    img.className = 'preview-image';
                    img.onerror = () => {
                        // Fall back to thumbnail generation if image loading fails
                        generateThumbnailWithRetry(concept, preview);
                    };
                    
                    // Replace loading with image
                    preview.innerHTML = '';
                    preview.appendChild(img);
                } else {
                    // Generate thumbnail using hidden calculator
                    generateThumbnailWithRetry(concept, preview);
                }
            } catch (error) {
                console.error('Error creating preview:', error);
                preview.innerHTML = '<div class="preview-error">Preview unavailable</div>';
            }
        } else {
            // Show placeholder
            preview.innerHTML = '<div class="no-preview">No image yet</div>';
        }
        
        content.appendChild(preview);
        tile.appendChild(content);
        
        // Add resize handles
        const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        positions.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${pos}`;
            handle.dataset.position = pos;
            
            // Add mouse down event for resize start
            handle.addEventListener('mousedown', handleResizeStart);
            // Add touch start event for resize start
            handle.addEventListener('touchstart', handleTouchResizeStart);
            
            tile.appendChild(handle);
        });
        
        return tile;
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
        document.addEventListener('mousemove', (e) => resizeManager.handleResizeMove(e, homePoster.getBoundingClientRect()));
        document.addEventListener('mouseup', resizeManager.handleResizeEnd);
        document.addEventListener('touchmove', (e) => resizeManager.handleTouchResizeMove(e, homePoster.getBoundingClientRect()), { passive: false });
        document.addEventListener('touchend', resizeManager.handleTouchResizeEnd);
    }
    
    /**
     * Handle tile click
     * @param {MouseEvent} event - Click event
     */
    function handleTileClick(event) {
        // Ignore clicks during drag operations
        if (isDragging) {
            return;
        }
        
        // Ignore clicks during resize operations
        if (isResizing) {
            return;
        }
        
        // Ignore clicks immediately after dragging (prevents detail view opening after drag)
        if (recentlyDragged) {
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
     * Handle resize start
     * @param {MouseEvent} event - Mouse down event
     */
    function handleResizeStart(event) {
        // Prevent default and stop propagation to avoid triggering other events
        event.preventDefault();
        event.stopPropagation();
        
        // Get the resize handle and tile
        resizeHandle = event.target;
        resizingTile = resizeHandle.closest('.concept-tile');
        
        if (!resizingTile) {
            return;
        }
        
        // Set resizing flag
        pushUndoState(); // Save state before resizing starts
        isResizing = true;
        
        // Add resizing class
        resizingTile.classList.add('resizing');
        
        // Set z-index higher for resizing
        resizingTile.style.zIndex = '100';
        
        // Store original size and position
        originalSize = {
            width: parseInt(resizingTile.style.width, 10),
            height: parseInt(resizingTile.style.height, 10)
        };
        
        originalPosition = {
            x: parseInt(resizingTile.style.left, 10),
            y: parseInt(resizingTile.style.top, 10)
        };
        
        // Store the start position
        resizeStartPos = {
            x: event.clientX,
            y: event.clientY
        };
    }
    
    /**
     * Handle resize move
     * @param {MouseEvent} event - Mouse move event
     */
    function handleResizeMove(event) {
        if (!isResizing || !resizingTile || !resizeHandle) {
            return;
        }
        
        // Prevent default to avoid text selection
        event.preventDefault();
        // Stop propagation to prevent other handlers from triggering
        event.stopPropagation();
        
        // Calculate delta from start position
        const deltaX = event.clientX - resizeStartPos.x;
        const deltaY = event.clientY - resizeStartPos.y;
        
        // Get the handle's position
        const position = resizeHandle.dataset.position;
        
        // Calculate new size and position based on which handle is being dragged
        let newWidth = originalSize.width;
        let newHeight = originalSize.height;
        let newX = originalPosition.x;
        let newY = originalPosition.y;
        let adjustWidthFromLeft = false;
        let adjustHeightFromTop = false;
        
        if (position === 'top-left') {
            newWidth = Math.max(200, originalSize.width - deltaX);
            newHeight = Math.max(150, originalSize.height - deltaY);
            newX = originalPosition.x + originalSize.width - newWidth;
            newY = originalPosition.y + originalSize.height - newHeight;
            adjustWidthFromLeft = true;
            adjustHeightFromTop = true;
        } else if (position === 'top-right') {
            newWidth = Math.max(200, originalSize.width + deltaX);
            newHeight = Math.max(150, originalSize.height - deltaY);
            newY = originalPosition.y + originalSize.height - newHeight;
            adjustHeightFromTop = true;
        } else if (position === 'bottom-left') {
            newWidth = Math.max(200, originalSize.width - deltaX);
            newHeight = Math.max(150, originalSize.height + deltaY);
            newX = originalPosition.x + originalSize.width - newWidth;
            adjustWidthFromLeft = true;
        } else if (position === 'bottom-right') {
            newWidth = Math.max(200, originalSize.width + deltaX);
            newHeight = Math.max(150, originalSize.height + deltaY);
        }
        
        // Get container dimensions
        const containerRect = homePoster.getBoundingClientRect();
        
        // Apply constraints using the shared function
        const constrained = constrainResizeDimensions({
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            adjustWidthFromLeft,
            adjustHeightFromTop
        }, containerRect);
        
        // Update tile size and position
        resizingTile.style.width = `${constrained.width}px`;
        resizingTile.style.height = `${constrained.height}px`;
        resizingTile.style.left = `${constrained.x}px`;
        resizingTile.style.top = `${constrained.y}px`;
        
        // Add a data attribute to explicitly mark as being resized
        // This helps prevent any click events from triggering
        resizingTile.dataset.resizing = 'true';
    }
    
    /**
     * Handle resize end
     * @param {MouseEvent} event - Mouse up event
     */
    function handleResizeEnd() {
        if (!isResizing || !resizingTile) {
            return;
        }
        
        // Remove resizing class
        resizingTile.classList.remove('resizing');
        
        // Reset z-index
        resizingTile.style.zIndex = '1';
        
        // Remove the resizing data attribute
        if (resizingTile.dataset.resizing) {
            delete resizingTile.dataset.resizing;
        }
        
        // Get the concept ID
        const conceptId = resizingTile.dataset.id;
        
        // Find the concept
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) {
            isResizing = false;
            resizingTile = null;
            resizeHandle = null;
            return;
        }
        
        // Update concept size and position
        const size = {
            width: parseInt(resizingTile.style.width, 10),
            height: parseInt(resizingTile.style.height, 10)
        };
        
        const position = {
            x: parseInt(resizingTile.style.left, 10),
            y: parseInt(resizingTile.style.top, 10)
        };
        
        // Update concept and save to storage
        const updatedConcept = ConceptModel.updateConcept(concept, { size, position });
        
        // Update the concept in the array
        const index = concepts.findIndex(c => c.id === conceptId);
        if (index !== -1) {
            concepts[index] = updatedConcept;
        }
        
        // Save to storage immediately
        StorageManager.saveConcept(updatedConcept);
        
        // Set recently resized flag to prevent click events
        recentlyResized = true;
        
        // Clear any existing cooldown timer
        if (resizeCooldownTimer) {
            clearTimeout(resizeCooldownTimer);
        }
        
        // Reset the recently resized flag after a short delay
        resizeCooldownTimer = setTimeout(() => {
            recentlyResized = false;
        }, 500); // 500ms cooldown before clicks are registered again (increased for better prevention)
        
        // Reset resizing state
        isResizing = false;
        resizingTile = null;
        resizeHandle = null;
    }
    
    /**
     * Handle touch resize start
     * @param {TouchEvent} event - Touch start event
     */
    function handleTouchResizeStart(event) {
        // Only proceed if it's a touch on a resize handle
        if (!event.target.classList.contains('resize-handle')) {
            return;
        }
        
        // Prevent default to avoid scrolling
        event.preventDefault();
        event.stopPropagation();
        
        // Get the resize handle and tile
        resizeHandle = event.target;
        resizingTile = resizeHandle.closest('.concept-tile');
        
        if (!resizingTile) {
            return;
        }
        
        // Set resizing flag
        pushUndoState(); // Save state before resizing starts
        isResizing = true;
        
        // Add resizing class
        resizingTile.classList.add('resizing');
        
        // Set z-index higher for resizing
        resizingTile.style.zIndex = '100';
        
        // Store original size and position
        originalSize = {
            width: parseInt(resizingTile.style.width, 10),
            height: parseInt(resizingTile.style.height, 10)
        };
        
        originalPosition = {
            x: parseInt(resizingTile.style.left, 10),
            y: parseInt(resizingTile.style.top, 10)
        };
        
        // Store the start position
        resizeStartPos = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
    }
    
    /**
     * Handle touch resize move
     * @param {TouchEvent} event - Touch move event
     */
    function handleTouchResizeMove(event) {
        if (!isResizing || !resizingTile || !resizeHandle) {
            return;
        }
        
        // Prevent default to avoid scrolling
        event.preventDefault();
        // Stop propagation to prevent other handlers from triggering
        event.stopPropagation();
        
        // Calculate delta from start position
        const deltaX = event.touches[0].clientX - resizeStartPos.x;
        const deltaY = event.touches[0].clientY - resizeStartPos.y;
        
        // Get the handle's position
        const position = resizeHandle.dataset.position;
        
        // Calculate new size and position based on which handle is being dragged
        let newWidth = originalSize.width;
        let newHeight = originalSize.height;
        let newX = originalPosition.x;
        let newY = originalPosition.y;
        let adjustWidthFromLeft = false;
        let adjustHeightFromTop = false;
        
        if (position === 'top-left') {
            newWidth = Math.max(200, originalSize.width - deltaX);
            newHeight = Math.max(150, originalSize.height - deltaY);
            newX = originalPosition.x + originalSize.width - newWidth;
            newY = originalPosition.y + originalSize.height - newHeight;
            adjustWidthFromLeft = true;
            adjustHeightFromTop = true;
        } else if (position === 'top-right') {
            newWidth = Math.max(200, originalSize.width + deltaX);
            newHeight = Math.max(150, originalSize.height - deltaY);
            newY = originalPosition.y + originalSize.height - newHeight;
            adjustHeightFromTop = true;
        } else if (position === 'bottom-left') {
            newWidth = Math.max(200, originalSize.width - deltaX);
            newHeight = Math.max(150, originalSize.height + deltaY);
            newX = originalPosition.x + originalSize.width - newWidth;
            adjustWidthFromLeft = true;
        } else if (position === 'bottom-right') {
            newWidth = Math.max(200, originalSize.width + deltaX);
            newHeight = Math.max(150, originalSize.height + deltaY);
        }
        
        // Get container dimensions
        const containerRect = homePoster.getBoundingClientRect();
        
        // Apply constraints using the shared function
        const constrained = constrainResizeDimensions({
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            adjustWidthFromLeft,
            adjustHeightFromTop
        }, containerRect);
        
        // Update tile size and position
        resizingTile.style.width = `${constrained.width}px`;
        resizingTile.style.height = `${constrained.height}px`;
        resizingTile.style.left = `${constrained.x}px`;
        resizingTile.style.top = `${constrained.y}px`;
        
        // Add a data attribute to explicitly mark as being resized
        // This helps prevent any click events from triggering
        resizingTile.dataset.resizing = 'true';
    }
    
    /**
     * Handle touch resize end
     * @param {TouchEvent} event - Touch end event
     */
    function handleTouchResizeEnd(event) {
        pushUndoState(); // Save state for undo
        if (!isResizing || !resizingTile) {
            return;
        }

        // Remove resizing class
        resizingTile.classList.remove('resizing');

        // Reset z-index
        resizingTile.style.zIndex = '1';

        // Remove the resizing data attribute
        if (resizingTile.dataset.resizing) {
            delete resizingTile.dataset.resizing;
        }

        // Get the concept ID
        const conceptId = resizingTile.dataset.id;

        // Find the concept
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) {
            isResizing = false;
            resizingTile = null;
            resizeHandle = null;
            return;
        }

        // Update concept size and position
        const updatedConcept = ConceptModel.updateConcept(concept, {
            size: {
                width: parseInt(resizingTile.style.width, 10),
                height: parseInt(resizingTile.style.height, 10)
            },
            position: {
                x: parseInt(resizingTile.style.left, 10),
                y: parseInt(resizingTile.style.top, 10)
            }
        });

        // Update the concept in the array
        const index = concepts.findIndex(c => c.id === conceptId);
        if (index !== -1) {
            concepts[index] = updatedConcept;
        }

        // Save immediately to ensure size/position is preserved
        StorageManager.saveConcept(updatedConcept);

        // Set recently resized flag to prevent click events
        recentlyResized = true;

        // Clear any existing cooldown timer
        if (resizeCooldownTimer) {
            clearTimeout(resizeCooldownTimer);
        }

        // Reset the recently resized flag after a short delay
        resizeCooldownTimer = setTimeout(() => {
            recentlyResized = false;
        }, 500);

        // Reset resizing state
        isResizing = false;
        resizingTile = null;
        resizeHandle = null;
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
            
            DesmosUtils.generateThumbnail(concept.desmosState)
                .then(dataUrl => {
                    // Clear from queue
                    thumbnailQueue[queueIndex] = null;
                    
                    // Create image with generated thumbnail
                    const img = document.createElement('img');
                    img.alt = `${concept.displayName} preview`;
                    img.src = dataUrl;
                    img.className = 'preview-image';
                    
                    // Replace loading with image
                    if (previewElement.isConnected) {
                        previewElement.innerHTML = '';
                        previewElement.appendChild(img);
                    }
                })
                .catch(error => {
                    // Clear from queue
                    thumbnailQueue[queueIndex] = null;
                    
                    console.error('Error generating thumbnail:', error);
                    
                    // Retry if under the limit
                    if (retryCount < MAX_RETRIES && previewElement.isConnected) {
                        console.log(`Retrying thumbnail generation (${retryCount + 1}/${MAX_RETRIES})`);
                        generateThumbnailWithRetry(concept, previewElement, retryCount + 1);
                    } else if (previewElement.isConnected) {
                        previewElement.innerHTML = '<div class="preview-error">Preview unavailable</div>';
                    }
                });
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
        setTimeout(() => {
            applyScreenFitMode(getSavedScreenFitMode());
            setupScreenFitListeners();
        }, 0);
    };

    // --- Keyboard Undo/Redo Shortcuts ---
    document.addEventListener('keydown', function(e) {
        // Only trigger if home view is visible
        const homeView = document.getElementById('home-view');
        if (!homeView || (homeView.style.display === 'none')) return;
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undoLayout();
        } else if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key.toLowerCase() === 'z') || e.key.toLowerCase() === 'y')) {
            e.preventDefault();
            redoLayout();
        }
    });

    // --- Listen for containerSized event from preferences.js ---
    document.addEventListener('containerSized', function() {
        if (homePoster && concepts.length > 0) {
            renderTilesOnPoster(homePoster, concepts, { handleResizeStart, handleTouchResizeStart });
        }
    });

    // Public API
    return {
        init,
        render,
        cleanup: function() {
            // Clear any pending operations
            if (dragCooldownTimer) {
                clearTimeout(dragCooldownTimer);
                dragCooldownTimer = null;
            }
            
            // Clear thumbnail queue
            thumbnailQueue = [];
            
            // Clean up Desmos calculator resources
            DesmosUtils.cleanup();
            
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
            
            // Remove resize event listeners
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
            
            // Remove touch resize event listeners
            homePoster.removeEventListener('touchstart', handleTouchResizeStart);
            document.removeEventListener('touchmove', handleTouchResizeMove);
            document.removeEventListener('touchend', handleTouchResizeEnd);
        }
    };
})();

window.HomeController = HomeController;
window.renderTilesOnPoster = renderTilesOnPoster;
