/**
 * Main Application Entry Point
 * Initializes the application and sets up routing
 */
var App = (function() {
    // --- Sync Status Footer Logic ---
    let syncStatus = 'saved'; // 'saving', 'saved', 'unsaved'
    let dirtySinceFileSave = false;
    let syncNotificationTimeout = null;
    let inactivityTimeout = null;
    const syncStatusEl = document.getElementById('sync-notification');

    function setSyncStatus(status) {
        syncStatus = status;
        if (!syncStatusEl) return;
        
        console.log('Setting sync status:', status); // Debug logging
        
        // Clear existing timeouts
        if (syncNotificationTimeout) {
            clearTimeout(syncNotificationTimeout);
            syncNotificationTimeout = null;
        }
        if (inactivityTimeout) {
            clearTimeout(inactivityTimeout);
            inactivityTimeout = null;
        }
        
        // Remove all status classes
        syncStatusEl.classList.remove('saving', 'saved', 'unsaved', 'show');
        
        if (status === 'saving') {
            syncStatusEl.textContent = 'Saving...';
            syncStatusEl.classList.add('saving');
            // Show notification for saving
            syncStatusEl.classList.add('show');
            console.log('Showing saving notification'); // Debug logging
        } else if (status === 'unsaved') {
            syncStatusEl.textContent = 'Unsaved changes';
            syncStatusEl.classList.add('unsaved');
            // Show notification for unsaved changes
            syncStatusEl.classList.add('show');
            // Hide after 3 seconds of inactivity
            resetInactivityTimer();
        } else {
            syncStatusEl.textContent = 'All changes saved';
            syncStatusEl.classList.add('saved');
            // Show briefly for saved confirmation
            syncStatusEl.classList.add('show');
            console.log('Showing saved notification'); // Debug logging
            // Auto-hide after 3 seconds (longer for autosave visibility)
            syncNotificationTimeout = setTimeout(() => {
                syncStatusEl.classList.remove('show');
                syncNotificationTimeout = null;
                console.log('Hiding saved notification'); // Debug logging
            }, 3000);
        }
    }

    function resetInactivityTimer() {
        if (inactivityTimeout) {
            clearTimeout(inactivityTimeout);
        }
        // Hide notification after 3 seconds of inactivity
        inactivityTimeout = setTimeout(() => {
            if (syncStatus === 'unsaved') {
                syncStatusEl.classList.remove('show');
            }
            inactivityTimeout = null;
        }, 3000);
    }

    function handleActivity() {
        if (syncStatus === 'unsaved' && syncStatusEl.classList.contains('show')) {
            resetInactivityTimer();
        }
    }

    // Listen for user activity to reset inactivity timer
    window.addEventListener('mousemove', handleActivity, true);
    window.addEventListener('keydown', handleActivity, true);
    window.addEventListener('click', handleActivity, true);
    window.addEventListener('scroll', handleActivity, true);
    window.addEventListener('touchstart', handleActivity, true);

    // Keyboard shortcuts for save operations
    window.addEventListener('keydown', function(e) {
        // Ctrl+S or Cmd+S - Save to last file or show Save As if no previous file
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
            e.preventDefault();
            handleSaveShortcut();
        }
        // Ctrl+Shift+S or Cmd+Shift+S - Always show Save As dialog
        else if ((e.ctrlKey || e.metaKey) && e.key === 'S' && e.shiftKey) {
            e.preventDefault();
            handleSaveAsShortcut();
        }
    });

    async function handleSaveShortcut() {
        if (!window.FileManager) {
            console.error('FileManager not available');
            return;
        }

        try {
            setSyncStatus('saving');
            
            // Try autosave first (saves to last file without dialog)
            const autosaveResult = await window.FileManager.autosaveUserData();
            
            if (autosaveResult) {
                // Successfully saved to existing file
                dirtySinceFileSave = false;
                setSyncStatus('saved');
                localStorage.setItem('mm_has_saved_file', 'true');
            } else {
                // No previous save location, show Save As dialog
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                const filename = `my-math-museum-${timestamp}.mathmuseums`;
                const saveAsResult = await window.FileManager.downloadUserData(filename);
                
                if (saveAsResult) {
                    dirtySinceFileSave = false;
                    setSyncStatus('saved');
                    localStorage.setItem('mm_has_saved_file', 'true');
                } else {
                    // User cancelled Save As dialog
                    if (dirtySinceFileSave) {
                        setSyncStatus('unsaved');
                    }
                }
            }
        } catch (error) {
            console.error('Save failed:', error);
            setSyncStatus('unsaved');
        }
    }

    async function handleSaveAsShortcut() {
        if (!window.FileManager) {
            console.error('FileManager not available');
            return;
        }

        try {
            setSyncStatus('saving');
            
            // Always show Save As dialog
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `my-math-museum-${timestamp}.mathmuseums`;
            const result = await window.FileManager.downloadUserData(filename);
            
            if (result) {
                dirtySinceFileSave = false;
                setSyncStatus('saved');
                localStorage.setItem('mm_has_saved_file', 'true');
            } else {
                // User cancelled Save As dialog
                if (dirtySinceFileSave) {
                    setSyncStatus('unsaved');
                }
            }
        } catch (error) {
            console.error('Save As failed:', error);
            setSyncStatus('unsaved');
        }
    }

    // Mark as unsaved on any input/change, undo/redo, or local save
    let autosaveTimeout = null;
    
    function markDirty() {
        dirtySinceFileSave = true;
        setSyncStatus('unsaved');
        
        // Clear any existing autosave timeout
        if (autosaveTimeout) {
            console.log('Clearing existing autosave timeout'); // Debug logging
            clearTimeout(autosaveTimeout);
            autosaveTimeout = null;
        }
        
        // Check if autosave is enabled
        const preferences = window.PreferencesClient ? window.PreferencesClient.getPreferences() : {};
        console.log('Preferences:', preferences); // Debug logging
        if (preferences.autosave) {
            console.log('Autosave is enabled, setting timer'); // Debug logging
            // Auto-save after 2 seconds of no changes
            autosaveTimeout = setTimeout(async () => {
                console.log('Autosave timer fired!'); // Debug logging
                console.log('dirtySinceFileSave:', dirtySinceFileSave); // Debug logging
                console.log('window.FileManager exists:', !!window.FileManager); // Debug logging
                console.log('window.FileManager.autosaveUserData exists:', !!(window.FileManager && window.FileManager.autosaveUserData)); // Debug logging
                
                if (!dirtySinceFileSave) {
                    console.log('Not saving: dirtySinceFileSave is false'); // Debug logging
                } else if (!window.FileManager) {
                    console.log('Not saving: window.FileManager is undefined'); // Debug logging
                } else if (!window.FileManager.autosaveUserData) {
                    console.log('Not saving: window.FileManager.autosaveUserData is undefined'); // Debug logging
                }
                
                if (dirtySinceFileSave && window.FileManager && window.FileManager.autosaveUserData) {
                    console.log('Triggering autosave'); // Debug logging
                    try {
                        setSyncStatus('saving');
                        // Use autosave method to avoid Save As dialog
                        const result = await window.FileManager.autosaveUserData();
                        if (result) {
                            console.log('Autosave successful'); // Debug logging
                            dirtySinceFileSave = false;
                            setSyncStatus('saved');
                            // Set flag for autosave toggle
                            localStorage.setItem('mm_has_saved_file', 'true');
                        } else {
                            console.log('Autosave failed - no previous save location'); // Debug logging
                            // Autosave failed (no previous save location), show unsaved
                            setSyncStatus('unsaved');
                        }
                    } catch (error) {
                        console.error('Autosave failed:', error);
                        setSyncStatus('unsaved');
                    }
                } else {
                    console.log('Autosave conditions not met - not saving'); // Debug logging
                }
                autosaveTimeout = null;
            }, 2000);
        } else {
            console.log('Autosave is disabled'); // Debug logging
        }
    }

    window.addEventListener('input', markDirty, true);
    window.addEventListener('change', markDirty, true);

    // Patch StorageManager.saveConcept to mark as unsaved (not saved!)
    if (window.StorageManager) {
        const origSaveConcept = window.StorageManager.saveConcept;
        window.StorageManager.saveConcept = async function(...args) {
            const result = await origSaveConcept.apply(this, args);
            markDirty();
            return result;
        };
    }

    // Patch undo/redo to mark as unsaved
    if (window.createUndoRedoManager) {
        const origCreateUndoRedoManager = window.createUndoRedoManager;
        window.createUndoRedoManager = function(opts) {
            const mgr = origCreateUndoRedoManager(opts);
            const origUndo = mgr.undoLayout;
            const origRedo = mgr.redoLayout;
            mgr.undoLayout = function(...args) {
                markDirty();
                return origUndo.apply(this, args);
            };
            mgr.redoLayout = function(...args) {
                markDirty();
                return origRedo.apply(this, args);
            };
            return mgr;
        };
    }

    // Patch settings save to mark as unsaved
    if (window.PreferencesClient) {
        const origSavePreferences = window.PreferencesClient.savePreferences;
        window.PreferencesClient.savePreferences = async function(...args) {
            const result = await origSavePreferences.apply(this, args);
            markDirty();
            return result;
        };
    }

    // Patch FileManager.downloadUserData to mark as saving/saved (file save resets dirty flag)
    if (window.FileManager) {
        const origDownloadUserData = window.FileManager.downloadUserData;
        window.FileManager.downloadUserData = async function(...args) {
            setSyncStatus('saving');
            const result = await origDownloadUserData.apply(this, args);
            if (result) {
                dirtySinceFileSave = false;
                setSyncStatus('saved');
            } else if (dirtySinceFileSave) {
                setSyncStatus('unsaved');
            }
            return result;
        };
    }

    // Initialize the application
    async function init() {
        try {
            // console.log('🚀 Starting application initialization...');
            
            // Check that all required modules are available
            const requiredModules = {
                'AuthClient': typeof AuthClient !== 'undefined',
                'StorageManager': typeof StorageManager !== 'undefined',
                'PreferencesClient': typeof PreferencesClient !== 'undefined',
                'CoordinateUtils': typeof CoordinateUtils !== 'undefined',
                'ConceptModel': typeof ConceptModel !== 'undefined',
                'SettingsController': typeof SettingsController !== 'undefined'
            };
            
            // console.log('📦 Module availability check:', requiredModules);
            
            const missingModules = Object.entries(requiredModules)
                .filter(([name, available]) => !available)
                .map(([name]) => name);
                
            if (missingModules.length > 0) {
                throw new Error(`Missing required modules: ${missingModules.join(', ')}`);
            }
            
            // Initialize auth first
            // console.log('🔐 Initializing authentication...');
            await AuthClient.init();
            
            // Initialize storage
            // console.log('💾 Initializing storage...');
            await StorageManager.init();
            
            // Initialize preferences
            // console.log('⚙️ Initializing preferences...');
            await PreferencesClient.init(); // Ensure this completes before accessing prefs
            
            // Initialize controllers that depend on PreferencesClient
            // console.log('🎛️ Initializing settings controller...');
            SettingsController.init();
            
            // console.log('✅ Core modules initialized successfully');
            
            // Sync client removed - using local file storage instead
            
            // Reset onboarding session flag on new app start
            // This allows onboarding to show on new page visits, but not within the same session
            StorageManager.saveOnboardingSession(false);
            
            // Set up routes
            Router.init({
                'home': HomeController.init,
                'detail': DetailController.init
            }, 'home');
            
            // Set up file management buttons
            setupFileManagementButtons();

            // Set up keyboard shortcuts for file operations
            setupKeyboardShortcuts();

            // Set up museum name input
            setupMuseumNameInput();

            // Remove loading state
            const loading = document.getElementById('loading');
            if (loading) {
                loading.remove();
            } else {
                console.warn('Loading element not found');
            }
            
        } catch (error) {
            console.error('Error initializing application:', error);
            const loading = document.getElementById('loading');
            if (loading) {
                loading.textContent = 'Error loading application. Please try again later.';
            }
        }
    }

    /**
     * Set up file management buttons functionality
     */
    function setupFileManagementButtons() {
        // Set up export file button
        const exportFileButton = document.getElementById('export-file-button');
        if (exportFileButton) {
            exportFileButton.addEventListener('click', async () => {
                try {
                    exportFileButton.disabled = true;
                    const icon = exportFileButton.querySelector('.icon');
                    const originalSrc = icon.src;
                    // You could create a loading SVG or just disable the button
                    
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                    const filename = `my-math-museum-${timestamp}.mathmuseums`;
                    
                    const saveResult = await FileManager.downloadUserData(filename);
                    if (saveResult) {
                        // Set flag for autosave toggle
                        localStorage.setItem('mm_has_saved_file', 'true');
                        // No alert, just return
                        return;
                    } // else: user cancelled, do nothing
                    
                } catch (error) {
                    console.error('Error exporting file:', error);
                    showNotification('Failed to export file: ' + error.message, 'error');
                } finally {
                    exportFileButton.disabled = false;
                    // Icon returns to normal when button is re-enabled
                }
            });
        }
        
        // Set up import file button
        const importFileButton = document.getElementById('import-file-button');
        if (importFileButton) {
            const fileInput = FileManager.createFileInput(async (file) => {
                try {
                    importFileButton.disabled = true;
                    const icon = importFileButton.querySelector('.icon');
                    const originalSrc = icon.src;
                    // You could create a loading SVG or just disable the button
                    
                    // Load and validate file
                    const importData = await FileManager.loadUserDataFromFile(file);
                    const fileInfo = FileManager.getFileInfo(importData);
                    
                    // Show confirmation dialog
                    const shouldImport = await showImportConfirmation(fileInfo);
                    if (!shouldImport) {
                        return;
                    }
                    
                    // Get import options
                    const options = await FileManager.showImportDialog();
                    
                    // Import the data
                    await FileManager.importUserData(importData, options);
                    
                    // Refresh the display
                    if (window.HomeController && window.HomeController.loadConcepts) {
                        await window.HomeController.loadConcepts();
                        if (window.HomeController.render) {
                            window.HomeController.render();
                        }
                    }
                    
                    showNotification(`Successfully imported ${fileInfo.totalConcepts} concepts!`, 'success');
                    
                } catch (error) {
                    console.error('Error importing file:', error);
                    showNotification('Failed to import file: ' + error.message, 'error');
                } finally {
                    importFileButton.disabled = false;
                    // Icon returns to normal when button is re-enabled
                }
            });
            
            // Append hidden file input to body
            document.body.appendChild(fileInput);
            
            // Trigger file input when button is clicked
            importFileButton.addEventListener('click', () => {
                fileInput.click();
            });
        }
    }
    
    /**
     * Show import confirmation dialog
     * @param {Object} fileInfo - Information about the file to import
     * @returns {Promise<boolean>} Whether to proceed with import
     */
    async function showImportConfirmation(fileInfo) {
        const userNameDisplay = fileInfo.userName !== 'Unknown' ? `${fileInfo.userName}'s Math Museum` : 'Unknown User';
        const message = `Import museum data from file?
        
File contains:
• Museum: ${userNameDisplay}
• ${fileInfo.totalConcepts} concepts
• Export date: ${new Date(fileInfo.exportDate).toLocaleDateString()}
• Version: ${fileInfo.version}

This will replace your current museum data. Continue?`;
        
        return confirm(message);
    }
    
    /**
     * Show notification to user
     * @param {string} message - Notification message
     * @param {string} type - Notification type ('success', 'error', 'info')
     */
    function showNotification(message, type = 'info') {
        // For now, use alert. TODO: Create a proper notification system
        alert(message);
    }

    /**
     * Set up keyboard shortcuts for file operations
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Check if Ctrl key is pressed (or Cmd on Mac) but not Shift
            if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
                switch (event.key.toLowerCase()) {
                    case 'i':
                        // Import shortcut (Ctrl+I only, not Ctrl+Shift+I)
                        event.preventDefault();
                        const importButton = document.getElementById('import-file-button');
                        if (importButton && !importButton.disabled) {
                            importButton.click();
                        }
                        break;
                }
            }
        });
    }
    
    /**
     * Set up museum name input functionality
     */
    function setupMuseumNameInput() {
        const museumNameText = document.getElementById('museum-name-text');
        
        if (!museumNameText) return;
        
        // Load saved museum name
        const savedName = localStorage.getItem('mm_museum_name');
        if (savedName) {
            museumNameText.textContent = savedName;
        }
        
        // Event listeners
        museumNameText.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                museumNameText.blur();
                return;
            }
            
            // Handle delete/backspace keys
            if (event.key === 'Backspace' || event.key === 'Delete') {
                setTimeout(() => {
                    const textContent = museumNameText.textContent.trim();
                    if (!textContent) {
                        // If empty after deletion, clear everything
                        museumNameText.innerHTML = '';
                    }
                    updateHeaderSize();
                }, 0);
            }
        });
        
        museumNameText.addEventListener('paste', (event) => {
            // Allow paste but prevent HTML formatting
            event.preventDefault();
            const text = (event.clipboardData || window.clipboardData).getData('text/plain');
            
            // Insert plain text at cursor position
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(text));
                range.collapse(false);
            }
            
            setTimeout(() => {
                updateHeaderSize();
                saveMuseumName();
            }, 10);
        });
        
        museumNameText.addEventListener('blur', () => {
            // Clean up the content when losing focus
            const textContent = museumNameText.textContent.trim();
            if (!textContent) {
                // If empty, clear everything to ensure CSS :empty pseudo-element works
                museumNameText.innerHTML = '';
            }
            updateHeaderSize();
            saveMuseumName();
        });
        
        museumNameText.addEventListener('input', () => {
            // Clean up the content - remove any non-text nodes or empty spaces
            const textContent = museumNameText.textContent.trim();
            if (!textContent) {
                // If empty, clear everything to ensure CSS :empty pseudo-element works
                museumNameText.innerHTML = '';
            }
            updateHeaderSize();
            saveMuseumName();
        });
        
        function updateHeaderSize() {
            const header = document.querySelector('header');
            const museumNameDisplay = document.querySelector('.museum-name-display');
            const headerTitle = document.querySelector('.header-title');
            const headerControls = document.querySelector('.header-controls');
            const headerRight = document.querySelector('.header-right');
            
            if (!header || !museumNameDisplay || !headerTitle) return;
            
            // Always reset transform first to get natural measurements
            museumNameDisplay.style.transform = '';
            if (headerControls) headerControls.style.transform = 'translateY(-50%)';
            if (headerRight) headerRight.style.transform = 'translateY(-50%)';
            
            // Force a reflow to ensure the reset takes effect
            museumNameDisplay.offsetWidth;
            
            // Get the viewport width and calculate truly available space
            const viewportWidth = window.innerWidth;
            const buttonSpaceLeft = 200; // Space for left buttons
            const buttonSpaceRight = 100; // Space for right buttons  
            const padding = 40; // Additional padding for safety
            const maxTitleWidth = viewportWidth - buttonSpaceLeft - buttonSpaceRight - padding;
            
            // Get the natural width of the title
            const naturalTitleWidth = museumNameDisplay.scrollWidth;
            
            console.log('Debug:', {
                viewportWidth,
                maxTitleWidth,
                naturalTitleWidth,
                needsScaling: naturalTitleWidth > maxTitleWidth
            });
            
            // Always calculate scale factor, even when no scaling is needed
            // This ensures smooth transitions in both directions
            const scaleFactor = naturalTitleWidth > maxTitleWidth && maxTitleWidth > 100 
                ? Math.min(0.99, maxTitleWidth / naturalTitleWidth)
                : 1.0; // Normal size when no scaling needed
            
            // Apply scaling to title (1.0 = normal size, <1.0 = scaled down)
            if (scaleFactor < 1.0) {
                museumNameDisplay.style.transform = `scale(${scaleFactor})`;
                museumNameDisplay.style.transformOrigin = 'center';
            } else {
                museumNameDisplay.style.transform = '';
            }
            
            // Apply scaling to buttons
            if (headerControls) {
                if (scaleFactor < 1.0) {
                    headerControls.style.transform = `translateY(-50%) scale(${scaleFactor})`;
                    headerControls.style.transformOrigin = 'left center';
                } else {
                    headerControls.style.transform = 'translateY(-50%)';
                }
            }
            if (headerRight) {
                if (scaleFactor < 1.0) {
                    headerRight.style.transform = `translateY(-50%) scale(${scaleFactor})`;
                    headerRight.style.transformOrigin = 'right center';
                } else {
                    headerRight.style.transform = 'translateY(-50%)';
                }
            }
            
            // Scale header height proportionally (1.0 = 70px, smaller scale = smaller height)
            const newHeight = Math.min(70, 70 * scaleFactor);
            header.style.height = `${newHeight}px`;
            document.body.style.paddingTop = `${newHeight}px`;
            
            // Update CSS custom property for tiles container
            document.documentElement.style.setProperty('--header-height', `${newHeight}px`);
            
            // Update all container heights
            updateContainerHeights(newHeight);
            
            console.log('Applied scaling:', { 
                scaleFactor, 
                newHeight, 
                naturalTitleWidth, 
                maxTitleWidth,
                needsScaling: scaleFactor < 1.0 
            });
        }
        
        // DRY function to update all container heights (and aspect ratio widths)
        function updateContainerHeights(headerHeight) {
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            const containerHeight = viewportHeight - headerHeight;
            
            // Get containers that should fill the viewport height
            const appContainer = document.querySelector('#app-container');
            const homeView = document.querySelector('#home-view');
            
            // Update viewport-filling containers
            [appContainer, homeView].forEach(container => {
                if (container) {
                    container.style.removeProperty('height');
                    container.style.setProperty('height', `${containerHeight}px`, 'important');
                    container.offsetHeight; // Force recalculation
                }
            });
            
            // For aspect ratio containers, we need to recalculate based on the new available space
            const aspectRatioContainer = document.querySelector('.aspect-ratio-container');
            if (aspectRatioContainer && homeView) {
                // Get the current aspect ratio from preferences
                const aspectRatio = window.PreferencesClient ? window.PreferencesClient.getAspectRatio() : { width: 16, height: 9 };
                const targetAspectRatio = aspectRatio.width / aspectRatio.height;
                
                if (homeView.classList.contains('screen-fit-mode')) {
                    // In screen-fit-mode, calculate optimal size that fits in available space
                    let containerWidth = viewportWidth;
                    let newContainerHeight = containerWidth / targetAspectRatio;
                    if (newContainerHeight > containerHeight) {
                        newContainerHeight = containerHeight;
                        containerWidth = newContainerHeight * targetAspectRatio;
                    }
                    
                    aspectRatioContainer.style.width = `${containerWidth}px`;
                    aspectRatioContainer.style.height = `${newContainerHeight}px`;
                } else if (homeView.classList.contains('screen-fill-mode')) {
                    // In screen-fill-mode, calculate size that fills one dimension
                    const fillWidthHeight = viewportWidth / targetAspectRatio;
                    const fillHeightWidth = containerHeight * targetAspectRatio;
                    
                    let containerWidth, newContainerHeight;
                    if (fillWidthHeight >= fillHeightWidth) {
                        containerWidth = viewportWidth;
                        newContainerHeight = fillWidthHeight;
                    } else {
                        containerWidth = fillHeightWidth;
                        newContainerHeight = containerHeight;
                    }
                    
                    aspectRatioContainer.style.width = `${containerWidth}px`;
                    aspectRatioContainer.style.height = `${newContainerHeight}px`;
                } else {
                    // In default mode, calculate optimal size within available space
                    let containerWidth = viewportWidth;
                    let newContainerHeight = containerWidth / targetAspectRatio;
                    if (newContainerHeight > containerHeight) {
                        newContainerHeight = containerHeight;
                        containerWidth = newContainerHeight * targetAspectRatio;
                    }
                    
                    aspectRatioContainer.style.width = `${containerWidth}px`;
                    aspectRatioContainer.style.height = `${newContainerHeight}px`;
                }
                
                // Remove any explicit height from inner containers - let them inherit from parent
                const aspectRatioContent = document.querySelector('.aspect-ratio-content');
                const tilesContainer = document.querySelector('.tiles-container');
                [aspectRatioContent, tilesContainer].forEach(container => {
                    if (container) {
                        container.style.removeProperty('height');
                        container.style.removeProperty('width');
                        container.offsetHeight;
                    }
                });
            }
        }
        
        // Update header size on window resize
        window.addEventListener('resize', () => {
            updateHeaderSize();
            
            // Also update container heights on resize
            const header = document.querySelector('header');
            const currentHeaderHeight = header ? parseFloat(header.style.height) || 70 : 70;
            updateContainerHeights(currentHeaderHeight);
        });
        
        // Initial header size update and CSS property setup
        setTimeout(() => {
            // Set initial CSS property
            document.documentElement.style.setProperty('--header-height', '70px');
            
            // Set initial container heights
            updateContainerHeights(70);
            
            updateHeaderSize();
        }, 100);
        
        function saveMuseumName() {
            const name = museumNameText.textContent.trim();
            if (name) {
                localStorage.setItem('mm_museum_name', name);
            } else {
                localStorage.removeItem('mm_museum_name');
            }
        }
    }
    
    // Public API
    return {
        init
    };
})();

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
