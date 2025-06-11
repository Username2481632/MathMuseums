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
        const museumNameText = document.getElementById('museum-name-text');
        const museumNameBox = document.getElementById('museum-name-box');
        
        if (!museumNameText || !museumNameBox) return;
        
        // Load saved museum name
        const savedName = localStorage.getItem('mm_museum_name');
        if (savedName) {
            museumNameText.textContent = savedName;
        }
        
        // Initial setup - delay to ensure elements are fully rendered
        setTimeout(() => {
            updateDisplay();
            updateContentVisibility();
        }, 50);
        
        // Show the entire title section after proper sizing
        const headerTitle = document.querySelector('.header-title');
        setTimeout(() => {
            if (headerTitle) {
                headerTitle.classList.add('ready');
            }
        }, 10);
        
        // Function to manage content visibility
        function updateContentVisibility() {
            const hasContent = museumNameText.textContent.trim().length > 0;
            const isFocused = document.activeElement === museumNameText;
            
            if (hasContent && !isFocused) {
                museumNameBox.classList.add('content-hidden');
            } else {
                museumNameBox.classList.remove('content-hidden');
            }
        }
        
        // Function to update display and sizing
        function updateDisplay() {
            const value = museumNameText.textContent.trim();
            const displayValue = value || museumNameText.getAttribute('data-placeholder');
            const isEmpty = !value;
            
            // Measure both the name text and the suffix to get total width
            const measurer = document.createElement('span');
            measurer.style.visibility = 'hidden';
            measurer.style.position = 'absolute';
            measurer.style.whiteSpace = 'pre';
            measurer.style.pointerEvents = 'none';
            measurer.style.top = '-9999px';
            
            // Copy font properties
            const textStyles = window.getComputedStyle(museumNameText);
            measurer.style.fontFamily = textStyles.fontFamily;
            measurer.style.fontSize = textStyles.fontSize;
            measurer.style.fontWeight = textStyles.fontWeight;
            measurer.style.fontStyle = textStyles.fontStyle;
            measurer.style.letterSpacing = textStyles.letterSpacing;
            measurer.style.wordSpacing = textStyles.wordSpacing;
            
            // Measure the name text width (use actual value or placeholder)
            measurer.textContent = displayValue;
            document.body.appendChild(measurer);
            const nameWidth = measurer.offsetWidth;
            
            // Measure the suffix width
            measurer.textContent = "'s Math Museum";
            const suffixWidth = measurer.offsetWidth;
            
            document.body.removeChild(measurer);
            
            // Calculate total title width (name + suffix)
            const totalTitleWidth = nameWidth + suffixWidth;
            
            // Calculate container position to center the entire title
            const headerTitle = document.querySelector('.header-title');
            const headerTitleWidth = headerTitle.offsetWidth;
            const headerControls = document.querySelector('.header-controls');
            const headerRight = document.querySelector('.header-right');
            
            // Calculate available space (excluding controls)
            const controlsWidth = headerControls ? headerControls.offsetWidth + 32 : 0; // 32px for margins
            const rightWidth = headerRight ? headerRight.offsetWidth + 32 : 0;
            const availableWidth = headerTitleWidth - controlsWidth - rightWidth;
            
            // Calculate center position within available space
            const centerOfAvailableSpace = controlsWidth + (availableWidth / 2);
            
            // Calculate left position: center minus half of total title width
            // This positions the left edge such that the entire title appears centered
            const leftPosition = centerOfAvailableSpace - (totalTitleWidth / 2);
            
            // Apply the calculated position
            const container = document.querySelector('.museum-name-container');
            container.style.left = `${leftPosition}px`;
            container.style.transform = 'none'; // Remove the initial centering transform
            
            // Always calculate and position the box, regardless of visibility
            const boxPadding = 16;
            const boxWidth = Math.max(nameWidth + boxPadding, 40); // Box only around the name
            const maxWidth = availableWidth * 0.8; // Limit to 80% of available space
            const finalWidth = Math.min(boxWidth, maxWidth);
            
            // Position and size the box under the text
            const textRect = museumNameText.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // Set box dimensions
            museumNameBox.style.width = `${finalWidth}px`;
            museumNameBox.style.height = `${textRect.height}px`;
            
            // Position box to align with text
            const leftOffset = textRect.left - containerRect.left - (boxPadding / 2);
            museumNameBox.style.left = `${leftOffset}px`;
            museumNameBox.style.top = '0px';
        }
        
        // Event listeners
        museumNameText.addEventListener('focus', () => {
            updateContentVisibility();
        });
        
        museumNameText.addEventListener('input', () => {
            // Clean up the content - remove any non-text nodes or empty spaces
            const textContent = museumNameText.textContent.trim();
            if (!textContent) {
                // If empty, clear everything to ensure CSS :empty pseudo-element works
                museumNameText.innerHTML = '';
            }
            
            updateDisplay();
            updateContentVisibility();
            saveMuseumName();
        });
        
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
                    updateDisplay();
                }, 0);
            } else {
                setTimeout(updateDisplay, 0);
            }
        });
        
        museumNameText.addEventListener('paste', (event) => {
            // Allow paste but prevent HTML formatting
            event.preventDefault();
            const text = (event.clipboardData || window.clipboardData).getData('text/plain');
            const maxLength = 30;
            const truncatedText = text.substring(0, maxLength);
            
            // Insert plain text at cursor position
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(truncatedText));
                range.collapse(false);
            }
            
            setTimeout(() => {
                updateDisplay();
                updateContentVisibility();
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
            
            updateContentVisibility();
            saveMuseumName();
        });
        
        // Limit text length to 30 characters
        museumNameText.addEventListener('beforeinput', (event) => {
            if (event.inputType === 'insertText' || event.inputType === 'insertCompositionText') {
                const currentLength = museumNameText.textContent.length;
                const newTextLength = event.data ? event.data.length : 0;
                
                if (currentLength + newTextLength > 30) {
                    event.preventDefault();
                }
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', updateDisplay);
        
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
