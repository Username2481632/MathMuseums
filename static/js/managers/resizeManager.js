// resizeManager.js
// Encapsulates resize logic for concept tiles

export function createResizeManager({ onStart, onUpdate, onFinish, getTileById, pushUndoState, constrainDimensions, dragManager }) {
    let isResizing = false;
    let resizingTile = null;
    let resizeHandle = null;
    let originalSize = { width: 0, height: 0 };
    let originalPosition = { x: 0, y: 0 };
    let resizeStartPos = { x: 0, y: 0 };
    let recentlyResized = false;
    let resizeCooldownTimer = null;

    function handleResizeStart(event) {
        event.preventDefault();
        event.stopPropagation();
        resizeHandle = event.target;
        resizingTile = resizeHandle.closest('.concept-tile');
        if (!resizingTile) return;
        pushUndoState && pushUndoState();
        isResizing = true;
        resizingTile.classList.add('resizing');
        resizingTile.style.zIndex = '100';
        
        // Get the actual rendered size and position from bounding rect, not CSS styles
        const rect = resizingTile.getBoundingClientRect();
        const container = resizingTile.closest('.tiles-container');
        const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
        
        originalSize = {
            width: rect.width,
            height: rect.height
        };
        originalPosition = {
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top
        };
        resizeStartPos = {
            x: event.clientX,
            y: event.clientY
        };
        onStart && onStart(resizingTile, resizeHandle);
    }

    function handleResizeMove(event, containerRect) {
        if (!isResizing || !resizingTile || !resizeHandle) return;
        event.preventDefault();
        event.stopPropagation();
        const deltaX = event.clientX - resizeStartPos.x;
        const deltaY = event.clientY - resizeStartPos.y;
        const position = resizeHandle.dataset.position;
        let newWidth = originalSize.width;
        let newHeight = originalSize.height;
        let newX = originalPosition.x;
        let newY = originalPosition.y;
        let adjustWidthFromLeft = false;
        let adjustHeightFromTop = false;
        if (position === 'top-left') {
            newWidth = Math.max(50, originalSize.width - deltaX);
            newHeight = Math.max(50, originalSize.height - deltaY);
            newX = originalPosition.x + originalSize.width - newWidth;
            newY = originalPosition.y + originalSize.height - newHeight;
            adjustWidthFromLeft = true;
            adjustHeightFromTop = true;
        } else if (position === 'top-right') {
            newWidth = Math.max(50, originalSize.width + deltaX);
            newHeight = Math.max(50, originalSize.height - deltaY);
            newY = originalPosition.y + originalSize.height - newHeight;
            adjustHeightFromTop = true;
        } else if (position === 'bottom-left') {
            newWidth = Math.max(50, originalSize.width - deltaX);
            newHeight = Math.max(50, originalSize.height + deltaY);
            newX = originalPosition.x + originalSize.width - newWidth;
            adjustWidthFromLeft = true;
        } else if (position === 'bottom-right') {
            newWidth = Math.max(50, originalSize.width + deltaX);
            newHeight = Math.max(50, originalSize.height + deltaY);
        }
        const constrained = constrainDimensions({
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            adjustWidthFromLeft,
            adjustHeightFromTop
        }, containerRect);
        onUpdate && onUpdate(resizingTile, constrained);
        resizingTile.dataset.resizing = 'true';
    }

    function handleResizeEnd() {
        if (!isResizing || !resizingTile) return;
        resizingTile.classList.remove('resizing');
        resizingTile.style.zIndex = '1';
        if (resizingTile.dataset.resizing) delete resizingTile.dataset.resizing;
        onFinish && onFinish(resizingTile);
        recentlyResized = true;
        if (resizeCooldownTimer) clearTimeout(resizeCooldownTimer);
        resizeCooldownTimer = setTimeout(() => { recentlyResized = false; }, 500);
        isResizing = false;
        resizingTile = null;
        resizeHandle = null;
    }

    function handleTouchResizeStart(event) {
        if (!event.target.classList.contains('resize-handle')) return;
        event.preventDefault();
        event.stopPropagation(); // Prevent conflicts with global touch tracking
        
        resizeHandle = event.target;
        resizingTile = resizeHandle.closest('.concept-tile');
        if (!resizingTile) return;
        
        pushUndoState && pushUndoState();
        isResizing = true;
        resizingTile.classList.add('resizing');
        resizingTile.style.zIndex = '100';
        
        // Get the actual rendered size and position from bounding rect, not CSS styles
        const rect = resizingTile.getBoundingClientRect();
        const container = resizingTile.closest('.tiles-container');
        const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
        
        originalSize = {
            width: rect.width,
            height: rect.height
        };
        originalPosition = {
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top
        };
        resizeStartPos = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
        onStart && onStart(resizingTile, resizeHandle);
    }

    function handleTouchResizeMove(event, containerRect) {
        if (!isResizing || !resizingTile || !resizeHandle) return;
        event.preventDefault();
        event.stopPropagation();
        const deltaX = event.touches[0].clientX - resizeStartPos.x;
        const deltaY = event.touches[0].clientY - resizeStartPos.y;
        const position = resizeHandle.dataset.position;
        let newWidth = originalSize.width;
        let newHeight = originalSize.height;
        let newX = originalPosition.x;
        let newY = originalPosition.y;
        let adjustWidthFromLeft = false;
        let adjustHeightFromTop = false;
        if (position === 'top-left') {
            newWidth = Math.max(50, originalSize.width - deltaX);
            newHeight = Math.max(50, originalSize.height - deltaY);
            newX = originalPosition.x + originalSize.width - newWidth;
            newY = originalPosition.y + originalSize.height - newHeight;
            adjustWidthFromLeft = true;
            adjustHeightFromTop = true;
        } else if (position === 'top-right') {
            newWidth = Math.max(50, originalSize.width + deltaX);
            newHeight = Math.max(50, originalSize.height - deltaY);
            newY = originalPosition.y + originalSize.height - newHeight;
            adjustHeightFromTop = true;
        } else if (position === 'bottom-left') {
            newWidth = Math.max(50, originalSize.width - deltaX);
            newHeight = Math.max(50, originalSize.height + deltaY);
            newX = originalPosition.x + originalSize.width - newWidth;
            adjustWidthFromLeft = true;
        } else if (position === 'bottom-right') {
            newWidth = Math.max(50, originalSize.width + deltaX);
            newHeight = Math.max(50, originalSize.height + deltaY);
        }
        const constrained = constrainDimensions({
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            adjustWidthFromLeft,
            adjustHeightFromTop
        }, containerRect);
        onUpdate && onUpdate(resizingTile, constrained);
        resizingTile.dataset.resizing = 'true';
    }

    function handleTouchResizeEnd() {
        // Don't handle resize end if dragging is active or recently ended
        if (dragManager && (dragManager.isDragging() || dragManager.recentlyDragged())) {
            return;
        }
        
        if (!isResizing || !resizingTile) return;
        
        pushUndoState && pushUndoState();
        resizingTile.classList.remove('resizing');
        resizingTile.style.zIndex = '1';
        if (resizingTile.dataset.resizing) delete resizingTile.dataset.resizing;
        onFinish && onFinish(resizingTile);
        recentlyResized = true;
        if (resizeCooldownTimer) clearTimeout(resizeCooldownTimer);
        resizeCooldownTimer = setTimeout(() => { recentlyResized = false; }, 500);
        isResizing = false;
        resizingTile = null;
        resizeHandle = null;
    }

    function cleanup() {
        if (resizeCooldownTimer) clearTimeout(resizeCooldownTimer);
        isResizing = false;
        resizingTile = null;
        resizeHandle = null;
    }

    return {
        handleResizeStart,
        handleResizeMove,
        handleResizeEnd,
        handleTouchResizeStart,
        handleTouchResizeMove,
        handleTouchResizeEnd,
        isResizing: () => isResizing,
        recentlyResized: () => recentlyResized,
        cleanup
    };
} 