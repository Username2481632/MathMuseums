/**
 * Main Application Entry Point
 * Initializes the application and sets up routing
 */
var App = (function() {
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
                    
                    await FileManager.downloadUserData(filename);
                    
                    // Show success message
                    showNotification('File exported successfully!', 'success');
                    
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
                    case 'e':
                    case 's':
                        // Export/Save shortcuts (Ctrl+E or Ctrl+S)
                        event.preventDefault();
                        const exportButton = document.getElementById('export-file-button');
                        if (exportButton && !exportButton.disabled) {
                            exportButton.click();
                        }
                        break;
                    
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
            
            if (naturalTitleWidth > maxTitleWidth && maxTitleWidth > 100) {
                // Calculate scale factor (always less than 1)
                const scaleFactor = Math.min(0.99, maxTitleWidth / naturalTitleWidth);
                
                // Apply scaling to title
                museumNameDisplay.style.transform = `scale(${scaleFactor})`;
                museumNameDisplay.style.transformOrigin = 'center';
                
                // Apply scaling to buttons
                if (headerControls) {
                    headerControls.style.transform = `translateY(-50%) scale(${scaleFactor})`;
                    headerControls.style.transformOrigin = 'left center';
                }
                if (headerRight) {
                    headerRight.style.transform = `translateY(-50%) scale(${scaleFactor})`;
                    headerRight.style.transformOrigin = 'right center';
                }
                
                // Scale header height proportionally (never more than 70px)
                const newHeight = Math.min(70, 70 * scaleFactor);
                header.style.height = `${newHeight}px`;
                document.body.style.paddingTop = `${newHeight}px`;
                
                // Update CSS custom property for tiles container
                document.documentElement.style.setProperty('--header-height', `${newHeight}px`);
                
                console.log('Applied scaling:', { scaleFactor, newHeight });
            } else {
                // Reset to normal size
                museumNameDisplay.style.transform = '';
                if (headerControls) headerControls.style.transform = 'translateY(-50%)';
                if (headerRight) headerRight.style.transform = 'translateY(-50%)';
                header.style.height = '70px';
                document.body.style.paddingTop = '70px';
                
                // Reset CSS custom property for tiles container
                document.documentElement.style.setProperty('--header-height', '70px');
                
                console.log('Reset to normal size');
            }
        }
        
        // Update header size on window resize
        window.addEventListener('resize', updateHeaderSize);
        
        // Initial header size update
        setTimeout(updateHeaderSize, 100);
        
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
