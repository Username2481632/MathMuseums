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
        undoStack.push(JSON.parse(JSON.stringify(getCurrentLayoutState())));
        if (undoStack.length > stackLimit) undoStack.shift();
        redoStack = [];
    }

    function undoLayout() {
        if (undoStack.length === 0) return;
        isRestoring = true;
        redoStack.push(JSON.parse(JSON.stringify(getCurrentLayoutState())));
        const prev = undoStack.pop();
        restoreLayoutState(prev);
        isRestoring = false;
    }

    function redoLayout() {
        if (redoStack.length === 0) return;
        isRestoring = true;
        undoStack.push(JSON.parse(JSON.stringify(getCurrentLayoutState())));
        const next = redoStack.pop();
        restoreLayoutState(next);
        isRestoring = false;
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