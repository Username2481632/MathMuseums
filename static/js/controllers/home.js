/**
 * Home Controller
 * Manages the home view with draggable tile grid
 */
const HomeController = (function() {
    // Private variables
    let tilesContainer;
    let concepts = [];
    let isDragging = false;
    let draggedTile = null;
    let dragOffset = { x: 0, y: 0 };
    let saveTimeout;
    let recentlyDragged = false; // Track whether dragging just ended
    let dragCooldownTimer = null; // Timer for drag cooldown
    let thumbnailQueue = []; // Queue for thumbnail generation to prevent overloading

    // Undo/Redo stacks for layout editing
    let undoStack = [];
    let redoStack = [];

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
        return concepts.map(concept => ({
            id: concept.id,
            x: concept.x,
            y: concept.y,
            width: concept.width,
            height: concept.height
        }));
    }
    
    // Helper: Restore layout state
    function restoreLayoutState(state) {
        if (!Array.isArray(state)) return;
        for (const s of state) {
            const concept = concepts.find(c => c.id === s.id);
            if (concept) {
                concept.x = s.x;
                concept.y = s.y;
                concept.width = s.width;
                concept.height = s.height;
            }
        }
        renderConceptTiles();
    }
    
    // Helper: Push current layout to undo stack
    function pushUndoState() {
        undoStack.push(JSON.parse(JSON.stringify(getCurrentLayoutState())));
        // Limit stack size if desired
        if (undoStack.length > 100) undoStack.shift();
        // Clear redo stack on new action
        redoStack = [];
    }
    
    // Undo action
    function undoLayout() {
        if (undoStack.length === 0) return;
        redoStack.push(JSON.parse(JSON.stringify(getCurrentLayoutState())));
        const prev = undoStack.pop();
        restoreLayoutState(prev);
    }
    
    // Redo action
    function redoLayout() {
        if (redoStack.length === 0) return;
        undoStack.push(JSON.parse(JSON.stringify(getCurrentLayoutState())));
        const next = redoStack.pop();
        restoreLayoutState(next);
    }
    
    /**
     * Initialize the home controller
     */
    async function init() {
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
     * Render the home view
     */
    function render() {
        // Get the app container
        const appContainer = document.getElementById('app-container');
        
        // Clear the container
        appContainer.innerHTML = '';
        
        // Clone the template
        const template = document.getElementById('home-template');
        const homeView = template.content.cloneNode(true);
        
        // Append the home view to the container
        appContainer.appendChild(homeView);
        
        // Get the tiles container
        tilesContainer = document.querySelector('.tiles-container');
        
        // Render the concept tiles
        renderConceptTiles();
    }
    
    /**
     * Render the concept tiles
     */
    function renderConceptTiles() {
        // Clear the tiles container
        tilesContainer.innerHTML = '';
        
        // Get container dimensions for initial positioning
        const containerRect = tilesContainer.getBoundingClientRect();
        const defaultTileWidth = 250; // Default width for new tiles
        const defaultTileHeight = 200; // Default height for new tiles
        const padding = 20; // Padding between tiles
        
        // Create and append tiles for each concept
        concepts.forEach((concept, index) => {
            const tile = createConceptTile(concept);
            tilesContainer.appendChild(tile);
            
            // Always use absolute positioning
            tile.style.position = 'absolute';
            
            // If concept has saved position, use it
            if (concept.position && (concept.position.x !== 0 || concept.position.y !== 0)) {
                tile.style.left = `${concept.position.x}px`;
                tile.style.top = `${concept.position.y}px`;
            } else {
                // Otherwise position in a grid pattern (3 columns)
                const col = index % 3;
                const row = Math.floor(index / 3);
                const x = padding + col * (defaultTileWidth + padding);
                const y = padding + row * (defaultTileHeight + padding);
                
                // Update concept position
                concept.position = { x, y };
                StorageManager.saveConcept(concept);
                
                // Set tile position
                tile.style.left = `${x}px`;
                tile.style.top = `${y}px`;
            }
        });
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
        
        // Apply tile size if it exists
        if (concept.size) {
            tile.style.width = `${concept.size.width}px`;
            tile.style.height = `${concept.size.height}px`;
        } else {
            // Use default size if not set
            tile.style.width = '250px';
            tile.style.height = '200px';
            // Update the concept with default size
            concept.size = { width: 250, height: 200 };
            StorageManager.saveConcept(concept);
        }
        
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
     * Setup event listeners for tiles and dragging
     */
    function setupEventListeners() {
        // Add click event to tiles container for delegation
        tilesContainer.addEventListener('click', handleTileClick);
        
        // Add mousedown event for drag start
        tilesContainer.addEventListener('mousedown', handleTileMouseDown);
        
        // Add touch events for mobile drag
        tilesContainer.addEventListener('touchstart', handleTileTouchStart);
        
        // Add document-level event listeners for drag operations
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        
        // Add document-level event listeners for resize operations
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
        document.addEventListener('touchmove', handleTouchResizeMove, { passive: false });
        document.addEventListener('touchend', handleTouchResizeEnd);
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
     * Handle tile mouse down
     * @param {MouseEvent} event - Mouse down event
     */
    function handleTileMouseDown(event) {
        // Find the tile element
        const tile = event.target.closest('.concept-tile');
        if (!tile) {
            return;
        }
        
        // Start a timer for long press
        const longPressTimer = setTimeout(() => {
            // Get the concept ID
            const conceptId = tile.dataset.id;
            
            // Find the concept
            const concept = concepts.find(c => c.id === conceptId);
            if (!concept) {
                return;
            }
            
            // Start dragging
            startDragging(tile, event.clientX, event.clientY);
        }, 500); // 500ms for long press
        
        // Clear the timer on mouse up
        tile.addEventListener('mouseup', () => clearTimeout(longPressTimer), { once: true });
        tile.addEventListener('mouseleave', () => clearTimeout(longPressTimer), { once: true });
    }
    
    /**
     * Handle tile touch start
     * @param {TouchEvent} event - Touch start event
     */
    function handleTileTouchStart(event) {
        // Find the tile element
        const tile = event.target.closest('.concept-tile');
        if (!tile) {
            return;
        }
        
        // Start a timer for long press
        const longPressTimer = setTimeout(() => {
            // Get the concept ID
            const conceptId = tile.dataset.id;
            
            // Find the concept
            const concept = concepts.find(c => c.id === conceptId);
            if (!concept) {
                return;
            }
            
            // Start dragging
            startDragging(tile, event.touches[0].clientX, event.touches[0].clientY);
        }, 500); // 500ms for long press
        
        // Clear the timer on touch end
        tile.addEventListener('touchend', () => clearTimeout(longPressTimer), { once: true });
        tile.addEventListener('touchcancel', () => clearTimeout(longPressTimer), { once: true });
    }
    
    /**
     * Start dragging a tile
     * @param {HTMLElement} tile - Tile element
     * @param {number} clientX - Client X coordinate
     * @param {number} clientY - Client Y coordinate
     */
    function startDragging(tile, clientX, clientY) {
        isDragging = true;
        draggedTile = tile;
        
        // Add dragging class
        draggedTile.classList.add('dragging');
        
        // Ensure we're working with the resolved current position
        const tileRect = draggedTile.getBoundingClientRect();
        
        // Calculate offset from cursor to tile corner
        dragOffset.x = clientX - tileRect.left;
        dragOffset.y = clientY - tileRect.top;
        
        // Set the z-index higher for dragging
        draggedTile.style.zIndex = '100';
        
        // Move the tile to the current position
        updateTilePosition(clientX, clientY);
    }
    
    /**
     * Handle mouse move
     * @param {MouseEvent} event - Mouse move event
     */
    function handleMouseMove(event) {
        if (!isDragging) {
            return;
        }
        
        event.preventDefault();
        updateTilePosition(event.clientX, event.clientY);
    }
    
    /**
     * Handle touch move
     * @param {TouchEvent} event - Touch move event
     */
    function handleTouchMove(event) {
        if (!isDragging) {
            return;
        }
        
        event.preventDefault();
        updateTilePosition(event.touches[0].clientX, event.touches[0].clientY);
    }
    
    /**
     * Update tile position during dragging
     * @param {number} clientX - Client X coordinate
     * @param {number} clientY - Client Y coordinate
     */
    function updateTilePosition(clientX, clientY) {
        if (!draggedTile) return;
        
        // Calculate new position relative to container
        const containerRect = tilesContainer.getBoundingClientRect();
        
        // Get the padding values for consistent constraints
        const padding = getContainerPadding();
        
        // Calculate position where the cursor is
        const x = clientX - containerRect.left - dragOffset.x;
        const y = clientY - containerRect.top - dragOffset.y;
        
        // Get the tile's current size
        const tileWidth = parseInt(draggedTile.style.width, 10) || 250; // Default to 250 if not set
        const tileHeight = parseInt(draggedTile.style.height, 10) || 200; // Default to 200 if not set
        
        // Constrain to container bounds with padding
        const minX = padding.left;
        const minY = padding.top;
        const maxX = containerRect.width - padding.right - tileWidth;
        const maxY = containerRect.height - padding.bottom - tileHeight;
        
        const constrainedX = Math.max(minX, Math.min(x, maxX));
        const constrainedY = Math.max(minY, Math.min(y, maxY));
        
        // Apply position directly (no animation)
        draggedTile.style.left = `${constrainedX}px`;
        draggedTile.style.top = `${constrainedY}px`;
    }
    
    /**
     * Handle mouse up
     * @param {MouseEvent} event - Mouse up event
     */
    function handleMouseUp() {
        if (!isDragging) {
            return;
        }
        
        finishDragging();
    }
    
    /**
     * Handle touch end
     * @param {TouchEvent} event - Touch end event
     */
    function handleTouchEnd() {
        if (!isDragging) {
            return;
        }
        
        finishDragging();
    }
    
    /**
     * Finish dragging and save position
     */
    function finishDragging() {
        pushUndoState(); // Save state for undo
        if (!draggedTile) return;
        
        // Reset dragging state
        isDragging = false;
        
        // Set recently dragged flag to prevent click events
        recentlyDragged = true;
        
        // Clear any existing cooldown timer
        if (dragCooldownTimer) {
            clearTimeout(dragCooldownTimer);
        }
        
        // Reset the recently dragged flag after a short delay
        dragCooldownTimer = setTimeout(() => {
            recentlyDragged = false;
        }, 300); // 300ms cooldown before clicks are registered again
        
        // Remove dragging class and reset z-index
        draggedTile.classList.remove('dragging');
        draggedTile.style.zIndex = '1';
        
        // Get the concept ID
        const conceptId = draggedTile.dataset.id;
        
        // Find the concept
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) {
            draggedTile = null;
            return;
        }
        
        // Update concept position
        const position = {
            x: parseInt(draggedTile.style.left, 10),
            y: parseInt(draggedTile.style.top, 10)
        };
        
        // Update concept and save to storage
        const updatedConcept = ConceptModel.updateConcept(concept, { position });
        
        // Update the concept in the array
        const index = concepts.findIndex(c => c.id === conceptId);
        if (index !== -1) {
            concepts[index] = updatedConcept;
        }
        
        // Save immediately to ensure position is preserved
        StorageManager.saveConcept(updatedConcept);
        
        draggedTile = null;
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
        const containerRect = tilesContainer.getBoundingClientRect();
        
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
        const containerRect = tilesContainer.getBoundingClientRect();
        
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
    
    /**
     * Constrain resize dimensions to stay within container bounds
     * @param {Object} dimensions - The dimensions to constrain {x, y, width, height}
     * @param {DOMRect} containerRect - The container rectangle
     * @returns {Object} - The constrained dimensions
     */
    function constrainResizeDimensions(dimensions, containerRect) {
        // Get container dimensions with padding
        const padding = getContainerPadding();
        
        // Make a copy to avoid modifying the original object
        let result = { ...dimensions };
        
        // Enforce minimum size
        result.width = Math.max(200, result.width);
        result.height = Math.max(150, result.height);
        
        // Apply max constraints
        result.width = Math.min(500, result.width);
        result.height = Math.min(400, result.height);
        
        // Handle left boundary
        if (result.x < padding.left) {
            const overflow = padding.left - result.x;
            result.x = padding.left;
            
            // If we're dragging from left side, adjust width
            if (result.adjustWidthFromLeft) {
                result.width = Math.max(200, result.width - overflow);
            }
        }
        
        // Handle top boundary
        if (result.y < padding.top) {
            const overflow = padding.top - result.y;
            result.y = padding.top;
            
            // If we're dragging from top side, adjust height
            if (result.adjustHeightFromTop) {
                result.height = Math.max(150, result.height - overflow);
            }
        }
        
        // Handle right boundary
        const rightEdge = containerRect.width - padding.right;
        if (result.x + result.width > rightEdge) {
            const overflow = (result.x + result.width) - rightEdge;
            
            // If we're dragging from right side, adjust width
            if (!result.adjustWidthFromLeft) {
                result.width = Math.max(200, result.width - overflow);
            } else {
                // Otherwise adjust position and maintain width
                result.width = Math.max(200, result.width);
                result.x = Math.min(result.x, rightEdge - result.width);
            }
        }
        
        // Handle bottom boundary
        const bottomEdge = containerRect.height - padding.bottom;
        if (result.y + result.height > bottomEdge) {
            const overflow = (result.y + result.height) - bottomEdge;
            
            // If we're dragging from bottom side, adjust height
            if (!result.adjustHeightFromTop) {
                result.height = Math.max(150, result.height - overflow);
            } else {
                // Otherwise adjust position and maintain height
                result.height = Math.max(150, result.height);
                result.y = Math.min(result.y, bottomEdge - result.height);
            }
        }
        
        return result;
    }
    
    /**
     * Get container padding values
     * @returns {Object} Object containing padding values
     */
    function getContainerPadding() {
        return {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
        };
    }
    
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
            if (tilesContainer) {
                tilesContainer.removeEventListener('click', handleTileClick);
                tilesContainer.removeEventListener('mousedown', handleTileMouseDown);
                tilesContainer.removeEventListener('touchstart', handleTileTouchStart);
            }
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            
            // Remove resize event listeners
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
            
            // Remove touch resize event listeners
            tilesContainer.removeEventListener('touchstart', handleTouchResizeStart);
            document.removeEventListener('touchmove', handleTouchResizeMove);
            document.removeEventListener('touchend', handleTouchResizeEnd);
        }
    };
})();
