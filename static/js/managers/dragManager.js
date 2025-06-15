// dragManager.js
// Encapsulates drag-and-drop logic for concept tiles

export function createDragManager({ onStart, onUpdate, onFinish, getTileById, pushUndoState, getContainer }) {
    let isDragging = false;
    let draggedTile = null;
    let dragOffset = { x: 0, y: 0 };
    let recentlyDragged = false;
    let dragCooldownTimer = null;

    function handleTileMouseDown(event) {
        const tile = event.target.closest('.concept-tile');
        if (!tile) return;
        const longPressTimer = setTimeout(() => {
            const conceptId = tile.dataset.id;
            const concept = getTileById(conceptId);
            if (!concept) return;
            startDragging(tile, event.clientX, event.clientY);
        }, 500);
        tile.addEventListener('mouseup', () => clearTimeout(longPressTimer), { once: true });
        tile.addEventListener('mouseleave', () => clearTimeout(longPressTimer), { once: true });
    }

    function handleTileTouchStart(event) {
        const tile = event.target.closest('.concept-tile');
        if (!tile) return;
        
        // Skip if touching resize handle
        if (event.target.classList.contains('resize-handle')) {
            return;
        }
        
        // Stop event propagation to prevent conflicts with global touch tracking
        event.stopPropagation();
        
        // Don't prevent default here - let the touch end handler decide
        
        let longPressTriggered = false;
        
        const longPressTimer = setTimeout(() => {
            longPressTriggered = true;
            const conceptId = tile.dataset.id;
            const concept = getTileById(conceptId);
            if (!concept) return;
            
            // Prevent default here to stop click events after long press
            event.preventDefault();
            startDragging(tile, event.touches[0].clientX, event.touches[0].clientY);
        }, 500);
        
        // Add cleanup listeners with proper event handling
        const cleanup = () => {
            clearTimeout(longPressTimer);
        };
        
        const handleTouchEnd = () => {
            clearTimeout(longPressTimer);
            // If long press was triggered, prevent the click
            if (longPressTriggered) {
                event.preventDefault();
            }
        };
        
        tile.addEventListener('touchend', handleTouchEnd, { once: true });
        tile.addEventListener('touchcancel', cleanup, { once: true });
        tile.addEventListener('touchmove', cleanup, { once: true }); // Cancel on move
    }

    function startDragging(tile, clientX, clientY) {
        pushUndoState && pushUndoState();
        onStart && onStart(tile);
        isDragging = true;
        draggedTile = tile;
        draggedTile.classList.add('dragging');
        
        // Get both tile and container rects for proper coordinate calculation
        const tileRect = draggedTile.getBoundingClientRect();
        const container = getContainer && getContainer();
        const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
        
        // Calculate drag offset relative to container coordinates, not viewport
        const tileContainerX = tileRect.left - containerRect.left;
        const tileContainerY = tileRect.top - containerRect.top;
        const mouseContainerX = clientX - containerRect.left;
        const mouseContainerY = clientY - containerRect.top;
        
        dragOffset.x = mouseContainerX - tileContainerX;
        dragOffset.y = mouseContainerY - tileContainerY;
        
        draggedTile.style.zIndex = '100';
        onStart && onStart(tile, clientX, clientY);
        updateTilePosition(clientX, clientY);
    }

    function handleMouseMove(event) {
        if (!isDragging) return;
        event.preventDefault();
        updateTilePosition(event.clientX, event.clientY);
    }

    function handleTouchMove(event) {
        if (!isDragging) return;
        event.preventDefault();
        event.stopPropagation(); // Prevent interference with global touch tracking
        updateTilePosition(event.touches[0].clientX, event.touches[0].clientY);
    }

    function updateTilePosition(clientX, clientY) {
        if (!draggedTile) return;
        onUpdate && onUpdate(draggedTile, clientX, clientY, dragOffset);
    }

    function handleMouseUp() {
        if (!isDragging) return;
        finishDragging();
    }

    function handleTouchEnd() {
        if (!isDragging) return;
        
        // Stop propagation to prevent conflicts
        event && event.stopPropagation();
        
        finishDragging();
    }

    function finishDragging() {
        if (!draggedTile) return;
        isDragging = false;
        recentlyDragged = true;
        if (dragCooldownTimer) clearTimeout(dragCooldownTimer);
        dragCooldownTimer = setTimeout(() => { recentlyDragged = false; }, 300);
        draggedTile.classList.remove('dragging');
        draggedTile.style.zIndex = '1';
        onFinish && onFinish(draggedTile);
        draggedTile = null;
    }

    function cleanup() {
        if (dragCooldownTimer) clearTimeout(dragCooldownTimer);
        isDragging = false;
        draggedTile = null;
    }

    return {
        handleTileMouseDown,
        handleTileTouchStart,
        handleMouseMove,
        handleTouchMove,
        handleMouseUp,
        handleTouchEnd,
        isDragging: () => isDragging,
        recentlyDragged: () => recentlyDragged,
        cleanup
    };
} 