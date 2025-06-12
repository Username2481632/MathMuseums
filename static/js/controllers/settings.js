/**
 * Settings Controller
 * Handles settings modal and preference changes
 */
const SettingsController = (function() {
    // DOM elements
    let settingsButton;
    let settingsModal;
    let closeSettingsBtn;
    let saveSettingsBtn;
    let aspectWidthInput;
    let aspectHeightInput;
    let screenFitControl;
    
    /**
     * Initialize the settings controller
     */
    function init() {
        // Find DOM elements
        settingsButton = document.getElementById('settings-button');
        settingsModal = document.getElementById('settings-modal');
        closeSettingsBtn = document.getElementById('close-settings-modal');
        saveSettingsBtn = document.getElementById('save-settings');
        aspectWidthInput = document.getElementById('aspect-width');
        aspectHeightInput = document.getElementById('aspect-height');
        screenFitControl = document.getElementById('screen-fit-control');
        
        // Add event listeners
        if (settingsButton) {
            settingsButton.addEventListener('click', openSettingsModal);
        }
        
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', closeSettingsModal);
        }
        
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', saveSettings);
        }

        if (screenFitControl) {
            screenFitControl.addEventListener('click', function(event) {
                if (event.target.classList.contains('segmented-control-button')) {
                    const buttons = screenFitControl.querySelectorAll('.segmented-control-button');
                    buttons.forEach(btn => btn.classList.remove('active'));
                    event.target.classList.add('active');
                }
            });
        }
        
        // Add digit-only input validation for aspect ratio inputs
        if (aspectWidthInput) {
            addDigitOnlyValidation(aspectWidthInput);
        }
        if (aspectHeightInput) {
            addDigitOnlyValidation(aspectHeightInput);
        }
        
        // When clicking outside the modal, close it
        window.addEventListener('click', function(event) {
            if (event.target === settingsModal) {
                closeSettingsModal();
            }
        });
        
        // Load current settings
        loadCurrentSettings();
    }
    
    /**
     * Add digit-only validation to an input field
     * @param {HTMLInputElement} input - The input element to validate
     */
    function addDigitOnlyValidation(input) {
        input.addEventListener('keydown', function(event) {
            // Allow backspace, delete, tab, escape, enter
            if ([8, 9, 27, 13, 46].indexOf(event.keyCode) !== -1 ||
                // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                (event.keyCode === 65 && event.ctrlKey === true) ||
                (event.keyCode === 67 && event.ctrlKey === true) ||
                (event.keyCode === 86 && event.ctrlKey === true) ||
                (event.keyCode === 88 && event.ctrlKey === true)) {
                return;
            }
            // Ensure that it's a number and stop the keypress
            if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) && (event.keyCode < 96 || event.keyCode > 105)) {
                event.preventDefault();
            }
        });
        
        // Also validate on paste
        input.addEventListener('paste', function(event) {
            setTimeout(function() {
                const value = input.value.replace(/[^0-9]/g, '');
                if (value !== input.value) {
                    input.value = value;
                }
                // Ensure minimum value of 1
                if (parseInt(input.value) < 1) {
                    input.value = '1';
                }
            }, 0);
        });
        
        // Validate on blur
        input.addEventListener('blur', function() {
            if (!input.value || parseInt(input.value) < 1) {
                input.value = '1';
            }
        });
    }
    
    /**
     * Open settings modal
     */
    function openSettingsModal() {
        if (settingsModal) {
            settingsModal.style.display = 'block';
            loadCurrentSettings(); // Ensure settings are current when opening
            // Add Autosave toggle - always available now since file save status is no longer tracked
            let autosaveRow = document.getElementById('autosave-toggle-row');
            if (!autosaveRow) {
                autosaveRow = document.createElement('div');
                autosaveRow.className = 'settings-group';
                autosaveRow.id = 'autosave-toggle-row';
                autosaveRow.innerHTML = `
                    <h3>Autosave</h3>
                    <div class="settings-options" style="display: flex; justify-content: flex-end;">
                        <label class="toggle-switch">
                            <input type="checkbox" id="autosave-toggle">
                            <span class="slider"></span>
                        </label>
                    </div>
                `;
                settingsModal.querySelector('.settings-container').appendChild(autosaveRow);
                // Set initial state from preferences
                const autosavePref = PreferencesClient.getPreferences().autosave;
                document.getElementById('autosave-toggle').checked = !!autosavePref;
                document.getElementById('autosave-toggle').addEventListener('change', function(e) {
                    PreferencesClient.savePreferences({ autosave: e.target.checked });
                });
            }
        }
    }
    
    /**
     * Close settings modal
     */
    function closeSettingsModal() {
        if (settingsModal) {
            settingsModal.style.display = 'none';
        }
    }
    
    /**
     * Load current settings into form inputs
     */
    function loadCurrentSettings() {
        const preferences = PreferencesClient.getPreferences();
        
        // Set aspect ratio inputs
        if (aspectWidthInput && aspectHeightInput) {
            aspectWidthInput.value = preferences.aspectRatioWidth || 1;
            aspectHeightInput.value = preferences.aspectRatioHeight || 1;
        }
        
        // Set screen fit
        if (screenFitControl && preferences.screenFit) {
            const buttons = screenFitControl.querySelectorAll('.segmented-control-button');
            buttons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.value === preferences.screenFit);
            });
        }
    }
    
    /**
     * Save settings from the form
     */
    function saveSettings() {
        let aspectRatioWidth = 1; // Default
        let aspectRatioHeight = 1; // Default
        let screenFit = 'fit'; // Default
        
        // Get aspect ratio values
        if (aspectWidthInput && aspectHeightInput) {
            aspectRatioWidth = Math.max(1, parseInt(aspectWidthInput.value) || 1);
            aspectRatioHeight = Math.max(1, parseInt(aspectHeightInput.value) || 1);
        }
        
        // Get selected screen fit
        if (screenFitControl) {
            const activeButton = screenFitControl.querySelector('.segmented-control-button.active');
            if (activeButton) {
                screenFit = activeButton.dataset.value;
            }
        }
        
        // Save new preferences
        PreferencesClient.savePreferences({
            aspectRatioWidth: aspectRatioWidth,
            aspectRatioHeight: aspectRatioHeight,
            screenFit: screenFit
        });
        
        // Close modal
        closeSettingsModal();
    }
    
    // Public API
    return {
        init
    };
})();

// Don't initialize immediately - let App.init handle the initialization order
