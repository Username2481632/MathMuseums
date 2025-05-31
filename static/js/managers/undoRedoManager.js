// undoRedo.js
// Provides undo/redo stack management for layout editing (with localStorage persistence)

export function createUndoRedoManager({ getCurrentLayoutState, restoreLayoutState, stackLimit = 100, undoKey = 'mm_undoStack', redoKey = 'mm_redoStack' }) {
    let undoStack = [];
    let redoStack = [];

    function saveStacks() {
        try {
            localStorage.setItem(undoKey, JSON.stringify(undoStack));
            localStorage.setItem(redoKey, JSON.stringify(redoStack));
        } catch (e) {
            // Ignore quota errors
        }
    }

    function loadStacks() {
        try {
            const u = localStorage.getItem(undoKey);
            const r = localStorage.getItem(redoKey);
            undoStack = u ? JSON.parse(u) : [];
            redoStack = r ? JSON.parse(r) : [];
        } catch (e) {
            undoStack = [];
            redoStack = [];
        }
    }

    function pushUndoState() {
        undoStack.push(JSON.parse(JSON.stringify(getCurrentLayoutState())));
        if (undoStack.length > stackLimit) undoStack.shift();
        redoStack = [];
        saveStacks();
    }

    function undoLayout() {
        if (undoStack.length === 0) return;
        redoStack.push(JSON.parse(JSON.stringify(getCurrentLayoutState())));
        const prev = undoStack.pop();
        restoreLayoutState(prev);
        saveStacks();
    }

    function redoLayout() {
        if (redoStack.length === 0) return;
        undoStack.push(JSON.parse(JSON.stringify(getCurrentLayoutState())));
        const next = redoStack.pop();
        restoreLayoutState(next);
        saveStacks();
    }

    return {
        pushUndoState,
        undoLayout,
        redoLayout,
        saveStacks,
        loadStacks
    };
} 