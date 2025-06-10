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
                    const filename = `my-math-museum-${timestamp}.json`;
                    
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
        const message = `Import museum data from file?
        
File contains:
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
            // Check if Ctrl key is pressed (or Cmd on Mac)
            if (event.ctrlKey || event.metaKey) {
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
                    
                    case 'o':
                    case 'i':
                        // Import/Open shortcuts (Ctrl+O or Ctrl+I)
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
        const museumNameInput = document.getElementById('museum-name-input');
        if (!museumNameInput) return;
        
        // Load saved museum name
        const savedName = localStorage.getItem('mm_museum_name');
        if (savedName) {
            museumNameInput.value = savedName;
        }
        
        // Initial resize
        resizeInputToContent();
        
        // Function to dynamically resize input to fit content
        function resizeInputToContent() {
            let text = museumNameInput.value || museumNameInput.placeholder;
            
            // Handle spaces properly - replace with non-breaking spaces for measurement
            const measureText = text.replace(/ /g, '\u00A0');
            
            // Create a temporary measuring element each time for accuracy
            const measurer = document.createElement('span');
            measurer.style.visibility = 'hidden';
            measurer.style.position = 'absolute';
            measurer.style.whiteSpace = 'nowrap';
            measurer.style.pointerEvents = 'none';
            measurer.style.top = '-9999px'; // Move further offscreen
            
            // Copy all relevant font properties from the input
            const inputStyles = window.getComputedStyle(museumNameInput);
            measurer.style.fontFamily = inputStyles.fontFamily;
            measurer.style.fontSize = inputStyles.fontSize;
            measurer.style.fontWeight = inputStyles.fontWeight;
            measurer.style.fontStyle = inputStyles.fontStyle;
            measurer.style.letterSpacing = inputStyles.letterSpacing;
            measurer.style.wordSpacing = inputStyles.wordSpacing;
            
            measurer.textContent = measureText;
            document.body.appendChild(measurer);
            
            const textWidth = measurer.offsetWidth;
            document.body.removeChild(measurer);
            
            // Make box wider than needed - extra space acts as visual padding
            const extraSpace = 48; // 24px on each side as visual padding
            const totalWidth = textWidth + extraSpace;
            const maxWidth = window.innerWidth * 0.4; // Allow up to 40% of viewport
            
            const finalWidth = Math.min(totalWidth, maxWidth);
            museumNameInput.style.width = `${finalWidth}px`;
        }
        
        // Add faint styling when focused on empty input (showing placeholder)
        museumNameInput.addEventListener('focus', () => {
            if (!museumNameInput.value.trim()) {
                museumNameInput.classList.add('placeholder-focused');
            }
            resizeInputToContent();
        });
        
        // Toggle faint styling based on input content and resize
        museumNameInput.addEventListener('input', () => {
            if (!museumNameInput.value.trim() && document.activeElement === museumNameInput) {
                museumNameInput.classList.add('placeholder-focused');
            } else {
                museumNameInput.classList.remove('placeholder-focused');
            }
            resizeInputToContent();
            saveMuseumName();
        });
        
        // Handle Enter key and resize on other keys
        museumNameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                museumNameInput.blur();
                return;
            }
            // Resize after key is processed
            setTimeout(resizeInputToContent, 0);
        });
        
        // Resize on paste
        museumNameInput.addEventListener('paste', () => {
            setTimeout(resizeInputToContent, 10);
        });
        
        // Remove faint styling on blur and save
        museumNameInput.addEventListener('blur', () => {
            museumNameInput.classList.remove('placeholder-focused');
            saveMuseumName();
        });
        
        function saveMuseumName() {
            const name = museumNameInput.value.trim();
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
