/**
 * Main Application Entry Point
 * Initializes the application and sets up routing
 */
(function() {
    // Initialize the application
    async function init() {
        try {
            // Initialize storage
            await StorageManager.init();
            
            // Reset onboarding session flag on new app start
            // This allows onboarding to show on new page visits, but not within the same session
            StorageManager.saveOnboardingSession(false);
            
            // Set up routes
            Router.init({
                'home': HomeController.init,
                'detail': DetailController.init
            }, 'home');
            
            // Remove loading state
            const loading = document.getElementById('loading');
            if (loading) {
                loading.remove();
            }
        } catch (error) {
            console.error('Error initializing application:', error);
            showError('Failed to initialize application. Please try refreshing the page.');
        }
    }
    
    /**
     * Show an error message
     * @param {string} message - Error message
     */
    function showError(message) {
        const appContainer = document.getElementById('app-container');
        
        // Clear the container
        appContainer.innerHTML = '';
        
        // Create error element
        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = message;
        
        // Append to container
        appContainer.appendChild(error);
    }
    
    // Run the application when DOM is ready
    document.addEventListener('DOMContentLoaded', init);
})();
