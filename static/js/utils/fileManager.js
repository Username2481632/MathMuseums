/**
 * File Manager
 * Handles local file operations for user data storage
 */
const FileManager = (function() {
    
    // File format version for future compatibility
    const FILE_FORMAT_VERSION = '1.0';
    const DEFAULT_FILENAME = 'my-math-museum.json';
    
    /**
     * Create the data structure for export
     * @returns {Promise<Object>} User data object
     */
    async function createExportData() {
        try {
            // Get all concept data from local storage
            const concepts = await StorageManager.getAllConcepts();
            
            // Get layout state if available
            const layoutState = localStorage.getItem('mm_layout_state');
            let parsedLayoutState = null;
            if (layoutState) {
                try {
                    parsedLayoutState = JSON.parse(layoutState);
                } catch (e) {
                    console.warn('Failed to parse layout state:', e);
                }
            }
            
            const exportData = {
                version: FILE_FORMAT_VERSION,
                exportDate: new Date().toISOString(),
                concepts: concepts || [],
                layoutState: parsedLayoutState,
                metadata: {
                    totalConcepts: (concepts || []).length,
                    completedConcepts: (concepts || []).filter(c => c.isComplete).length
                }
            };
            
            return exportData;
        } catch (error) {
            console.error('Error creating export data:', error);
            throw new Error('Failed to prepare data for export');
        }
    }
    
    /**
     * Download user data as a JSON file
     * @param {string} filename - Optional custom filename
     * @returns {Promise<void>}
     */
    async function downloadUserData(filename = DEFAULT_FILENAME) {
        try {
            const data = await createExportData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Create download link
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
            
            console.log('User data downloaded successfully');
        } catch (error) {
            console.error('Error downloading user data:', error);
            throw error;
        }
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
            
            if (!file.name.endsWith('.json')) {
                reject(new Error('Invalid file type: Please select a JSON file'));
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
            
            // Import concepts
            for (const concept of importData.concepts) {
                try {
                    if (mergeMode === 'replace' || !(await StorageManager.getConcept(concept.id))) {
                        await StorageManager.saveConcept(concept);
                    }
                } catch (error) {
                    console.warn(`Failed to import concept ${concept.id}:`, error);
                }
            }
            
            // Import layout state if available
            if (importData.layoutState) {
                localStorage.setItem('mm_layout_state', JSON.stringify(importData.layoutState));
            }
            
            console.log(`Successfully imported ${importData.concepts.length} concepts`);
        } catch (error) {
            console.error('Error importing user data:', error);
            throw error;
        }
    }
    
    /**
     * Create a file input element for importing
     * @param {Function} onFileSelected - Callback when file is selected
     * @returns {HTMLInputElement}
     */
    function createFileInput(onFileSelected) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && onFileSelected) {
                onFileSelected(file);
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
        return {
            version: data.version,
            exportDate: data.exportDate,
            totalConcepts: data.metadata?.totalConcepts || data.concepts?.length || 0,
            completedConcepts: data.metadata?.completedConcepts || 0,
            hasLayoutData: !!data.layoutState
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
        DEFAULT_FILENAME
    };
})();

// Make FileManager available globally
window.FileManager = FileManager;
