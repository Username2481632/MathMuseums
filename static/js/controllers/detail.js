/**
 * Detail Controller
 * Manages detail view with Desmos integration
 */
const DetailController = (function() {
    // Private variables
    let calculator = null;
    let currentConcept = null;
    let isCalculatorReady = false;
    let isOnboardingDisabled = false;
    let abortController = new AbortController();
    
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
        
        // Set up responsive header behavior
        setupResponsiveHeader();
    }
    
    /**
     * Setup responsive header behavior for narrow screens
     */
    function setupResponsiveHeader() {
        function updateHeaderForScreenSize() {
            const backButton = document.getElementById('back-button');
            const toggleButton = document.getElementById('detail-toggle-button');
            const conceptTitle = document.getElementById('concept-title');
            
            if (!backButton || !toggleButton || !conceptTitle) return;
            
            const screenWidth = window.innerWidth;
            
            // Store original text if not already stored
            if (!backButton.dataset.originalText) {
                backButton.dataset.originalText = backButton.textContent;
            }
            if (!toggleButton.dataset.originalTextShow) {
                toggleButton.dataset.originalTextShow = 'Show Notes';
                toggleButton.dataset.originalTextHide = 'Show Desmos';
            }
            
            // Adjust button text based on screen width
            if (screenWidth <= 320) {
                // Very narrow screens - use minimal text
                backButton.textContent = 'Back';
                const isShowingNotes = document.querySelector('.detail-content.show-notes');
                toggleButton.textContent = isShowingNotes ? 'Desmos' : 'Notes';
            } else if (screenWidth <= 480) {
                // Narrow screens - use shortened text
                backButton.textContent = 'Back';
                const isShowingNotes = document.querySelector('.detail-content.show-notes');
                toggleButton.textContent = isShowingNotes ? 'Show Desmos' : 'Show Notes';
            } else {
                // Normal screens - use full text
                backButton.textContent = backButton.dataset.originalText;
                const isShowingNotes = document.querySelector('.detail-content.show-notes');
                toggleButton.textContent = isShowingNotes ? 
                    toggleButton.dataset.originalTextHide : 
                    toggleButton.dataset.originalTextShow;
            }
        }
        
        // Initial call
        updateHeaderForScreenSize();
        
        // Listen for window resize
        window.addEventListener('resize', updateHeaderForScreenSize);
        
        // Listen for viewport changes from PWA manager
        window.addEventListener('viewportChanged', updateHeaderForScreenSize);
        
        // Listen for viewport changes to resize calculator
        window.addEventListener('viewportChanged', () => {
            if (calculator && isCalculatorReady) {
                // Small delay to allow layout to settle
                setTimeout(() => {
                    try {
                        calculator.resize();
                    } catch (error) {
                        console.warn('Calculator resize failed:', error);
                    }
                }, 100);
            }
        });
        
        // Store reference to update function for toggle view
        window.updateDetailHeaderForScreenSize = updateHeaderForScreenSize;
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
            
            // Clear any loading messages or previous content
            container.innerHTML = '';
            
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
            
            // Mark calculator as ready
            isCalculatorReady = true;
            
            // Since the calculator is now confirmed to be loaded, 
            // we can start the idle timer for onboarding
            startIdleTimer();
            
            // Listen for changes only for idle timer reset and onboarding
            // State saving is now handled synchronously
            // On navigation and on file export
            calculator.observeEvent('change', () => {
                resetIdleTimer();
                
                // Check if state has an image for onboarding purposes
                const state = calculator.getState();
                const hasImage = state && 
                                 state.expressions && 
                                 state.expressions.list && 
                                 state.expressions.list.some(item => item.type === 'image');
                
                // If an image was detected, stop onboarding if in progress
                if (hasImage) {
                    OnboardingController.stop();
                }
            });
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
        // Back button - save state synchronously before navigation
        document.getElementById('back-button').addEventListener('click', () => {
            saveCalculatorState();
            Router.navigate('home');
        });

        // Toggle button for switching between Desmos and notes
        document.getElementById('detail-toggle-button').addEventListener('click', toggleView);
        
        // Swap button click for swap mode
        const swapButton = document.getElementById('swap-content-button');
        if (swapButton) {
            swapButton.addEventListener('click', handleSwapButtonClick);
        }
        
        // Description input
        conceptDescription.addEventListener('input', startIdleTimer);
        conceptDescription.addEventListener('blur', saveDescription);
        
        // Window events for idle detection
        window.addEventListener('mousemove', startIdleTimer);
        window.addEventListener('keydown', startIdleTimer);
        window.addEventListener('click', startIdleTimer);
        window.addEventListener('touchstart', startIdleTimer);
    }

    /**
     * Handle swap button click to initiate swap mode
     */
    function handleSwapButtonClick() {
        if (!currentConcept) return;
        
        // Capture the concept ID before navigation to avoid null reference
        const conceptId = currentConcept.id;
        
        // Save current state before navigating
        saveCalculatorState();
        saveDescription();
        
        // Set up event listener for when home controller is ready
        function onHomeControllerReady() {
            document.removeEventListener('homeControllerReady', onHomeControllerReady);
            if (window.HomeController && window.HomeController.startSwapMode) {
                window.HomeController.startSwapMode(conceptId);
            }
        }
        
        document.addEventListener('homeControllerReady', onHomeControllerReady);
        
        // Navigate to home view and start swap mode directly
        Router.navigate('home');
    }

    /**
     * Toggle between calculator and notes view
     */
    function toggleView() {
        const detailContent = document.querySelector('.detail-content');
        const toggleButton = document.getElementById('detail-toggle-button');
        
        if (detailContent.classList.contains('show-calculator')) {
            // Switch to notes view
            detailContent.classList.remove('show-calculator');
            detailContent.classList.add('show-notes');
            toggleButton.textContent = 'Show Desmos';
        } else {
            // Switch to calculator view
            detailContent.classList.remove('show-notes');
            detailContent.classList.add('show-calculator');
            toggleButton.textContent = 'Show Notes';
        }
        
        // Update header text for current screen size
        if (window.updateDetailHeaderForScreenSize) {
            setTimeout(window.updateDetailHeaderForScreenSize, 10);
        }
    }
    
    /**
     * Save description when changed
     */
    function saveDescription() {
        // Only save if we have a valid conceptDescription element (i.e., we're in detail view)
        if (typeof conceptDescription === 'undefined' || !conceptDescription) {
            return;
        }
        
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
        const stateString = JSON.stringify(state);
        
        if (stateString !== currentConcept.desmosState) {
            // Update the concept
            currentConcept = ConceptModel.updateConcept(currentConcept, { 
                desmosState: stateString 
            });
            
            // Check if state has an image
            const hasImage = state && 
                             state.expressions && 
                             state.expressions.list && 
                             state.expressions.list.some(item => item.type === 'image');
            
            // If an image was detected, stop onboarding if in progress
            if (hasImage) {
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
        // Check if we're in calculator view
        const detailContent = document.querySelector('.detail-content');
        if (!detailContent || !detailContent.classList.contains('show-calculator')) {
            return; // Only show onboarding in calculator view
        }
        
        // Check if onboarding is disabled or already shown in this session
        if (isOnboardingDisabled || StorageManager.getOnboardingSession()) {
            return;
        }
        
        // Clear any existing timers
        abortController.abort();
        abortController = new AbortController();
        const { signal } = abortController;
        
        // Wait for Desmos to initialize
        setTimeout(() => {
            if (signal.aborted) return;

            // Check for calculator container
            const calculatorContainer = document.getElementById('calculator-container');
            if (!calculatorContainer) return;
            
            // Check for Desmos UI elements
            const hasDesmosUI = calculatorContainer.querySelector('.dcg-exppanel, button, [aria-label="Add Item"]');
            if (!hasDesmosUI) {
                // Try again in 2 seconds if UI not ready
                const retryTimer = setTimeout(() => {
                    if (!signal.aborted && document.querySelector('.detail-content.show-calculator')) {
                        startOnboarding();
                    }
                }, 2000);
                
                // Clean up if aborted
                signal.addEventListener('abort', () => clearTimeout(retryTimer));
                return;
            }
            
            // Start the actual idle timer
            const idleTimer = setTimeout(() => {
                if (signal.aborted || !document.querySelector('.detail-content.show-calculator')) {
                    return;
                }
                startOnboarding();
            }, 10000);
            
            // Clean up if aborted
            signal.addEventListener('abort', () => clearTimeout(idleTimer));
            
        }, 2000);
    }
    
    /**
     * Reset the idle timer for onboarding (restart timer when user is active)
     */
    function resetIdleTimer() {
        // Simply restart the idle timer
        startIdleTimer();
    }
    
    /**
     * Start the onboarding flow
     */
    function startOnboarding() {        
        if (isOnboardingDisabled || StorageManager.getOnboardingSession()) {
            return;
        }
        
        const calculatorContainer = document.getElementById('calculator-container');
        if (!calculatorContainer) {
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
        saveCalculatorState,
        saveDescription,
        refresh: async function() {
            // Refresh current concept data and re-render if we have a current concept
            if (currentConcept) {
                const refreshedConcept = await StorageManager.getConcept(currentConcept.id);
                
                if (refreshedConcept) {
                    currentConcept = refreshedConcept;
                    
                    // Clean up existing calculator before re-render
                    if (calculator) {
                        calculator.destroy()?.catch(console.error);
                        calculator = null;
                    }
                    
                    // Re-render the view with updated concept data
                    render();
                    
                    // Re-setup event listeners after render
                    setupEventListeners();
                    
                    // Re-initialize Desmos calculator
                    ensureDesmosLoaded();
                    
                }
            }
        },
        cleanup() {
            // Save calculator state before cleanup (handles browser back button)
            if (calculator && currentConcept) {
                saveCalculatorState();
            }
            
            // Clean up timers and async operations
            abortController.abort();
            
            // Clean up calculator
            if (calculator) {
                calculator.destroy()?.catch(console.error);
                calculator = null;
            }
            
            // Reset state
            concept = currentConcept = null;
            isCalculatorReady = false;
        }
    };
})();

// Expose DetailController globally for access from other modules
if (typeof window !== 'undefined') {
    window.DetailController = DetailController;
}
