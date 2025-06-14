/**
 * Detail Controller
 * Manages detail view with Desmos integration
 */
const DetailController = (function() {
    // Private variables
    let calculator = null;
    let currentConcept = null;
    let idleTimer = null;
    let isOnboardingDisabled = false;
    let conceptDescription;
    
    /**
     * Initialize the detail controller
     * @param {Object} params - URL parameters
     */
    async function init(params) {
        // Check if concept ID is provided
        if (!params || !params.id) {
            console.error('No concept ID provided');
            Router.navigate('home');
            return;
        }
        
        // Get the concept from storage
        currentConcept = await StorageManager.getConcept(params.id);
        
        // If concept not found, go back to home
        if (!currentConcept) {
            console.error(`Concept not found: ${params.id}`);
            Router.navigate('home');
            return;
        }
        
        // Check if onboarding is disabled
        isOnboardingDisabled = PreferencesClient.isOnboardingDisabled();
        
        // Render the detail view
        render();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize Desmos calculator after rendering
        ensureDesmosLoaded();
    }
    
    /**
     * Render the detail view
     */
    function render() {
        // Get the app container
        const appContainer = document.getElementById('app-container');
        
        // Clear the container
        appContainer.innerHTML = '';
        
        // Clone the template
        const template = document.getElementById('detail-template');
        const detailView = template.content.cloneNode(true);
        
        // Set the concept title
        detailView.querySelector('#concept-title').textContent = currentConcept.displayName;
        
        // Append the detail view to the container
        appContainer.appendChild(detailView);
        
        // Set description text
        conceptDescription = document.getElementById('concept-description');
        conceptDescription.value = currentConcept.description || '';
    }
    
    /**
     * Check if Desmos is loaded and initialize calculator
     */
    function ensureDesmosLoaded() {
        if (typeof Desmos === 'undefined') {
            const container = document.getElementById('calculator-container');
            container.innerHTML = '<div class="loading-message">Loading Desmos calculator...</div>';
            setTimeout(ensureDesmosLoaded, 500);
            return;
        }
        initCalculator();
    }
    
    /**
     * Initialize the Desmos calculator
     */
    function initCalculator() {
        try {
            // Get the calculator container
            const container = document.getElementById('calculator-container');
            
            // Create the calculator
            calculator = Desmos.GraphingCalculator(container, {
                expressions: true,
                settingsMenu: true,
                zoomButtons: true,
                expressionsTopbar: true,
                border: false,
                lockViewport: false,
                pasteGraphLink: true
            });
            
            // Load saved state if available
            if (currentConcept.desmosState) {
                try {
                    calculator.setState(JSON.parse(currentConcept.desmosState));
                } catch (error) {
                    console.error('Error loading Desmos state:', error);
                    // Show error message to user
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = 'Error loading previous state. Starting with a blank calculator.';
                    container.appendChild(errorMsg);
                    
                    // Remove error message after 3 seconds
                    setTimeout(() => {
                        if (errorMsg.parentNode === container) {
                            container.removeChild(errorMsg);
                        }
                    }, 3000);
                }
            }
            
            // Since the calculator is now confirmed to be loaded, 
            // we can start the idle timer for onboarding
            startIdleTimer();
            
            // Listen for changes to detect image uploads
            calculator.observeEvent('change', debounce(() => {
                saveCalculatorState();
                resetIdleTimer();
            }, 1000));
        } catch (error) {
            console.error('Failed to initialize Desmos calculator:', error);
            const container = document.getElementById('calculator-container');
            container.innerHTML = '<div class="error-message">Failed to load calculator. Please refresh the page.</div>';
        }
    }
    
    /**
     * Setup event listeners for the detail view
     */
    function setupEventListeners() {
        // Back button
        document.getElementById('back-button').addEventListener('click', () => {
            saveChanges();
            Router.navigate('home');
        });
        
        // Description input
        conceptDescription.addEventListener('input', resetIdleTimer);
        conceptDescription.addEventListener('blur', saveDescription);
        
        // Window events for idle detection
        window.addEventListener('mousemove', resetIdleTimer);
        window.addEventListener('keydown', resetIdleTimer);
        window.addEventListener('click', resetIdleTimer);
        window.addEventListener('touchstart', resetIdleTimer);
    }
    
    /**
     * Save description when changed
     */
    function saveDescription() {
        const description = conceptDescription.value;
        
        // Only update if changed
        if (description !== currentConcept.description) {
            currentConcept = ConceptModel.updateConcept(currentConcept, { description });
            saveChanges();
        }
    }
    
    /**
     * Save calculator state
     */
    function saveCalculatorState() {
        if (!calculator) return;
        
        const state = calculator.getState();
        
        // Check if state has changed
        const stateString = JSON.stringify(state);
        if (stateString !== currentConcept.desmosState) {
            // Update the concept
            currentConcept = ConceptModel.updateConcept(currentConcept, { 
                desmosState: stateString 
            });
            
            // Clear thumbnail cache for this concept since state changed
            if (window.DesmosUtils && window.DesmosUtils.clearCache) {
                window.DesmosUtils.clearCache(currentConcept.id);
            }
            
            // Check if state has an image
            const hasImage = state && 
                             state.expressions && 
                             state.expressions.list && 
                             state.expressions.list.some(item => item.type === 'image');
            
            // If an image was detected, stop onboarding if in progress
            if (hasImage) {
                // Stop onboarding if in progress
                OnboardingController.stop();
            }
            
            // Save the changes
            saveChanges();
        }
    }
    
    /**
     * Save all changes
     */
    function saveChanges() {
        StorageManager.saveConcept(currentConcept);
    }
    
    /**
     * Start the idle timer for onboarding
     */
    function startIdleTimer() {
        // Only start if not disabled and not already shown in this session
        if (isOnboardingDisabled) {
            return;
        }
        
        if (StorageManager.getOnboardingSession()) {
            return;
        }
        
        // Wait a bit to ensure Desmos is fully initialized
        setTimeout(() => {
            resetIdleTimer();
        }, 2000);
    }
    
    /**
     * Reset the idle timer
     */
    function resetIdleTimer() {
        // Clear existing timer
        clearTimeout(idleTimer);
        
        // Only restart if not disabled and not already shown in this session
        if (isOnboardingDisabled) {
            return;
        }
        
        if (StorageManager.getOnboardingSession()) {
            return;
        }
        
        // Start new timer
        idleTimer = setTimeout(() => {
            // Start onboarding after idle period
            startOnboarding();
        }, 10000); // 10 seconds
    }
    
    /**
     * Start the onboarding flow
     */
    function startOnboarding() {
        // Only start if not disabled and not already shown in this session
        if (isOnboardingDisabled || StorageManager.getOnboardingSession()) {
            return;
        }
        
        // Check for any Desmos expression panel buttons which indicates the UI is loaded
        const calculatorContainer = document.getElementById('calculator-container');
        const expressionPanel = calculatorContainer.querySelector('.dcg-exppanel');
        const anyDesmosButton = calculatorContainer.querySelector('button');
        const addItemButton = calculatorContainer.querySelector('[aria-label="Add Item"]');
        
        // If we don't see any Desmos UI elements yet, wait and try again
        if (!expressionPanel && !anyDesmosButton && !addItemButton) {
            // Try again in 2 seconds
            setTimeout(startOnboarding, 2000);
            return;
        }
        
        OnboardingController.start();
    }
    
    /**
     * Utility: Debounce function to limit rapid state changes
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    
    // Public API
    return {
        init,
        render,
        cleanup: function() {
            // Clean up calculator instance
            if (calculator) {
                try {
                    calculator.destroy();
                } catch (error) {
                    console.error('Error destroying calculator:', error);
                }
                calculator = null;
            }
            
            // Clean up event listeners
            const backButton = document.getElementById('back-button');
            if (backButton) {
                backButton.removeEventListener('click', handleBackClick);
            }
            
            // Reset other variables
            concept = null;
            isCalculatorReady = false;
        }
    };
})();
