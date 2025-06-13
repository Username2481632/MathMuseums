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
    
    // Get the actual aspect-ratio container if present
    let container = homePoster;
    if (homePoster.closest('.aspect-ratio-content')) {
        container = homePoster.closest('.aspect-ratio-content');
    } else if (homePoster.closest('.aspect-ratio-container')) {
        container = homePoster.closest('.aspect-ratio-container');
    }
    
    // Use the homePoster's dimensions directly for percentage calculations
    // since that's the actual container where tiles are positioned
    let containerWidth = homePoster.offsetWidth;
    let containerHeight = homePoster.offsetHeight;

    // --- PERCENTAGE-BASED DYNAMIC GRID LAYOUT ---
    // Increased tile sizes and reduced padding for maximum space utilization
    let tileWidthPercent = 22;  // Increased from 18% to 22% for larger tiles
    let tileHeightPercent = 26; // Increased from 20% to 26% for larger tiles  
    const paddingPercent = 2; // Reduced from 3% to 2% for tighter spacing

    // Calculate max columns and rows that fit with percentage-based sizing
    const spacePerColumn = tileWidthPercent + paddingPercent;
    const spacePerRow = tileHeightPercent + paddingPercent;
    const maxColumns = Math.max(1, Math.floor((100 + paddingPercent) / spacePerColumn));
    const maxRows = Math.max(1, Math.floor((100 + paddingPercent) / spacePerRow));
    
    // Calculate initial grid dimensions
    let columns = Math.min(maxColumns, uniqueConcepts.length);
    let rows = Math.ceil(uniqueConcepts.length / columns);
    
    // If we need more rows than can fit, adjust the layout
    if (rows > maxRows) {
        // Option 1: Try increasing columns to reduce rows
        const minColumns = Math.ceil(uniqueConcepts.length / maxRows);
        if (minColumns <= maxColumns) {
            columns = minColumns;
            rows = Math.ceil(uniqueConcepts.length / columns);
        } else {
            // Option 2: We need to reduce tile sizes to fit everything
            const totalCells = uniqueConcepts.length;
            const aspectRatio = tileWidthPercent / tileHeightPercent;
            
            // Calculate optimal grid that fits in available space
            let bestColumns = 1;
            let bestRows = totalCells;
            let bestTileWidth = 0;
            let bestTileHeight = 0;
            
            // Try different column counts and find the one that gives largest tiles
            for (let testColumns = 1; testColumns <= totalCells; testColumns++) {
                const testRows = Math.ceil(totalCells / testColumns);
                
                // Calculate required tile sizes to fit this grid within 100% bounds
                const availableWidthPerTile = (100 - (testColumns - 1) * paddingPercent) / testColumns;
                const availableHeightPerTile = (100 - (testRows - 1) * paddingPercent) / testRows;
                
                // Maintain aspect ratio and use the smaller constraint
                let testTileWidth = Math.min(availableWidthPerTile, availableHeightPerTile * aspectRatio);
                let testTileHeight = testTileWidth / aspectRatio;
                
                // Ensure tiles don't exceed available space
                if (testTileHeight > availableHeightPerTile) {
                    testTileHeight = availableHeightPerTile;
                    testTileWidth = testTileHeight * aspectRatio;
                }
                
                // If this gives larger tiles and fits within bounds, use it
                if (testTileWidth > bestTileWidth) {
                    bestColumns = testColumns;
                    bestRows = testRows;
                    bestTileWidth = testTileWidth;
                    bestTileHeight = testTileHeight;
                }
            }
            
            columns = bestColumns;
            rows = bestRows;
            tileWidthPercent = bestTileWidth;
            tileHeightPercent = bestTileHeight;
        }
    }
    
    // Center grid horizontally and vertically using percentages
    const totalGridWidthPercent = columns * tileWidthPercent + (columns - 1) * paddingPercent;
    const totalGridHeightPercent = rows * tileHeightPercent + (rows - 1) * paddingPercent;
    const gridOffsetXPercent = Math.max(0, (100 - totalGridWidthPercent) / 2);
    const gridOffsetYPercent = Math.max(0, (100 - totalGridHeightPercent) / 2);

    uniqueConcepts.forEach((concept, index) => {
        const tile = createConceptTile(concept, handleResizeStart, handleTouchResizeStart, generateThumbnailWithRetry);
        homePoster.appendChild(tile);
        tile.style.position = 'absolute';

        // Check if concept already has coordinates (e.g., from import)
        const existingCoords = ConceptModel.getCoordinates(concept);
        const hasExistingCoords = concept.coordinates && 
                                 concept.coordinates.centerX !== undefined && 
                                 concept.coordinates.centerY !== undefined;

        if (hasExistingCoords) {
            // Use existing coordinates from concept (e.g., imported positions)
            const containerWidth = homePoster.offsetWidth || 800; // fallback width
            const containerHeight = homePoster.offsetHeight || 600; // fallback height
            
            const pixelCoords = window.CoordinateUtils.percentageToPixels(
                existingCoords.centerX, existingCoords.centerY,
                existingCoords.width, existingCoords.height,
                containerWidth, containerHeight
            );
            
            tile.style.left = `${pixelCoords.x}px`;
            tile.style.top = `${pixelCoords.y}px`;
            tile.style.width = `${pixelCoords.width}px`;
            tile.style.height = `${pixelCoords.height}px`;
        } else {
            // Use default grid layout for new concepts
            const col = index % columns;
            const row = Math.floor(index / columns);
            
            // Calculate percentage positions
            const tileXPercent = gridOffsetXPercent + col * (tileWidthPercent + paddingPercent);
            const tileYPercent = gridOffsetYPercent + row * (tileHeightPercent + paddingPercent);
            
            // Apply percentage-based positioning and sizing
            tile.style.left = `${tileXPercent}%`;
            tile.style.top = `${tileYPercent}%`;
            tile.style.width = `${tileWidthPercent}%`;
            tile.style.height = `${tileHeightPercent}%`;

            // Store percentage coordinates in concept for persistence
            concept.coordinates = concept.coordinates || {};
            concept.coordinates.centerX = tileXPercent + (tileWidthPercent / 2);
            concept.coordinates.centerY = tileYPercent + (tileHeightPercent / 2);
            concept.coordinates.width = tileWidthPercent;
            concept.coordinates.height = tileHeightPercent;
            StorageManager.saveConcept(concept);
        }
    });
    
    // After rendering all tiles, use FontSizer for immediate optimal font sizing
    if (window.FontSizer) {
        window.FontSizer.forceAdjustment();
    }
    
    // console.log('=== renderTilesOnPoster completed ===');
    // console.log('Final homePoster children count:', homePoster.children.length);
    // console.log('Final tiles:', Array.from(homePoster.children).map(t => ({ id: t.dataset.id, class: t.className })));
}

function createConceptTile(concept, handleResizeStart, handleTouchResizeStart, generateThumbnailWithRetry) {
    // Create the tile element
    const tile = document.createElement('div');
    tile.className = 'concept-tile';
    tile.dataset.id = concept.id;
    
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
    
    // Check for cached thumbnail first (fastest path)
    const cachedThumbnail = window.DesmosUtils ? window.DesmosUtils.getCachedThumbnail(concept.desmosState, concept.id) : null;
    
    if (cachedThumbnail) {
        // Use cached thumbnail immediately - no delay, no async calls
        const img = document.createElement('img');
        img.alt = `${concept.displayName} preview`;
        img.src = cachedThumbnail;
        img.className = 'preview-image';
        img.draggable = false;
        img.addEventListener('dragstart', (e) => e.preventDefault());
        img.addEventListener('drag', (e) => e.preventDefault());
        preview.appendChild(img);
    } else {
        // Keep blank until thumbnail is ready - no loading indicator
        // Use requestAnimationFrame to defer generation and not block rendering
        requestAnimationFrame(() => {
            generateThumbnailWithRetry(concept, preview);
        });
    }
    content.appendChild(preview);
    tile.appendChild(content);
    
    // Add resize handles
    const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    positions.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${pos}`;
        handle.dataset.position = pos;
        handle.addEventListener('mousedown', handleResizeStart);
        handle.addEventListener('touchstart', handleTouchResizeStart);
        tile.appendChild(handle);
    });
    
    return tile;
}