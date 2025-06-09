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

            // Setup Classmates' Work Feature
            setupClassmatesWorkFeature();
            
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
     * Sets up the Classmates' Work feature UI and logic
     */
    function setupClassmatesWorkFeature() {
        const shareToggle = document.getElementById('share-toggle');
        const openClassmatesModalBtn = document.getElementById('classmates-work-button');
        const classmatesModal = document.getElementById('classmates-work-modal');
        const closeClassmatesModalBtn = document.getElementById('close-classmates-modal');
        const classmatesTilesContainer = document.getElementById('classmates-tiles-container');

        if (!shareToggle || !openClassmatesModalBtn || !classmatesModal || !closeClassmatesModalBtn || !classmatesTilesContainer) {
            console.error('One or more elements for Classmates\' Work feature not found.');
            return;
        }

        // Initialize toggle state
        if (PreferencesClient.isLoaded()) {
            const currentPrefs = PreferencesClient.getPreferences();
            shareToggle.checked = currentPrefs.share_with_classmates;
        } else {
            // Fallback if preferences haven't loaded, though PreferencesClient.init() should be awaited
            // Or listen for a custom event once preferences are loaded
            console.warn('Preferences not fully loaded when setting up share toggle.');
            // Attempt to load again or set a default visual state
            shareToggle.checked = true; // Default to checked if prefs not loaded
        }

        shareToggle.addEventListener('change', () => {
            PreferencesClient.savePreferences({ share_with_classmates: shareToggle.checked });
        });

        openClassmatesModalBtn.addEventListener('click', async () => {
            classmatesTilesContainer.innerHTML = '<p>Loading classmates\' work...</p>';
            classmatesModal.style.display = 'block';
            try {
                const response = await fetch('/api/classmates/work/', {
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: {
                        'X-CSRFToken': AuthClient.getCSRFToken() // Important for authenticated GET if CSRF is enforced globally
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                renderClassmatesWork(data, classmatesTilesContainer);
            } catch (error) {
                console.error('Error fetching classmates\' work:', error);
                classmatesTilesContainer.innerHTML = '<p>Could not load classmates\' work. Please try again later.</p>';
            }
        });

        closeClassmatesModalBtn.addEventListener('click', () => {
            classmatesModal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === classmatesModal) {
                classmatesModal.style.display = 'none';
            }
        });
    }

    /**
     * Renders the classmates' work or a fallback message.
     * @param {Array|Object} data - The data from the API (array of tiles or object with message).
     * @param {HTMLElement} container - The HTML element to render into.
     */
    function renderClassmatesWork(data, container) {
        container.innerHTML = ''; // Clear loading message

        if (data.message) { // Check for a server-side message (e.g., fallback)
            const messageEl = document.createElement('p');
            messageEl.textContent = data.message;
            container.appendChild(messageEl);
            return;
        }

        if (!Array.isArray(data) || data.length === 0) {
            const fallbackMsg = document.createElement('p');
            fallbackMsg.textContent = 'No classmates\' work to display at the moment.';
            container.appendChild(fallbackMsg);
            return;
        }

        data.forEach(tileData => {
            const tileEl = document.createElement('div');
            tileEl.classList.add('classmate-tile');
            // Sanitize content before adding to innerHTML if it comes from user input
            // For now, assuming tileData fields are safe or will be simple strings
            tileEl.innerHTML = `
                <h4>${escapeHTML(tileData.title)}</h4>
                <p>By: ${escapeHTML(tileData.user_email ? tileData.user_email.split('@')[0] : 'Anonymous')}</p>
                ${tileData.preview_image_url ? `<img src="${escapeHTML(tileData.preview_image_url)}" alt="${escapeHTML(tileData.title)} Preview" style="width:100%; height:auto; max-height:100px; object-fit:contain;">` : '<p><em>No preview available</em></p>'}
                <p>${escapeHTML(tileData.description ? tileData.description.substring(0, 50) + '...' : 'No description.')}</p>
            `;
            // TODO: Add click handler to view full tile if desired (out of current scope)
            container.appendChild(tileEl);
        });
    }

    /**
     * Escapes HTML characters to prevent XSS.
     * @param {string} str - The string to escape.
     * @returns {string} The escaped string.
     */
    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"'`]/g, match => {
            const escape = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '`': '&#x60;'
            };
            return escape[match];
        });
    }

    /**
     * Set up file management buttons functionality
     */
    function setupFileManagementButtons() {
        // Set up save file button
        const saveFileButton = document.getElementById('save-file-button');
        if (saveFileButton) {
            saveFileButton.addEventListener('click', async () => {
                try {
                    saveFileButton.disabled = true;
                    saveFileButton.textContent = '💾 Saving...';
                    
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                    const filename = `my-math-museum-${timestamp}.json`;
                    
                    await FileManager.downloadUserData(filename);
                    
                    // Show success message
                    showNotification('File saved successfully!', 'success');
                    
                } catch (error) {
                    console.error('Error saving file:', error);
                    showNotification('Failed to save file: ' + error.message, 'error');
                } finally {
                    saveFileButton.disabled = false;
                    saveFileButton.textContent = '💾 Save File';
                }
            });
        }
        
        // Set up load file button
        const loadFileButton = document.getElementById('load-file-button');
        if (loadFileButton) {
            const fileInput = FileManager.createFileInput(async (file) => {
                try {
                    loadFileButton.disabled = true;
                    loadFileButton.textContent = '📁 Loading...';
                    
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
                    console.error('Error loading file:', error);
                    showNotification('Failed to load file: ' + error.message, 'error');
                } finally {
                    loadFileButton.disabled = false;
                    loadFileButton.textContent = '📁 Load File';
                }
            });
            
            // Append hidden file input to body
            document.body.appendChild(fileInput);
            
            // Trigger file input when button is clicked
            loadFileButton.addEventListener('click', () => {
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

    // Public API
    return {
        init
    };
})();

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
