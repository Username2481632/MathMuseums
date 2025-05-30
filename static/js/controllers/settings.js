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
    let aspectRatioInputs;
    let screenFitInputs;
    
    /**
     * Initialize the settings controller
     */
    function init() {
        // Find DOM elements
        settingsButton = document.getElementById('settings-button');
        settingsModal = document.getElementById('settings-modal');
        closeSettingsBtn = document.getElementById('close-settings-modal');
        saveSettingsBtn = document.getElementById('save-settings');
        aspectRatioInputs = document.querySelectorAll('input[name="aspect-ratio"]');
        screenFitInputs = document.querySelectorAll('input[name="screen-fit"]');
        
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
     * Open settings modal
     */
    function openSettingsModal() {
        if (settingsModal) {
            settingsModal.style.display = 'block';
            loadCurrentSettings(); // Ensure settings are current when opening
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
        
        // Set aspect ratio
        if (aspectRatioInputs && preferences.aspectRatio) {
            for (const input of aspectRatioInputs) {
                input.checked = input.value === preferences.aspectRatio;
            }
        }
        
        // Set screen fit
        if (screenFitInputs && preferences.screenFit) {
            for (const input of screenFitInputs) {
                input.checked = input.value === preferences.screenFit;
            }
        }
    }
    
    /**
     * Save settings from the form
     */
    function saveSettings() {
        let aspectRatio = '16:9'; // Default
        let screenFit = 'fit'; // Default
        
        // Get selected aspect ratio
        for (const input of aspectRatioInputs) {
            if (input.checked) {
                aspectRatio = input.value;
                break;
            }
        }
        
        // Get selected screen fit
        for (const input of screenFitInputs) {
            if (input.checked) {
                screenFit = input.value;
                break;
            }
        }
        
        // Save new preferences
        PreferencesClient.savePreferences({
            aspectRatio: aspectRatio,
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

// Initialize settings controller when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    SettingsController.init();
});
