// tileRenderer.js
// Handles rendering and creation of tiles on the home poster for the Math Museums home view.

export function renderTilesOnPoster(homePoster, concepts, { handleResizeStart, handleTouchResizeStart, generateThumbnailWithRetry }) {
    // Clear the home poster
    homePoster.innerHTML = '';
    
    // Get container dimensions - use actual set dimensions if available, otherwise getBoundingClientRect
    let containerWidth, containerHeight;
    // Always use offsetWidth/offsetHeight for consistent dimensions
    containerWidth = homePoster.offsetWidth;
    containerHeight = homePoster.offsetHeight;
    
    console.log('renderTilesOnPoster using container:', containerWidth, 'x', containerHeight);
    
    const defaultTileWidth = 250;
    const defaultTileHeight = 200;
    const padding = 20;
    
    concepts.forEach((concept, index) => {
        const tile = createConceptTile(concept, handleResizeStart, handleTouchResizeStart, generateThumbnailWithRetry);
        homePoster.appendChild(tile);
        tile.style.position = 'absolute';
        
        // Use percentage-based coordinate system if available
        if (concept.coordinates && window.CoordinateUtils) {
            try {
                const coords = window.ConceptModel.getCoordinates(concept);
                
                // If coordinates are default center (50, 50) and we have an index, generate grid position
                if (coords.centerX === 50 && coords.centerY === 50 && index > 0) {
                    const col = index % 3;
                    const row = Math.floor(index / 3);
                    coords.centerX = 20 + (col * 30); // 20%, 50%, 80%
                    coords.centerY = 20 + (row * 30); // 20%, 50%, 80%
                    
                    // Update the concept with the new coordinates
                    const updatedConcept = window.ConceptModel.updateCoordinates(concept, coords);
                    concepts[index] = updatedConcept;
                    window.StorageManager.saveConcept(updatedConcept);
                }
                
                const pixelCoords = window.CoordinateUtils.percentageToPixels(
                    coords.centerX, coords.centerY, coords.width, coords.height,
                    containerWidth, containerHeight
                );
                
                tile.style.left = `${pixelCoords.x}px`;
                tile.style.top = `${pixelCoords.y}px`;
                tile.style.width = `${pixelCoords.width}px`;
                tile.style.height = `${pixelCoords.height}px`;
                return;
            } catch (error) {
                console.error('Error converting percentage coordinates:', error);
                // Fall back to pixel coordinates below
            }
        }
        
        // Fallback to legacy pixel coordinates
        let tileX, tileY;
        if (concept.x !== undefined && concept.y !== undefined) {
            tileX = concept.x;
            tileY = concept.y;
        } else if (concept.position && (concept.position.x !== 0 || concept.position.y !== 0)) {
            tileX = concept.position.x;
            tileY = concept.position.y;
        } else {
            const col = index % 3;
            const row = Math.floor(index / 3);
            tileX = padding + col * (defaultTileWidth + padding);
            tileY = padding + row * (defaultTileHeight + padding);
            concept.x = tileX;
            concept.y = tileY;
            concept.position = { x: tileX, y: tileY };
            StorageManager.saveConcept(concept);
        }
        tile.style.left = `${tileX}px`;
        tile.style.top = `${tileY}px`;
    });
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
                // Create image with direct URL
                const img = document.createElement('img');
                img.alt = `${concept.displayName} preview`;
                img.src = imageUrl;
                img.className = 'preview-image';
                img.draggable = false;
                
                // Prevent default drag behavior
                img.addEventListener('dragstart', (e) => e.preventDefault());
                img.addEventListener('drag', (e) => e.preventDefault());
                img.addEventListener('mousedown', (e) => e.preventDefault());
                
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