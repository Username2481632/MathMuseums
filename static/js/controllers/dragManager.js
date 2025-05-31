// dragManager.js
// Encapsulates drag-and-drop logic for concept tiles

export function createDragManager({ onStart, onUpdate, onFinish, getTileById, pushUndoState }) {
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
        const longPressTimer = setTimeout(() => {
            const conceptId = tile.dataset.id;
            const concept = getTileById(conceptId);
            if (!concept) return;
            startDragging(tile, event.touches[0].clientX, event.touches[0].clientY);
        }, 500);
        tile.addEventListener('touchend', () => clearTimeout(longPressTimer), { once: true });
        tile.addEventListener('touchcancel', () => clearTimeout(longPressTimer), { once: true });
    }

    function startDragging(tile, clientX, clientY) {
        pushUndoState && pushUndoState();
        isDragging = true;
        draggedTile = tile;
        draggedTile.classList.add('dragging');
        const tileRect = draggedTile.getBoundingClientRect();
        dragOffset.x = clientX - tileRect.left;
        dragOffset.y = clientY - tileRect.top;
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