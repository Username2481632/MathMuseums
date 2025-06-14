/**
 * Main Application Entry Point
 * Initializes the application and sets up routing
 */
var App = (function() {
    // --- Sync Status Footer Logic ---
    let syncStatus = 'saved'; // 'saving', 'saved', 'unsaved'
    let dirtySinceFileSave = false;
    let syncNotificationTimeout = null;
    let autosaveTimeout = null;
    const syncStatusEl = document.getElementById('sync-notification');
    
    // Smart positioning for notifications
    let lastInteractionPosition = { x: 0, y: 0 };
    let currentNotificationPosition = 'bottom-right'; // Default position

    // Track user interactions for smart positioning
    function trackInteraction(event) {
        if (event.clientX !== undefined && event.clientY !== undefined) {
            lastInteractionPosition.x = event.clientX;
            lastInteractionPosition.y = event.clientY;
        }
    }

    // Calculate the farthest corner from the last interaction
    function calculateFarthestCorner() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Get dynamic header height from CSS custom property
        const headerHeightProperty = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
        const headerHeight = parseInt(headerHeightProperty) || 70; // Fallback to 70px if not set
        
        const x = lastInteractionPosition.x;
        const y = lastInteractionPosition.y;

        // Adjust for header - if interaction is in header area, consider it as below header
        const adjustedY = y < headerHeight ? headerHeight + 10 : y; // Use smaller margin

        // Calculate distances to each corner, accounting for header
        const distances = {
            'top-left': Math.sqrt(x * x + (adjustedY - headerHeight - 10) * (adjustedY - headerHeight - 10)),
            'top-right': Math.sqrt((viewportWidth - x) * (viewportWidth - x) + (adjustedY - headerHeight - 10) * (adjustedY - headerHeight - 10)),
            'bottom-left': Math.sqrt(x * x + (viewportHeight - adjustedY) * (viewportHeight - adjustedY)),
            'bottom-right': Math.sqrt((viewportWidth - x) * (viewportWidth - x) + (viewportHeight - adjustedY) * (viewportHeight - adjustedY))
        };

        // Find the corner with maximum distance
        let farthestCorner = 'bottom-right';
        let maxDistance = 0;
        
        for (const [corner, distance] of Object.entries(distances)) {
            if (distance > maxDistance) {
                maxDistance = distance;
                farthestCorner = corner;
            }
        }

        return farthestCorner;
    }

    // Update notification position
    function updateNotificationPosition() {
        if (!syncStatusEl) return;
        
        const newPosition = calculateFarthestCorner();
        
        // Only update if position changed
        if (newPosition !== currentNotificationPosition) {
            const wasVisible = syncStatusEl.classList.contains('show');
            
            // If notification is currently visible, hide it first
            if (wasVisible) {
                syncStatusEl.classList.remove('show');
            }
            
            // Remove old position class and add new one
            syncStatusEl.classList.remove(`position-${currentNotificationPosition}`);
            syncStatusEl.classList.add(`position-${newPosition}`);
            
            currentNotificationPosition = newPosition;
            
            // If it was visible, show it again in the new position after a brief delay
            if (wasVisible) {
                setTimeout(() => {
                    syncStatusEl.classList.add('show');
                }, 100);
            }
        }
    }

    // Initialize interaction tracking
    function initializeInteractionTracking() {
        // Track mouse movements and clicks
        document.addEventListener('mousemove', trackInteraction, { passive: true });
        document.addEventListener('click', trackInteraction, { passive: true });
        document.addEventListener('mousedown', trackInteraction, { passive: true });
        
        // Track touch events for mobile
        document.addEventListener('touchstart', (event) => {
            if (event.touches && event.touches[0]) {
                trackInteraction({
                    clientX: event.touches[0].clientX,
                    clientY: event.touches[0].clientY
                });
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (event) => {
            if (event.touches && event.touches[0]) {
                trackInteraction({
                    clientX: event.touches[0].clientX,
                    clientY: event.touches[0].clientY
                });
            }
        }, { passive: true });

        // Set initial position class
        if (syncStatusEl) {
            syncStatusEl.classList.add(`position-${currentNotificationPosition}`);
        }
    }

    function setSyncStatus(status) {
        syncStatus = status;
        if (!syncStatusEl) return;
        
        // Clear existing timeouts
        if (syncNotificationTimeout) {
            clearTimeout(syncNotificationTimeout);
            syncNotificationTimeout = null;
        }
        
        // Remove all status classes (but keep position classes)
        syncStatusEl.classList.remove('saving', 'saved', 'unsaved', 'show');
        
        // Update position based on last interaction before showing
        updateNotificationPosition();
        
        if (status === 'saving') {
            syncStatusEl.textContent = 'Saving changes...';
            syncStatusEl.classList.add('saving');
            // Show notification for saving
            syncStatusEl.classList.add('show');
        } else if (status === 'unsaved') {
            syncStatusEl.textContent = 'Unsaved changes';
            syncStatusEl.classList.add('unsaved');
            // Show notification for unsaved changes
            syncStatusEl.classList.add('show');
            // No autohide: notification stays visible until next status change
        } else {
            syncStatusEl.textContent = 'Changes saved';
            syncStatusEl.classList.add('saved');
            // Show notification for saved confirmation
            syncStatusEl.classList.add('show');
            // No autohide: notification stays visible until next status change
        }
        
        // Update notification position after status change
        updateNotificationPosition();
    }

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

    // Warn user about unsaved changes when leaving the page
    window.addEventListener('beforeunload', function(e) {
        if (dirtySinceFileSave) {
            // Modern browsers ignore custom messages and show their own standard dialog
            // We just need to return any non-empty string to trigger the dialog
            e.returnValue = true; // For older browsers
            return true; // For modern browsers - triggers standard "unsaved changes" dialog
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
                // File save status no longer tracked in localStorage
            } else {
                // No previous save location, show Save As dialog
                const saveAsResult = await window.FileManager.downloadUserData();
                
                if (saveAsResult) {
                    dirtySinceFileSave = false;
                    setSyncStatus('saved');
                    // File save status no longer tracked in localStorage
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
            const result = await window.FileManager.downloadUserData();
            
            if (result) {
                dirtySinceFileSave = false;
                setSyncStatus('saved');
                // File save status no longer tracked in localStorage
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
    
    function markDirty() {
        dirtySinceFileSave = true;
        setSyncStatus('unsaved');
        
        // Clear any existing autosave timeout
        if (autosaveTimeout) {
            clearTimeout(autosaveTimeout);
            autosaveTimeout = null;
        }
        
        // Check if autosave is enabled
        const preferences = window.PreferencesClient ? window.PreferencesClient.getPreferences() : {};
        if (preferences.autosave) {
            // Auto-save after 2 seconds of no changes
            autosaveTimeout = setTimeout(async () => {
                
                if (!dirtySinceFileSave) {
                    try {
                        setSyncStatus('saving');
                        // Use autosave method to avoid Save As dialog
                        const result = await window.FileManager.autosaveUserData();
                        if (result) {
                            dirtySinceFileSave = false;
                            setSyncStatus('saved');
                            // File save status no longer tracked in localStorage
                        } else {
                            // Autosave failed (no previous save location), show unsaved
                            setSyncStatus('unsaved');
                        }
                    } catch (error) {
                        console.error('Autosave failed:', error);
                        setSyncStatus('unsaved');
                    }
                } else {
                }
                autosaveTimeout = null;
            }, 2000);
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
            // Check that all required modules are available
            const requiredModules = {
                'AuthClient': typeof AuthClient !== 'undefined',
                'StorageManager': typeof StorageManager !== 'undefined',
                'PreferencesClient': typeof PreferencesClient !== 'undefined',
                'CoordinateUtils': typeof CoordinateUtils !== 'undefined',
                'ConceptModel': typeof ConceptModel !== 'undefined',
                'SettingsController': typeof SettingsController !== 'undefined'
            };
            
            const missingModules = Object.entries(requiredModules)
                .filter(([name, available]) => !available)
                .map(([name]) => name);
                
            if (missingModules.length > 0) {
                throw new Error(`Missing required modules: ${missingModules.join(', ')}`);
            }
            
            // Initialize auth first
            await AuthClient.init();
            
            // Initialize storage
            await StorageManager.init();
            
            // Initialize preferences
            await PreferencesClient.init(); // Ensure this completes before accessing prefs
            
            // Initialize controllers that depend on PreferencesClient
            SettingsController.init();
            
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
            
            // Initialize smart notification positioning
            initializeInteractionTracking();

            // Check if autosave warning should be shown
            checkAutosaveWarning();

            // Initialize DesmosUtils with sessionStorage persistence
            if (window.DesmosUtils) {
                // DesmosUtils loaded
            }

            // Initialize PWA functionality
            if (window.PWAManager) {
                await PWAManager.init();
            }

            // Initialize share functionality
            if (window.ShareManager) {
                ShareManager.init();
            }

            // Initialize performance monitoring
            if (window.PerformanceManager) {
                PerformanceManager.init();
            }

            // Remove loading state
            const loading = document.getElementById('loading');
            if (loading) {
                loading.remove();
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
     * Check if autosave warning should be shown
     */
    function checkAutosaveWarning() {
        const preferences = PreferencesClient.getPreferences();
        
        // Only show warning if autosave is enabled
        if (!preferences.autosave) {
            return;
        }

        // Check if user has already been warned this session
        if (sessionStorage.getItem('mm_autosave_warning_shown') === 'true') {
            return;
        }

        // Check if autosave can actually work (user has saved before)
        if (!window.FileManager || !window.FileManager.canAutosave()) {
            showAutosaveWarning();
        }
    }

    /**
     * Show the autosave warning modal
     */
    function showAutosaveWarning() {
        const modal = document.getElementById('autosave-warning-modal');
        if (modal) {
            modal.style.display = 'block';
            
            // Mark as shown this session
            sessionStorage.setItem('mm_autosave_warning_shown', 'true');
            
            // Setup event handlers if not already done
            setupAutosaveWarningHandlers();
        }
    }

    /**
     * Setup event handlers for autosave warning modal
     */
    function setupAutosaveWarningHandlers() {
        const dismissBtn = document.getElementById('autosave-warning-dismiss');
        const disableBtn = document.getElementById('autosave-warning-disable');
        const modal = document.getElementById('autosave-warning-modal');

        if (dismissBtn && !dismissBtn.hasAttribute('data-handler-added')) {
            dismissBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
            dismissBtn.setAttribute('data-handler-added', 'true');
        }

        if (disableBtn && !disableBtn.hasAttribute('data-handler-added')) {
            disableBtn.addEventListener('click', () => {
                // Disable autosave in preferences
                PreferencesClient.savePreferences({ autosave: false });
                modal.style.display = 'none';
            });
            disableBtn.setAttribute('data-handler-added', 'true');
        }

        // Close modal when clicking outside
        if (modal && !modal.hasAttribute('data-handler-added')) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
            modal.setAttribute('data-handler-added', 'true');
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
                    
                    // Use configurable filename from preferences
                    const saveResult = await FileManager.downloadUserData();
                    if (saveResult) {
                        // File save status no longer tracked in localStorage
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
                    if (window.HomeController && window.HomeController.refresh) {
                        await window.HomeController.refresh();
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
        const layoutInfo = fileInfo.hasLayoutData ? '\n• Tile positions included' : '\n• Tile positions will use default layout';
        const message = `Import museum data from file?
        
File contains:
• Museum: ${userNameDisplay}
• ${fileInfo.totalConcepts} concepts
• Export date: ${new Date(fileInfo.exportDate).toLocaleDateString()}
• Version: ${fileInfo.version}${layoutInfo}

This will replace your current museum data. Continue?`;
        
        return confirm(message);
    }
    
    /**
     * Show notification to user
     * @param {string} message - Notification message
     * @param {string} type - Notification type ('success', 'error', 'info')
     */
    function showNotification(message, type = 'info') {
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
                        
                    case 'h':
                        // Share file shortcut (Ctrl+H)
                        event.preventDefault();
                        if (window.ShareManager) {
                            ShareManager.shareExportedFile();
                        }
                        break;
                }
            }
            
            // PWA-specific shortcuts without modifier keys
            switch (event.key) {
                case 'F5':
                    // Check for app updates
                    event.preventDefault();
                    if (window.PWAManager) {
                        // Force service worker update check
                        if ('serviceWorker' in navigator) {
                            navigator.serviceWorker.getRegistrations().then(registrations => {
                                registrations.forEach(registration => {
                                    registration.update();
                                });
                            });
                        }
                    }
                    break;
            }
        });
    }
    
    /**
     * Set up museum name input functionality
     */
    function setupMuseumNameInput() {
        const museumNameText = document.getElementById('museum-name-text');
        
        if (!museumNameText) return;
        
        // Shared configuration for museum name inputs
        const museumNameConfig = {
            placeholder: museumNameText.getAttribute('data-placeholder') || '____________',
            suffix: document.querySelector('.museum-title-suffix')?.textContent || "'s Math Museum"
        };
        
        // Helper function to create museum name input with consistent styling
        function createMuseumNameInput(className = 'museum-name-text') {
            const input = document.createElement('span');
            input.className = className;
            input.contentEditable = true;
            input.setAttribute('data-placeholder', museumNameConfig.placeholder);
            return input;
        }
        
        // Helper function to create museum title suffix with consistent styling
        function createMuseumTitleSuffix() {
            const suffix = document.createElement('span');
            suffix.className = 'museum-title-suffix';
            suffix.textContent = museumNameConfig.suffix;
            return suffix;
        }
        
        // Helper function to apply dropdown-specific overrides to base museum name styling
        function applyDropdownInputStyling(input) {
            input.style.cssText = `
                background: rgba(255, 255, 255, 0.08);
                border: none;
                padding: 2px 4px;
                margin: -2px -4px;
                color: white;
                font-size: var(--font-size-xl);
                font-weight: 600;
                letter-spacing: -0.01em;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                outline: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                text-rendering: optimizeLegibility;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                white-space: nowrap;
                overflow: visible;
                cursor: text;
                caret-color: white;
                border-radius: 8px;
            `;
        }
        
        // Helper function to apply dropdown-specific styling to suffix
        function applyDropdownSuffixStyling(suffix) {
            suffix.style.cssText = `
                color: white;
                font-size: var(--font-size-xl);
                font-weight: 600;
                letter-spacing: -0.01em;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                opacity: 0.8;
            `;
        }
        
        // Museum name is no longer persisted - only stored in exported files
        // Users need to set it fresh each session or import from a file
        
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
            cleanupContentEditable(museumNameText);
            updateHeaderSize();
            saveMuseumName();
        });
        
        museumNameText.addEventListener('input', () => {
            cleanupContentEditable(museumNameText);
            updateHeaderSize(false); // Don't allow dropdown transitions while typing
            saveMuseumName();
        });
        
        // Constants for dropdown scaling
        const DROPDOWN_CONFIG = {
            PADDING_HORIZONTAL: 32, // 1rem left + 1rem right = 32px
            PADDING_BASE: 16, // 1rem = 16px
            PADDING_VERTICAL: 12, // 12px
            MIN_VIEWPORT_WIDTH: 100,
            SCALING: {
                MIN_FACTOR: 0.1,
                THRESHOLD: 0.99,
                AGGRESSIVE_MIN: 0.1 // Very aggressive scaling for dropdowns
            }
        };

        // Helper function to manage dropdown container scaling effects
        function applyDropdownContainerScaling(titleDropdown, factor, isReset = false) {
            if (isReset) {
                titleDropdown.style.padding = '12px 1rem';
                titleDropdown.style.lineHeight = '1';
                const origFontSize = titleDropdown.getAttribute('data-original-font-size');
                if (origFontSize) titleDropdown.style.fontSize = origFontSize;
            } else {
                // Scale horizontal padding while keeping vertical fixed
                const horizontalPadding = Math.max(DROPDOWN_CONFIG.PADDING_VERTICAL, DROPDOWN_CONFIG.PADDING_BASE * factor);
                titleDropdown.style.padding = `${DROPDOWN_CONFIG.PADDING_VERTICAL}px ${horizontalPadding}px`;
                
                // Scale font-size and line-height to match transform
                titleDropdown.style.lineHeight = factor.toString();
                const origFontSize = titleDropdown.getAttribute('data-original-font-size');
                if (origFontSize) {
                    const px = parseFloat(origFontSize);
                    if (!isNaN(px)) titleDropdown.style.fontSize = (px * factor) + 'px';
                }
            }
        }

        // Unified dropdown scaling function
        function scaleDropdownToFit(dropdownNameDisplay) {
            const titleDropdown = dropdownNameDisplay.closest('.title-dropdown');
            if (!titleDropdown) {
                console.warn('No title dropdown container found');
                return 1.0;
            }

            const maxDropdownWidth = window.innerWidth - DROPDOWN_CONFIG.PADDING_HORIZONTAL;
            if (maxDropdownWidth < DROPDOWN_CONFIG.MIN_VIEWPORT_WIDTH) {
                console.warn('Dropdown max width too small:', maxDropdownWidth);
                return 1.0;
            }

            return calculateAndApplyTextScaling(dropdownNameDisplay, maxDropdownWidth, {
                minScaleFactor: DROPDOWN_CONFIG.SCALING.AGGRESSIVE_MIN,
                scaleThreshold: DROPDOWN_CONFIG.SCALING.THRESHOLD,
                resetTransform: () => {
                    dropdownNameDisplay.style.transform = '';
                    dropdownNameDisplay.style.transformOrigin = '';
                    applyDropdownContainerScaling(titleDropdown, 0, true);
                },
                applyTransform: (factor) => {
                    dropdownNameDisplay.style.transform = `scale(${factor})`;
                    dropdownNameDisplay.style.transformOrigin = 'center';
                    applyDropdownContainerScaling(titleDropdown, factor, false);
                },
                debugLabel: 'Dropdown'
            });
        }

        // DRY function to calculate and apply text scaling
        function calculateAndApplyTextScaling(element, maxWidth, options = {}) {
            const {
                minScaleFactor = 0.3, // More aggressive scaling for dropdowns
                scaleThreshold = 0.99,
                resetTransform = () => {},
                applyTransform = (scaleFactor) => {},
                debugLabel = 'Element'
            } = options;
            
            // Store original styles that might interfere with measurement
            const originalTransform = element.style.transform || '';
            const originalOverflow = element.style.overflow || '';
            const originalTextOverflow = element.style.textOverflow || '';
            const originalWhiteSpace = element.style.whiteSpace || '';
            
            // Temporarily reset styles for accurate measurement
            element.style.transform = '';
            element.style.overflow = 'visible';
            element.style.textOverflow = 'unset';
            element.style.whiteSpace = 'nowrap';
            
            // Force reflow and measure
            element.offsetWidth;
            const naturalWidth = element.scrollWidth;
            
            // Restore original styles except transform (which we'll set based on scaling)
            element.style.overflow = originalOverflow;
            element.style.textOverflow = originalTextOverflow;
            element.style.whiteSpace = originalWhiteSpace;
            
            // Calculate scale factor
            const scaleFactor = naturalWidth > maxWidth && maxWidth > 0  // Changed from 100 to 0
                ? Math.max(minScaleFactor, Math.min(scaleThreshold, maxWidth / naturalWidth))
                : (maxWidth <= 0 ? minScaleFactor : 1.0); // Force minimum scale factor when no space available
            
            // Apply scaling
            if (scaleFactor < 1.0) {
                applyTransform(scaleFactor);
            } else {
                resetTransform();
            }
            
            return scaleFactor;
        }

        function updateHeaderSize(allowDropdownTransition = true) {
            const header = document.querySelector('header');
            const museumNameDisplay = document.querySelector('.museum-name-display');
            const headerTitle = document.querySelector('.header-title');
            const headerControls = document.querySelector('.header-controls');
            const headerRight = document.querySelector('.header-right');
            
            if (!header || !museumNameDisplay || !headerTitle) return;
            
            // Always reset transform first to get natural measurements
            museumNameDisplay.style.transform = '';
            if (headerControls) { headerControls.style.transform = 'translateY(-50%)'; }
            if (headerRight) { headerRight.style.transform = 'translateY(-50%)'; }
            
            // Force a reflow to ensure the reset takes effect
            museumNameDisplay.offsetWidth;
            
            // Get the viewport width and calculate truly available space
            const viewportWidth = window.innerWidth;
            
            // Measure actual button container widths instead of hardcoded estimates
            const buttonSpaceLeft = headerControls ? headerControls.getBoundingClientRect().width + 32 : 0; // 32px for margins/padding
            const buttonSpaceRight = headerRight ? headerRight.getBoundingClientRect().width + 32 : 0; // 32px for margins/padding
            const padding = 40; // Additional padding for safety
            const maxTitleWidth = viewportWidth - buttonSpaceLeft - buttonSpaceRight - padding;
            
            // Use the DRY scaling function
            const scaleFactor = calculateAndApplyTextScaling(museumNameDisplay, maxTitleWidth, {
                minScaleFactor: 0.3,
                scaleThreshold: 0.99,
                resetTransform: () => {
                    museumNameDisplay.style.transform = '';
                },
                applyTransform: (factor) => {
                    museumNameDisplay.style.transform = `scale(${factor})`;
                    museumNameDisplay.style.transformOrigin = 'center';
                },
                debugLabel: 'Header'
            });
            
            // Scale header height proportionally (1.0 = 70px, smaller scale = smaller height)
            const newHeight = Math.min(70, 70 * scaleFactor);
            
            // Check if we need to show the collapsed title (when title needs significant scaling)
            if (allowDropdownTransition && scaleFactor < 0.75) {
                // Title needs significant scaling - show dropdown caret instead
                showCollapsedTitle();
            } else {
                // Show normal or scaled title
                hideCollapsedTitle();
                
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
                
                header.style.height = `${newHeight}px`;
                document.body.style.paddingTop = `${newHeight}px`;
                
                // Update CSS custom property for tiles container
                document.documentElement.style.setProperty('--header-height', `${newHeight}px`);
                
                // Update all container heights
                updateContainerHeights(newHeight);
            }
        }
        
        function showCollapsedTitle() {
            const header = document.querySelector('header');
            const headerTitle = document.querySelector('.header-title');
            
            // Hide the normal title display
            const museumNameDisplay = document.querySelector('.museum-name-display');
            if (museumNameDisplay) {
                museumNameDisplay.style.display = 'none';
            }
            
            // Create or show the collapsed title caret
            let collapsedTitle = document.querySelector('.collapsed-title-caret');
            if (!collapsedTitle) {
                collapsedTitle = document.createElement('div');
                collapsedTitle.className = 'collapsed-title-caret';
                collapsedTitle.innerHTML = '▼'; // Down caret
                collapsedTitle.style.cssText = `
                    cursor: pointer;
                    color: white;
                    font-size: 2.5rem;
                    width: 63px;
                    height: 63px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    user-select: none;
                    transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
                    border-radius: 4px;
                    border: 2px solid rgba(255, 255, 255, 0.8);
                `;
                
                // Add hover effect
                collapsedTitle.addEventListener('mouseenter', () => {
                    collapsedTitle.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                });
                collapsedTitle.addEventListener('mouseleave', () => {
                    collapsedTitle.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                });
                
                // Create the dropdown overlay
                const titleDropdown = document.createElement('div');
                titleDropdown.className = 'title-dropdown';
                titleDropdown.style.cssText = `
                    position: fixed;
                    top: var(--header-height, 70px);
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--primary-color);
                    color: white;
                    padding: 12px 1rem;
                    border-radius: 0 0 8px 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    z-index: 10000;
                    display: none;
                    font-size: var(--font-size-xl);
                    font-weight: bold;
                    white-space: nowrap;
                    overflow: visible;
                    cursor: pointer;
                    width: auto;
                    min-width: max-content;
                    height: auto;
                    min-height: auto;
                    line-height: 1;
                `;
                // Store the original computed font-size for scaling
                const computedFontSize = window.getComputedStyle(titleDropdown).fontSize;
                titleDropdown.setAttribute('data-original-font-size', computedFontSize);
                
                // Create editable museum name element for dropdown - exactly like header
                const dropdownNameDisplay = document.createElement('div');
                dropdownNameDisplay.className = 'museum-name-display';
                dropdownNameDisplay.style.cssText = `
                    display: flex;
                    align-items: baseline;
                    gap: 0;
                    position: relative;
                    width: auto;
                    min-width: max-content;
                    overflow: visible;
                `;
                
                const dropdownNameText = createMuseumNameInput('museum-name-text dropdown-name-text');
                applyDropdownInputStyling(dropdownNameText);
                
                const dropdownSuffix = createMuseumTitleSuffix();
                applyDropdownSuffixStyling(dropdownSuffix);
                
                // Load current museum name
                const museumNameText = document.getElementById('museum-name-text');
                const currentName = museumNameText ? museumNameText.textContent.trim() : '';
                if (currentName) {
                    dropdownNameText.textContent = currentName;
                }
                
                // Assemble the dropdown structure - exactly like header (just two spans in display div)
                dropdownNameDisplay.appendChild(dropdownNameText);
                dropdownNameDisplay.appendChild(dropdownSuffix);
                titleDropdown.appendChild(dropdownNameDisplay);
                
                // Event handlers for dropdown name editing
                dropdownNameText.addEventListener('focus', () => {
                    dropdownNameText.style.background = 'rgba(255, 255, 255, 0.12)';
                    dropdownNameText.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                });
                
                dropdownNameText.addEventListener('blur', () => {
                    dropdownNameText.style.background = 'rgba(255, 255, 255, 0.08)';
                    dropdownNameText.style.boxShadow = '';
                    
                    syncDropdownWithMain(dropdownNameText);
                    updateDropdownSize();
                    // Check if title now fits inline, and if so, transition back
                    const museumNameDisplay = document.querySelector('.museum-name-display');
                    if (museumNameDisplay) {
                        // Use the same logic as updateHeaderSize to determine scaleFactor
                        museumNameDisplay.style.transform = '';
                        museumNameDisplay.offsetWidth;
                        const header = document.querySelector('header');
                        const headerControls = document.querySelector('.header-controls');
                        const headerRight = document.querySelector('.header-right');
                        const viewportWidth = window.innerWidth;
                        const buttonSpaceLeft = headerControls ? headerControls.getBoundingClientRect().width + 32 : 0;
                        const buttonSpaceRight = headerRight ? headerRight.getBoundingClientRect().width + 32 : 0;
                        const padding = 40;
                        const maxTitleWidth = viewportWidth - buttonSpaceLeft - buttonSpaceRight - padding;
                        const scaleFactor = calculateAndApplyTextScaling(museumNameDisplay, maxTitleWidth, {
                            minScaleFactor: 0.3,
                            scaleThreshold: 0.99,
                            resetTransform: () => { museumNameDisplay.style.transform = ''; },
                            applyTransform: (factor) => { museumNameDisplay.style.transform = `scale(${factor})`; museumNameDisplay.style.transformOrigin = 'center'; },
                            debugLabel: 'HeaderCheck'
                        });
                        if (scaleFactor >= 0.75) {
                            // Hide dropdown and show inline
                            titleDropdown.style.display = 'none';
                            collapsedTitle.innerHTML = '▼';
                            collapsedTitle.style.transform = '';
                            hideCollapsedTitle();
                        }
                    }
                });
                
                dropdownNameText.addEventListener('input', () => {
                    cleanupContentEditable(dropdownNameText);
                    syncDropdownWithMain(dropdownNameText);
                    updateDropdownSize();
                    // (No transition back to inline here; only on blur)
                });
                
                // Function to adjust dropdown size based on content width
                function updateDropdownSize() {
                    return scaleDropdownToFit(dropdownNameDisplay);
                }
                
                dropdownNameText.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        dropdownNameText.blur();
                        // Close dropdown
                        titleDropdown.style.display = 'none';
                        collapsedTitle.innerHTML = '▼';
                        collapsedTitle.style.transform = '';
                    }
                });
                
                // Prevent dropdown click from closing when clicking on editable text
                dropdownNameText.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                
                // Click handler for caret
                collapsedTitle.addEventListener('click', () => {
                    const isVisible = titleDropdown.style.display === 'block';
                    if (isVisible) {
                        titleDropdown.style.display = 'none';
                        collapsedTitle.innerHTML = '▼';
                        collapsedTitle.style.transform = '';
                    } else {
                        titleDropdown.style.display = 'block';
                        collapsedTitle.innerHTML = '▲';
                        collapsedTitle.style.transform = 'translateY(-2px)';
                        
                        // Update dropdown content and focus
                        const mainNameText = document.getElementById('museum-name-text');
                        const dropdownNameText = titleDropdown.querySelector('.dropdown-name-text');
                        if (mainNameText && dropdownNameText) {
                            dropdownNameText.textContent = mainNameText.textContent.trim();
                            setTimeout(() => {
                                updateDropdownSize();
                            }, 100);
                        }
                    }
                });
                
                // Click handler for dropdown (only close when clicking outside the name input)
                titleDropdown.addEventListener('click', (e) => {
                    if (!e.target.closest('.dropdown-name-text')) {
                        // Hide dropdown
                        titleDropdown.style.display = 'none';
                        collapsedTitle.innerHTML = '▼';
                        collapsedTitle.style.transform = '';
                    }
                });
                
                // Close dropdown when clicking elsewhere
                document.addEventListener('click', (e) => {
                    if (!collapsedTitle.contains(e.target) && !titleDropdown.contains(e.target)) {
                        titleDropdown.style.display = 'none';
                        collapsedTitle.innerHTML = '▼';
                        collapsedTitle.style.transform = '';
                    }
                });
                
                headerTitle.appendChild(collapsedTitle);
                document.body.appendChild(titleDropdown);
                
                // Store reference for updates
                collapsedTitle._dropdown = titleDropdown;
            }
            
            collapsedTitle.style.display = 'block';
            
            // Update dropdown content if museum name changed
            const museumNameText = document.getElementById('museum-name-text');
            const titleText = museumNameText ? museumNameText.textContent.trim() : '';
            const dropdown = collapsedTitle._dropdown;
            if (dropdown) {
                const dropdownNameText = dropdown.querySelector('.dropdown-name-text');
                const dropdownNameDisplay = dropdown.querySelector('.museum-name-display');
                if (dropdownNameText && dropdownNameDisplay) {
                    dropdownNameText.textContent = titleText;                // Update size after content change
                setTimeout(() => {
                    scaleDropdownToFit(dropdownNameDisplay);
                }, 10);
                }
            }
            
            // Reset button transforms
            const headerControls = document.querySelector('.header-controls');
            const headerRight = document.querySelector('.header-right');
            if (headerControls) { headerControls.style.transform = 'translateY(-50%)'; }
            if (headerRight) { headerRight.style.transform = 'translateY(-50%)'; }
            
            // Keep header at normal height
            header.style.height = '70px';
            document.body.style.paddingTop = '70px';
            document.documentElement.style.setProperty('--header-height', '70px');
            updateContainerHeights(70);
        }
        
        // Helper function to sync dropdown name with main input
        function syncDropdownWithMain(dropdownNameText) {
            const mainNameText = document.getElementById('museum-name-text');
            if (mainNameText) {
                mainNameText.textContent = dropdownNameText.textContent.trim();
                saveMuseumName();
            }
        }

        // Helper function to clean up contenteditable content
        function cleanupContentEditable(element) {
            const textContent = element.textContent.trim();
            if (!textContent) {
                element.innerHTML = '';
            }
            return textContent;
        }
        
        function hideCollapsedTitle() {
            const museumNameDisplay = document.querySelector('.museum-name-display');
            const collapsedTitle = document.querySelector('.collapsed-title-caret');
            
            // Show normal title
            if (museumNameDisplay) {
                museumNameDisplay.style.display = '';
            }
            
            // Hide collapsed title caret
            if (collapsedTitle) {
                collapsedTitle.style.display = 'none';
                // Also hide any open dropdown
                const dropdown = collapsedTitle._dropdown;
                if (dropdown) {
                    dropdown.style.display = 'none';
                    collapsedTitle.innerHTML = '▼';
                    collapsedTitle.style.transform = '';
                }
            }
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
            
            // Also update dropdown size if it's visible
            const collapsedTitle = document.querySelector('.collapsed-title-caret');
            if (collapsedTitle && collapsedTitle._dropdown) {
                const dropdown = collapsedTitle._dropdown;
                const dropdownNameDisplay = dropdown.querySelector('.museum-name-display');
                if (dropdown.style.display === 'block' && dropdownNameDisplay) {
                    scaleDropdownToFit(dropdownNameDisplay);
                }
            }
            
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
            // Museum name no longer saved to localStorage
            // Only stored in exported files
        }
    }
    
    // Public API
    return {
        init,
        checkAutosaveWarning
    };
})();

// Make App available globally for access from other modules
if (typeof window !== 'undefined') {
    window.App = App;
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', App.init);

// Cleanup resources when the page unloads
window.addEventListener('beforeunload', () => {
    if (window.DesmosUtils) {
        window.DesmosUtils.cleanup();
    }
});
