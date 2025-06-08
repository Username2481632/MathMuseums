// tileRenderer.js
// Handles rendering and creation of tiles on the home poster for the Math Museums home view.

export function renderTilesOnPoster(homePoster, concepts, { handleResizeStart, handleTouchResizeStart, generateThumbnailWithRetry }) {
    // console.log('=== renderTilesOnPoster called ===');
    // console.log('Input concepts:', concepts);
    // console.log('Concepts count:', concepts.length);
    // console.log('Concepts details:', concepts.map(c => ({ id: c.id, displayName: c.displayName, type: typeof c.id })));
    
    // AGGRESSIVE DATA VALIDATION - Filter out any corrupted concepts
    const validConcepts = concepts.filter(concept => {
        const isValid = concept && 
                       concept.id && 
                       concept.displayName && 
                       typeof concept.displayName === 'string' &&
                       concept.displayName !== 'undefined' &&
                       typeof concept.id === 'string' &&
                       concept.type;
        
        if (!isValid) {
            console.error('BLOCKING CORRUPTED CONCEPT FROM RENDER:', concept);
        }
        return isValid;
    });
    
    if (validConcepts.length !== concepts.length) {
        console.warn(`Blocked ${concepts.length - validConcepts.length} corrupted concepts from rendering`);
    }
    
    // Clear the home poster
    homePoster.innerHTML = '';
    // console.log('Cleared homePoster innerHTML');
    
    // Clear any pending thumbnail generation to prevent ghost tiles
    if (window.HomeController && window.HomeController.clearThumbnailQueue) {
        window.HomeController.clearThumbnailQueue();
        // console.log('Cleared thumbnail queue');
    }
    
    // Add a render generation ID to track this render cycle
    const renderGeneration = Date.now() + Math.random();
    homePoster.dataset.renderGeneration = renderGeneration;
    // console.log('Set render generation:', renderGeneration);
    
    // Remove duplicates based on concept ID
    const uniqueConcepts = [];
    const seenIds = new Set();
    for (const concept of validConcepts) {
        if (!seenIds.has(concept.id)) {
            seenIds.add(concept.id);
            uniqueConcepts.push(concept);
            // console.log('Added unique concept:', concept.id, concept.displayName);
        } else {
            // console.log('DUPLICATE DETECTED - Skipping concept:', concept.id, concept.displayName);
        }
    }
    
    // console.log('Original concepts:', concepts.length, 'Valid concepts:', validConcepts.length, 'Unique concepts:', uniqueConcepts.length);
    // console.log('Seen IDs:', Array.from(seenIds));
    
    // Get container dimensions - use actual set dimensions if available, otherwise getBoundingClientRect
    let containerWidth, containerHeight;
    containerWidth = homePoster.offsetWidth;
    containerHeight = homePoster.offsetHeight;

    const defaultTileWidth = 250;
    const defaultTileHeight = 200;
    const padding = 20;

    // --- DYNAMIC GRID LAYOUT ---
    // Calculate max columns that fit in the container
    const maxColumns = Math.max(1, Math.floor((containerWidth + padding) / (defaultTileWidth + padding)));
    const columns = Math.min(maxColumns, uniqueConcepts.length);
    const rows = Math.ceil(uniqueConcepts.length / columns);
    // Center grid horizontally and vertically
    const totalGridWidth = columns * defaultTileWidth + (columns - 1) * padding;
    const totalGridHeight = rows * defaultTileHeight + (rows - 1) * padding;
    const gridOffsetX = Math.max(0, Math.floor((containerWidth - totalGridWidth) / 2));
    const gridOffsetY = Math.max(0, Math.floor((containerHeight - totalGridHeight) / 2));

    uniqueConcepts.forEach((concept, index) => {
        const tile = createConceptTile(concept, handleResizeStart, handleTouchResizeStart, generateThumbnailWithRetry);
        homePoster.appendChild(tile);
        tile.style.position = 'absolute';

        // Always use grid layout for default/fallback
        const col = index % columns;
        const row = Math.floor(index / columns);
        const tileX = gridOffsetX + col * (defaultTileWidth + padding);
        const tileY = gridOffsetY + row * (defaultTileHeight + padding);
        tile.style.left = `${tileX}px`;
        tile.style.top = `${tileY}px`;
        tile.style.width = `${defaultTileWidth}px`;
        tile.style.height = `${defaultTileHeight}px`;
        // Optionally update concept position for persistence
        concept.x = tileX;
        concept.y = tileY;
        concept.width = defaultTileWidth;
        concept.height = defaultTileHeight;
        concept.position = { x: tileX, y: tileY };
        StorageManager.saveConcept(concept);
    });
    
    // console.log('=== renderTilesOnPoster completed ===');
    // console.log('Final homePoster children count:', homePoster.children.length);
    // console.log('Final tiles:', Array.from(homePoster.children).map(t => ({ id: t.dataset.id, class: t.className })));
}

function createConceptTile(concept, handleResizeStart, handleTouchResizeStart, generateThumbnailWithRetry) {
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
                console.log('tileRenderer: Using direct image URL for', concept.displayName, imageUrl);
                // Create image with direct URL
                const img = document.createElement('img');
                img.alt = `${concept.displayName} preview`;
                img.src = imageUrl;
                img.className = 'preview-image';
                img.draggable = false;
                
                // Prevent default drag behavior
                img.addEventListener('dragstart', (e) => e.preventDefault());
                img.addEventListener('drag', (e) => e.preventDefault());
                
                img.onload = () => {
                    console.log('tileRenderer: Direct image loaded successfully for', concept.displayName);
                };
                
                img.onerror = () => {
                    console.warn('tileRenderer: Direct image failed to load for', concept.displayName, 'falling back to thumbnail');
                    // Fall back to thumbnail generation if image loading fails
                    generateThumbnailWithRetry(concept, preview);
                };
                
                // Set a timeout as additional fallback in case the image never loads or errors
                setTimeout(() => {
                    if (!img.complete) {
                        console.warn('tileRenderer: Direct image timed out for', concept.displayName, 'falling back to thumbnail');
                        generateThumbnailWithRetry(concept, preview);
                    }
                }, 5000);
                
                // Replace loading with image
                preview.innerHTML = '';
                preview.appendChild(img);
            } else {
                console.log('tileRenderer: No direct image URL, generating thumbnail for', concept.displayName);
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