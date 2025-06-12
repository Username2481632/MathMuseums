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
            console.log('Desmos API not yet loaded, waiting...');
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
            console.log('Desmos calculator initialized successfully');
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
            console.log('Onboarding is permanently disabled by user preference');
            return;
        }
        
        if (StorageManager.getOnboardingSession()) {
            console.log('Onboarding already shown in this session, not starting idle timer');
            return;
        }
        
        console.log('Starting idle timer for onboarding');
        
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
            console.log('Onboarding is disabled or already shown in this session');
            return;
        }
        
        // Debug the Desmos DOM structure to help identify the correct selectors
        debugDesmosDomStructure();
        
        // Check for any Desmos expression panel buttons which indicates the UI is loaded
        const calculatorContainer = document.getElementById('calculator-container');
        const expressionPanel = calculatorContainer.querySelector('.dcg-exppanel');
        const anyDesmosButton = calculatorContainer.querySelector('button');
        const addItemButton = calculatorContainer.querySelector('[aria-label="Add Item"]');
        
        // Log what we found for debugging
        console.log('Expression panel found:', !!expressionPanel);
        console.log('Any Desmos button found:', !!anyDesmosButton);
        console.log('Add Item button found:', !!addItemButton);
        
        // If we don't see any Desmos UI elements yet, wait and try again
        if (!expressionPanel && !anyDesmosButton && !addItemButton) {
            console.log('Desmos UI not fully loaded yet, delaying onboarding');
            // Try again in 2 seconds
            setTimeout(startOnboarding, 2000);
            return;
        }
        
        console.log('Desmos UI appears to be loaded, starting onboarding');
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
    
    /**
     * Debug function to reveal Desmos DOM structure
     */
    function debugDesmosDomStructure() {
        console.log('Debugging Desmos DOM structure');
        
        // Log all calculator container elements
        const calculatorContainer = document.getElementById('calculator-container');
        if (!calculatorContainer) {
            console.log('Calculator container not found');
            return;
        }
        
        console.log('Calculator container structure:', calculatorContainer);
        
        // Find all potential "add item" buttons using various possible selectors
        const addItemButton = calculatorContainer.querySelector('[aria-label="Add Item"]');
        const potentialButtons = [
            ...calculatorContainer.querySelectorAll('.dcg-action-additem'),
            ...calculatorContainer.querySelectorAll('.dcg-btn-dropdown-toggle'),
            ...calculatorContainer.querySelectorAll('[aria-label="Add Item"]'),
            ...calculatorContainer.querySelectorAll('.dcg-exppanel-btn'),
            ...calculatorContainer.querySelectorAll('button')
        ];
        
        console.log('Add Item button found via aria-label:', !!addItemButton);
        console.log('Potential add item buttons found:', potentialButtons.length);
        potentialButtons.forEach((btn, index) => {
            console.log(`Button ${index}:`, {
                element: btn,
                classes: btn.className,
                ariaLabel: btn.getAttribute('aria-label'),
                dataAction: btn.getAttribute('data-action'),
                innerText: btn.innerText,
                innerHTML: btn.innerHTML
            });
        });
        
        // Look for all dom elements with class containing 'dcg-'
        const dcgElements = calculatorContainer.querySelectorAll('[class*="dcg-"]');
        console.log(`Found ${dcgElements.length} elements with dcg- classes`);
        
        // Extract and log all unique dcg- class names for reference
        const uniqueClasses = new Set();
        dcgElements.forEach(el => {
            el.classList.forEach(cls => {
                if (cls.startsWith('dcg-')) {
                    uniqueClasses.add(cls);
                }
            });
        });
        
        console.log('Unique dcg- classes:', Array.from(uniqueClasses).sort());
        
        // Look specifically for any open menus that might contain the image button
        const menus = calculatorContainer.querySelectorAll('.dcg-popover, .dcg-menu, .dcg-options-menu');
        console.log('Open menus found:', menus.length);
        
        menus.forEach((menu, index) => {
            console.log(`Menu ${index} contents:`, menu);
            
            // Look for image-related items
            const items = menu.querySelectorAll('.dcg-menu-item, [data-action="image"]');
            console.log(`  Menu items found: ${items.length}`);
            
            items.forEach((item, itemIndex) => {
                console.log(`  Item ${itemIndex}:`, {
                    element: item,
                    classes: item.className,
                    dataAction: item.getAttribute('data-action'),
                    ariaLabel: item.getAttribute('aria-label'),
                    text: item.textContent.trim()
                });
            });
        });
        
        // Check different selector variations for the "add item" button
        const selectors = [
            '[aria-label="Add Item"]',
            '.dcg-action-add-expression',
            '.dcg-add-expression-btn',
            '.dcg-exppanel-btn',
            '.dcg-btn-dropdown-toggle',
            '.dcg-plus-circle'
        ];
        
        selectors.forEach(selector => {
            const elements = calculatorContainer.querySelectorAll(selector);
            console.log(`Elements matching "${selector}":`, elements.length);
            if (elements.length > 0) {
                console.log('First element:', elements[0]);
            }
        });
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
