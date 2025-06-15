/**
 * File Manager
 * Handles local file operations for user data storage
 */
const FileManager = (function() {
    
    // File format version for future compatibility
    const FILE_FORMAT_VERSION = '1.0';
    
    // Track last saved file handle and filename for autosave
    let lastFileHandle = null;
    let lastFilename = null;
    
    /**
     * Create the data structure for export
     * @returns {Promise<Object>} User data object
     */
    async function createExportData() {
        try {
            // Get current session concept data for export (includes coordinates and z-index)
            const concepts = await StorageManager.getAllConcepts();
            
            const userName = '';
            
            const exportData = {
                version: FILE_FORMAT_VERSION,
                exportDate: new Date().toISOString(),
                userName: userName,
                concepts: concepts || [], // Each concept includes position, size, z-index if set
                // layoutState removed - coordinates are stored in concepts themselves
                metadata: {
                    totalConcepts: (concepts || []).length
                }
            };
            
            return exportData;
        } catch (error) {
            console.error('Error creating export data:', error);
            throw new Error('Failed to prepare data for export');
        }
    }
    
    /**
     * Get the default filename from preferences
     * @returns {string} Export filename with placeholders substituted
     */
    function getDefaultFilename() {
        return window.PreferencesClient?.getExportFilename();
    }

    /**
     * Download user data as a JSON file
     * @param {string} filename - Optional custom filename
     * @returns {Promise<boolean>} Success status
     */
    async function downloadUserData(filename) {
        // Use preferences filename if no custom filename provided
        if (!filename) {
            filename = getDefaultFilename();
        }
        try {
            const data = await createExportData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/octet-stream' });

            // Try File System Access API (for supported browsers)
            if (window.showSaveFilePicker) {
                try {
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [
                            {
                                description: 'Math Museums File',
                                accept: { 'application/octet-stream': ['.mathmuseums'] }
                            }
                        ]
                    });
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    
                    // Store for autosave
                    lastFileHandle = fileHandle;
                    lastFilename = filename;
                    
                    // Reset dirty flag and update sync status if App is available
                    if (window.App && window.App.resetDirtyFlag && window.App.setSyncStatus) {
                        window.App.resetDirtyFlag();
                        window.App.setSyncStatus('saved');
                    }
                    
                    return true;
                } catch (fsError) {
                    // If user cancels, error has name 'AbortError' or 'AbortError' in message
                    if (fsError && (fsError.name === 'AbortError' || (fsError.message && fsError.message.includes('AbortError')))) {
                        // User cancelled, abort without fallback
                        return false;
                    }
                    // Otherwise, fall back to download
                    console.warn('File System Access API failed, falling back to download:', fsError);
                }
            }

            // Fallback: Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;

            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            URL.revokeObjectURL(url);

            // Store filename for autosave
            lastFilename = filename;

            // Reset dirty flag and update sync status if App is available
            if (window.App && window.App.resetDirtyFlag && window.App.setSyncStatus) {
                window.App.resetDirtyFlag();
                window.App.setSyncStatus('saved');
            }

            return true;
        } catch (error) {
            console.error('Error downloading user data:', error);
            throw error;
        }
    }
    
    /**
     * Autosave to the last saved file without showing Save As dialog
     * @returns {Promise<boolean>} Success status
     */
    async function autosaveUserData() {
        try {
            const data = await createExportData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/octet-stream' });

            // Try to use existing file handle first
            if (lastFileHandle) {
                try {
                    const writable = await lastFileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    return true;
                } catch (fsError) {
                    console.warn('Failed to autosave to existing file handle:', fsError);
                    // Clear invalid handle and fall back
                    lastFileHandle = null;
                }
            }

            // Fallback: Use download with last filename if available
            if (lastFilename) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = lastFilename;

                // Trigger download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Clean up
                URL.revokeObjectURL(url);

                return true;
            }

            // No previous save location - cannot autosave
            console.warn('No previous save location for autosave');
            return false;

        } catch (error) {
            console.error('Error during autosave:', error);
            throw error;
        }
    }
    
    /**
     * Check if autosave is available (user has saved before this session)
     * @returns {boolean} True if autosave can work
     */
    function canAutosave() {
        return !!(lastFileHandle || lastFilename);
    }

    /**
     * Parse and validate imported data
     * @param {Object} data - Imported data object
     * @returns {Object} Validated data
     */
    function validateImportData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid file format: Not a valid JSON object');
        }
        
        if (!data.version) {
            throw new Error('Invalid file format: Missing version information');
        }
        
        if (!data.concepts || !Array.isArray(data.concepts)) {
            throw new Error('Invalid file format: Missing or invalid concepts data');
        }
        
        // Validate each concept
        data.concepts.forEach((concept, index) => {
            if (!concept.id || !concept.displayName) {
                throw new Error(`Invalid concept at index ${index}: Missing required fields`);
            }
            
            // Validate coordinates if present
            if (concept.coordinates) {
                const coords = concept.coordinates;
                if (typeof coords.centerX === 'number' && typeof coords.centerY === 'number') {
                    // Valid coordinate data - ensure bounds are reasonable
                    if (coords.centerX < 0 || coords.centerX > 100 || coords.centerY < 0 || coords.centerY > 100) {
                        console.warn(`Concept ${concept.id} has coordinates outside normal bounds - will be repositioned`);
                    }
                } else if (coords.centerX !== undefined || coords.centerY !== undefined) {
                    // Partial coordinate data - warn and clear
                    console.warn(`Concept ${concept.id} has incomplete coordinate data - will use default positioning`);
                    delete concept.coordinates;
                }
            }
            
            // Validate z-index if present
            if (concept.zIndex !== undefined) {
                if (typeof concept.zIndex !== 'number' || !Number.isInteger(concept.zIndex) || concept.zIndex < 0) {
                    console.warn(`Concept ${concept.id} has invalid z-index value - will be removed`);
                    delete concept.zIndex;
                }
            }
        });
        
        return data;
    }
    
    /**
     * Load user data from a file
     * @param {File} file - File object from input
     * @returns {Promise<Object>} Parsed and validated data
     */
    async function loadUserDataFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }
            
            if (!file.name.endsWith('.mathmuseums')) {
                reject(new Error('Invalid file type: Please select a .mathmuseums file'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const jsonString = e.target.result;
                    const data = JSON.parse(jsonString);
                    const validatedData = validateImportData(data);
                    resolve(validatedData);
                } catch (error) {
                    reject(new Error(`Failed to parse file: ${error.message}`));
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }
    
    /**
     * Import user data and merge with existing data
     * @param {Object} importData - Validated import data
     * @param {Object} options - Import options
     * @returns {Promise<void>}
     */
    async function importUserData(importData, options = {}) {
        try {
            const {
                overwriteExisting = false,
                mergeMode = 'replace' // 'replace', 'merge', 'skip'
            } = options;
            
            if (overwriteExisting) {
                // Clear existing data
                await StorageManager.clearAllConcepts();
            }
            
            // Import concepts (which already contain their coordinate data)
            for (const concept of importData.concepts) {
                try {
                    if (mergeMode === 'replace' || !(await StorageManager.getConcept(concept.id))) {
                        await StorageManager.saveConcept(concept);
                    }
                } catch (error) {
                    console.warn(`Failed to import concept ${concept.id}:`, error);
                }
            }
            
            // Reinitialize z-index counter based on imported concepts
            if (window.ZIndexManager) {
                const allConcepts = await StorageManager.getAllConcepts();
                window.ZIndexManager.initializeZIndexCounter(allConcepts);
            }
            
            // No need to handle layoutState separately since coordinates are in concepts
        } catch (error) {
            console.error('Error importing user data:', error);
            throw error;
        }
    }
    
    /**
     * Create a file input element for importing
     * @param {Function} onFileSelected - Callback function to handle selected file
     * @returns {HTMLInputElement} File input element
     */
    function createFileInput(onFileSelected) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.mathmuseums';
        input.style.display = 'none';
        
        // Add change event listener
        input.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file && onFileSelected) {
                try {
                    await onFileSelected(file);
                } catch (error) {
                    console.error('Error processing selected file:', error);
                }
            }
            
            // Reset input so same file can be selected again
            input.value = '';
        });
        
        return input;
    }
    
    /**
     * Show import dialog with options
     * @returns {Promise<Object>} Import options selected by user
     */
    function showImportDialog() {
        return new Promise((resolve) => {
            // For now, return default options
            // TODO: Create a proper dialog UI
            resolve({
                overwriteExisting: false,
                mergeMode: 'replace'
            });
        });
    }
    
    /**
     * Get file info from import data
     * @param {Object} data - Import data
     * @returns {Object} File information
     */
    function getFileInfo(data) {
        // Check if concepts have coordinate data (not just layoutState)
        const hasLayoutData = data.concepts && data.concepts.some(concept => 
            concept.coordinates && 
            concept.coordinates.centerX !== undefined && 
            concept.coordinates.centerY !== undefined
        );
        
        return {
            version: data.version,
            exportDate: data.exportDate,
            userName: data.userName || 'Unknown',
            totalConcepts: data.metadata?.totalConcepts || data.concepts?.length || 0,
            hasLayoutData: hasLayoutData
        };
    }
    
    // Public API
    return {
        downloadUserData,
        loadUserDataFromFile,
        importUserData,
        createFileInput,
        showImportDialog,
        getFileInfo,
        createExportData,
        FILE_FORMAT_VERSION,
        autosaveUserData,
        canAutosave
    };
})();

// Make FileManager available globally
if (typeof window !== 'undefined') {
    window.FileManager = FileManager;
}
