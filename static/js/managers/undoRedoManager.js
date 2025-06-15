// undoRedo.js
// Provides undo/redo stack management for layout editing (runtime data only)

export function createUndoRedoManager({ getCurrentLayoutState, restoreLayoutState, stackLimit = 100 }) {
    let undoStack = [];
    let redoStack = [];
    let isRestoring = false;

    function pushUndoState() {
        if (isRestoring) {
            return; // Don't push state during undo/redo operations
        }
        
        const currentState = getCurrentLayoutState();
        // Normalize coordinates to prevent floating-point precision issues
        const normalizedState = normalizeCoordinates(currentState);
        const currentStateStr = JSON.stringify(normalizedState);
        
        // Check if the current state is different from the last saved state
        if (undoStack.length > 0) {
            const lastState = undoStack[undoStack.length - 1];
            const lastStateStr = JSON.stringify(lastState);
            if (currentStateStr === lastStateStr) {
                // Current state is identical to last saved state, skip pushing
                return;
            }
        }
        
        undoStack.push(JSON.parse(currentStateStr));
        if (undoStack.length > stackLimit) undoStack.shift();
        redoStack = [];
    }

    /**
     * Normalize coordinates to prevent floating-point precision issues
     * @param {Array} state - Array of concept states with coordinates
     * @returns {Array} Normalized state
     */
    function normalizeCoordinates(state) {
        if (!Array.isArray(state)) return state;
        
        return state.map(conceptState => ({
            ...conceptState,
            coordinates: {
                ...conceptState.coordinates,
                centerX: Math.round(conceptState.coordinates.centerX * 1000) / 1000,
                centerY: Math.round(conceptState.coordinates.centerY * 1000) / 1000,
                width: Math.round(conceptState.coordinates.width * 1000) / 1000,
                height: Math.round(conceptState.coordinates.height * 1000) / 1000
            }
        }));
    }

    function undoLayout() {
        if (undoStack.length === 0) {
            return;
        }
        
        isRestoring = true;
        // Also set global restoration flag to prevent marking as dirty during restoration
        if (window.App) window.App.isRestoring = true;
        
        // Save current state to redo stack
        const currentState = getCurrentLayoutState();
        redoStack.push(JSON.parse(JSON.stringify(currentState)));
        
        // Get previous state from undo stack
        const prev = undoStack.pop();
        
        // Restore the previous state
        restoreLayoutState(prev);
        
        isRestoring = false;
        // Reset global restoration flag
        if (window.App) window.App.isRestoring = false;
        
        // Mark as dirty if App is available and initialized
        if (window.App && window.App.markDirty) {
            window.App.markDirty();
        }
    }

    function redoLayout() {
        if (redoStack.length === 0) {
            return;
        }
        
        isRestoring = true;
        // Also set global restoration flag to prevent marking as dirty during restoration
        if (window.App) window.App.isRestoring = true;
        
        // Save current state to undo stack
        const currentState = getCurrentLayoutState();
        undoStack.push(JSON.parse(JSON.stringify(currentState)));
        
        // Get next state from redo stack
        const next = redoStack.pop();
        
        // Restore the next state
        restoreLayoutState(next);
        
        isRestoring = false;
        // Reset global restoration flag
        if (window.App) window.App.isRestoring = false;
        
        // Mark as dirty if App is available and initialized
        if (window.App && window.App.markDirty) {
            window.App.markDirty();
        }
    }

    function clearStacks() {
        undoStack = [];
        redoStack = [];
    }

    function getStackSizes() {
        return {
            undoCount: undoStack.length,
            redoCount: redoStack.length
        };
    }

    return {
        pushUndoState,
        undoLayout,
        redoLayout,
        clearStacks,
        getStackSizes
    };
} 