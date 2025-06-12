/**
 * Onboarding Controller
 * Manages the onboarding flow for image uploads
 */
const OnboardingController = (function() {
    // Private variables
    let overlay;
    let highlight;
    let arrow;
    let text;
    let buttonsContainer;
    let dismissButton;
    let neverButton;
    let currentStep = 0;
    let positionUpdateInterval;
    let currentTarget = null;
    
    // Steps in the onboarding flow
    const steps = [
        {
            selector: '[aria-label="Add Item"], .dcg-action-add-expression, .dcg-add-expression-btn',
            text: 'Click here to add an image',
            highlightStyle: {
                borderRadius: '50%'
            },
            arrowPosition: {
                top: -30,
                left: 10
            },
            textPosition: {
                top: -60,
                left: 0
            }
        },
        {
            selector: '.dcg-action-newimage, .dcg-icon-new-image, [data-action="image"], .dcg-new-image-btn',
            text: 'Click here to add an image',
            highlightStyle: {
                borderRadius: '4px'
            },
            arrowPosition: {
                top: -30,
                left: 10
            },
            textPosition: {
                top: -60,
                left: 0
            },
            // Give time for the menu to open
            beforeShow: () => new Promise(resolve => setTimeout(resolve, 800))
        }
    ];
    
    /**
     * Start the onboarding flow
     */
    function start() {
        // Check if onboarding has already been shown in this session
        if (StorageManager.getOnboardingSession()) {
            console.log('Onboarding already shown in this session, skipping');
            return;
        }
        
        // Mark onboarding as shown in this session
        StorageManager.saveOnboardingSession(true);
        
        // Reset step
        currentStep = 0;
        
        // Create the overlay if it doesn't exist
        createOverlay();
        
        // Wait briefly to ensure Desmos UI is fully initialized
        setTimeout(() => {
            // Show the first step
            showStep(currentStep);
            
            // Setup event listeners
            setupEventListeners();
            
            // Start position update interval
            startPositionUpdateInterval();
        }, 1000);
    }
    
    /**
     * Create the onboarding overlay
     */
    function createOverlay() {
        // Clone the template
        const template = document.getElementById('onboarding-template');
        overlay = template.content.cloneNode(true).querySelector('#onboarding-overlay');
        
        // Get overlay elements
        highlight = overlay.querySelector('#onboarding-highlight');
        arrow = overlay.querySelector('#onboarding-arrow');
        text = overlay.querySelector('#onboarding-text');
        buttonsContainer = overlay.querySelector('#onboarding-buttons');
        dismissButton = overlay.querySelector('#onboarding-dismiss');
        neverButton = overlay.querySelector('#onboarding-never');
        
        // Initially hide the highlight, arrow, and text
        highlight.style.opacity = '0';
        arrow.style.opacity = '0';
        text.style.opacity = '0';
        buttonsContainer.style.opacity = '0';
        
        // Position off-screen initially to prevent flash
        highlight.style.left = '-9999px';
        arrow.style.left = '-9999px';
        text.style.left = '-9999px';
        
        // Always show "Never show again" button for all users
        neverButton.style.display = 'inline-block';
        
        // Add the overlay to the body
        document.body.appendChild(overlay);
        
        // Add class to body for styling
        document.body.classList.add('active-onboarding');
    }
    
    /**
     * Setup event listeners for the onboarding flow
     */
    function setupEventListeners() {
        // Dismiss button
        dismissButton.addEventListener('click', nextStep);
        
        // Never show again button
        neverButton.addEventListener('click', () => {
            // Save preference
            PreferencesClient.savePreferences({ onboardingDisabled: true });
            
            // Stop onboarding
            stop();
        });
        
        // Listen for clicks on highlighted elements
        document.addEventListener('click', handleClick);
    }
    
    /**
     * Show a step in the onboarding flow
     * @param {number} stepIndex - Index of the step to show
     */
    async function showStep(stepIndex) {
        // Check if we've reached the end
        if (stepIndex >= steps.length) {
            stop();
            return;
        }
        
        // Get the current step
        const step = steps[stepIndex];
        
        // Hide elements during positioning
        if (highlight) highlight.style.opacity = '0';
        if (arrow) arrow.style.opacity = '0';
        if (text) text.style.opacity = '0';
        if (buttonsContainer) {
            buttonsContainer.style.opacity = '0';
            buttonsContainer.style.display = 'none';
        }
        
        // Run any pre-show logic
        if (step.beforeShow) {
            await step.beforeShow();
        }
        
        // Get the calculator container to focus our search
        const calculatorContainer = document.getElementById('calculator-container');
        if (!calculatorContainer) {
            console.warn('Calculator container not found');
            stop();
            return;
        }
        
        // Try special case for first step using aria-label
        let target = null;
        if (stepIndex === 0) {
            target = calculatorContainer.querySelector('[aria-label="Add Item"]');
            if (target) {
                console.log('Found "Add Item" button using aria-label');
            } else {
                // Try alternative selectors for the add item button
                const selectors = [
                    '.dcg-btn-dropdown-toggle',
                    '.dcg-exppanel-btn',
                    '.dcg-action-additem',
                    '.dcg-plus-circle'
                ];
                
                for (const selector of selectors) {
                    const element = calculatorContainer.querySelector(selector);
                    if (element) {
                        target = element;
                        console.log(`Found "Add Item" button using selector: ${selector}`);
                        break;
                    }
                }
            }
        } else if (stepIndex === 1) {
            // For the second step, look for image menu items more extensively
            // First check for any open dropdown/menu
            const dropdown = calculatorContainer.querySelector('.dcg-add-expression-dropdown');
            
            if (dropdown) {
                console.log('Found open dropdown for image button search');
                
                // Look for items with image-related classes or icons in the dropdown
                const imageItems = [
                    ...dropdown.querySelectorAll('.dcg-action-newimage'),
                    ...dropdown.querySelectorAll('.dcg-icon-new-image'),
                    ...dropdown.querySelectorAll('[data-action="image"]')
                ];
                
                // Also look for any menu item containing "image" text
                const allMenuItems = dropdown.querySelectorAll('div');
                for (let i = 0; i < allMenuItems.length; i++) {
                    const item = allMenuItems[i];
                    if (item.textContent.toLowerCase().includes('image')) {
                        imageItems.push(item);
                    }
                }
                
                if (imageItems.length > 0) {
                    target = imageItems[0];
                    console.log('Found image option in dropdown:', target);
                }
            }
            
            // If not found in dropdown, try older selectors as fallback
            if (!target) {
                // For older Desmos versions, try menu items
                const menus = calculatorContainer.querySelectorAll('.dcg-popover, .dcg-menu, .dcg-options-menu');
                
                if (menus.length > 0) {
                    console.log('Found open menu for image button search');
                    
                    // Look in each menu for image-related items
                    for (let i = 0; i < menus.length; i++) {
                        const menu = menus[i];
                        const imageButtons = menu.querySelectorAll('.dcg-menu-item');
                        
                        for (let j = 0; j < imageButtons.length; j++) {
                            const btn = imageButtons[j];
                            if (btn.textContent.toLowerCase().includes('image') || 
                                btn.getAttribute('data-action') === 'image') {
                                target = btn;
                                console.log('Found image button in menu');
                                break;
                            }
                        }
                        
                        if (target) break;
                    }
                }
            }
        }
        
        // If not found via special cases, try the selectors
        if (!target) {
            // Split the selector by commas and try each one
            const selectors = step.selector.split(',').map(s => s.trim());
            
            // Try each selector until we find a match
            for (const selector of selectors) {
                const elements = calculatorContainer.querySelectorAll(selector);
                if (elements.length > 0) {
                    target = elements[0];
                    console.log(`Found target element using selector: ${selector}`);
                    break;
                }
            }
        }
        
        // If target not found, log and try again for first step or skip for other steps
        if (!target) {
            console.warn(`Target element not found. Tried selectors: ${step.selector}`);
            logDesmosElements();
            
            // For step 0 (first step), retry after a delay 
            // since Desmos UI might still be initializing
            if (stepIndex === 0) {
                console.log('Retrying first step after delay...');
                setTimeout(() => showStep(stepIndex), 2000);
                return;
            }
            
            // For other steps, just move to the next one
            nextStep();
            return;
        }
        
        // Make sure target is visible in viewport
        await ensureElementVisible(target);
        
        // Set the target element for click forwarding
        setTargetElement(target);
        
        // Position the highlight around the target
        positionHighlight(target, step.highlightStyle);
        
        // Position the arrow
        positionArrow(target, step.arrowPosition);
        
        // Set the text
        text.textContent = step.text;
        
        // Position the text
        positionText(target, step.textPosition);
        
        // Now that everything is positioned, make elements visible with animation
        setTimeout(() => {
            highlight.style.opacity = '1';
            arrow.style.opacity = '1';
            text.style.opacity = '1';
            
            // Show buttons after a delay to allow fade-in animation to complete
            setTimeout(() => {
                buttonsContainer.style.display = 'flex';
                buttonsContainer.style.opacity = '1';
            }, 500);
        }, 50);
    }
    
    /**
     * Position the highlight around a target element
     * @param {HTMLElement} target - Target element
     * @param {Object} style - Additional style properties
     */
    function positionHighlight(target, style = {}) {
        const rect = target.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // Set position and size (accounting for scroll position)
        highlight.style.left = `${rect.left + scrollX}px`;
        highlight.style.top = `${rect.top + scrollY}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;
        
        // Apply additional styles
        Object.assign(highlight.style, style);
    }
    
    /**
     * Position the arrow relative to a target element
     * @param {HTMLElement} target - Target element
     * @param {Object} position - Position offsets
     */
    function positionArrow(target, position = {}) {
        const rect = target.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // Set position (accounting for scroll position)
        arrow.style.left = `${rect.left + rect.width / 2 + (position.left || 0) + scrollX}px`;
        arrow.style.top = `${rect.top + (position.top || -30) + scrollY}px`;
    }
    
    /**
     * Position the text relative to a target element
     * @param {HTMLElement} target - Target element
     * @param {Object} position - Position offsets
     */
    function positionText(target, position = {}) {
        const rect = target.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // Set position (accounting for scroll position)
        text.style.left = `${rect.left + (position.left || 0) + scrollX}px`;
        text.style.top = `${rect.top + (position.top || -80) + scrollY}px`;
    }
    
    /**
     * Ensure the element is visible in the viewport
     * @param {HTMLElement} element - Element to make visible
     */
    function ensureElementVisible(element) {
        if (!element) return;
        
        // Check if element is in viewport
        const rect = element.getBoundingClientRect();
        
        // If element is not fully visible, scroll it into view
        if (
            rect.top < 0 ||
            rect.left < 0 ||
            rect.bottom > window.innerHeight ||
            rect.right > window.innerWidth
        ) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
            
            // Wait a bit for the scroll to complete
            return new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    /**
     * Set the current target element for click forwarding
     * @param {HTMLElement} element - Target element
     */
    function setTargetElement(element) {
        currentTarget = element;
        console.log('Set target element for onboarding:', element);
    }
    
    /**
     * Clear the current target element
     */
    function clearTargetElement() {
        currentTarget = null;
    }

    /**
     * Handle click events
     * @param {Event} event - Click event
     */
    function handleClick(event) {
        // If not in onboarding, do nothing
        if (!overlay || !overlay.parentNode) {
            return;
        }
        
        // Get current step
        const step = steps[currentStep];
        if (!step) {
            return;
        }
        
        let matchFound = false;
        
        // Special case for first step: check for Add Item button by aria-label
        if (currentStep === 0) {
            if (event.target.closest('[aria-label="Add Item"]')) {
                console.log('Matched click on Add Item button via aria-label');
                matchFound = true;
            } else if (event.target.closest('.dcg-btn-dropdown-toggle') || 
                       event.target.closest('.dcg-exppanel-btn') ||
                       event.target.closest('.dcg-action-additem') ||
                       event.target.closest('.dcg-plus-circle')) {
                console.log('Matched click on Add Item button via alternative selector');
                matchFound = true;
            }
        } else if (currentStep === 1) {
            // Special case for second step: check for image button
            const clickedElement = event.target;
            const parentElements = [clickedElement, clickedElement.parentElement, clickedElement.parentElement?.parentElement];
            
            // Check if any element in the clicked hierarchy contains image-related classes or text
            const isImageElement = parentElements.some(el => {
                if (!el) return false;
                
                // Check for image in class name
                const hasImageClass = el.className && (
                    el.className.includes('image') || 
                    el.className.includes('dcg-action-newimage') || 
                    el.className.includes('dcg-icon-new-image')
                );
                
                // Check for image in text content
                const hasImageText = el.textContent && el.textContent.toLowerCase().includes('image');
                
                // Check for image in data-action
                const hasImageDataAction = el.getAttribute && el.getAttribute('data-action') === 'image';
                
                return hasImageClass || hasImageText || hasImageDataAction;
            });
            
            if (isImageElement) {
                console.log('Matched click on image option');
                matchFound = true;
                
                // Don't interfere with the image upload process
                // Just mark the step as complete and continue
                nextStep();
                return;
            }
        } else {
            // Split the selector to check each one
            const selectors = step.selector.split(',').map(s => s.trim());
            
            // Check if the click target matches any of our selectors
            for (const selector of selectors) {
                const target = event.target.closest(selector);
                if (target) {
                    console.log(`Matched click using selector: ${selector}`);
                    matchFound = true;
                    break;
                }
            }
        }
        
        if (matchFound) {
            // If we're on the first step (Add Item button), we need to wait for menu to open
            if (currentStep === 0) {
                // Wait for the menu to open
                setTimeout(() => {
                    nextStep();
                }, 800); // Increased from 500ms to 800ms for more reliability
            } else {
                nextStep();
            }
        }
    }
    
    /**
     * Go to the next step
     */
    async function nextStep() {
        currentStep++;
        await showStep(currentStep);
    }
    
    /**
     * Stop the onboarding flow
     */
    function stop() {
        // Make sure the session flag is set
        StorageManager.saveOnboardingSession(true);
        
        // Clear clickable target
        clearTargetElement();
        
        // Remove event listeners
        document.removeEventListener('click', handleClick);
        
        // Remove overlay
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        
        // Remove body class
        document.body.classList.remove('active-onboarding');
        
        // Clear position update interval
        if (positionUpdateInterval) {
            clearInterval(positionUpdateInterval);
        }
    }
    
    /**
     * Start interval to update positions regularly
     * This ensures overlay elements stay aligned with target elements
     * even if there are DOM changes or scrolling
     */
    function startPositionUpdateInterval() {
        // Clear any existing interval
        if (positionUpdateInterval) {
            clearInterval(positionUpdateInterval);
        }
        
        // Set up an interval to update positions
        positionUpdateInterval = setInterval(() => {
            // Only update if we have an active step
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                const calculatorContainer = document.getElementById('calculator-container');
                if (!calculatorContainer) return;
                
                let target = null;
                
                // Special case handling based on step
                if (currentStep === 0) {
                    target = calculatorContainer.querySelector('[aria-label="Add Item"]');
                    if (!target) {
                        // Try alternative selectors
                        const selectors = [
                            '.dcg-btn-dropdown-toggle',
                            '.dcg-exppanel-btn',
                            '.dcg-action-additem',
                            '.dcg-plus-circle'
                        ];
                        
                        for (const selector of selectors) {
                            const element = calculatorContainer.querySelector(selector);
                            if (element) {
                                target = element;
                                break;
                            }
                        }
                    }
                } else if (currentStep === 1) {
                    // For image button in step 2
                    const dropdown = calculatorContainer.querySelector('.dcg-add-expression-dropdown');
                    
                    if (dropdown) {
                        // Look for items with image-related classes or icons in the dropdown
                        const imageItems = [
                            ...dropdown.querySelectorAll('.dcg-action-newimage'),
                            ...dropdown.querySelectorAll('.dcg-icon-new-image'),
                            ...dropdown.querySelectorAll('[data-action="image"]')
                        ];
                        
                        // Also look for any menu item containing "image" text
                        const allMenuItems = dropdown.querySelectorAll('div');
                        for (let i = 0; i < allMenuItems.length; i++) {
                            const item = allMenuItems[i];
                            if (item.textContent.toLowerCase().includes('image')) {
                                imageItems.push(item);
                            }
                        }
                        
                        if (imageItems.length > 0) {
                            target = imageItems[0];
                        }
                    }
                    
                    // If not found in dropdown, try older selectors as fallback
                    if (!target) {
                        const menus = calculatorContainer.querySelectorAll('.dcg-popover, .dcg-menu, .dcg-options-menu');
                        
                        if (menus.length > 0) {
                            for (let i = 0; i < menus.length; i++) {
                                const menu = menus[i];
                                const imageButtons = menu.querySelectorAll('.dcg-menu-item');
                                
                                for (let j = 0; j < imageButtons.length; j++) {
                                    const btn = imageButtons[j];
                                    if (btn.textContent.toLowerCase().includes('image') || 
                                        btn.getAttribute('data-action') === 'image') {
                                        target = btn;
                                        break;
                                    }
                                }
                                
                                if (target) break;
                            }
                        }
                    }
                } else {
                    // For other steps, use the selector directly
                    target = calculatorContainer.querySelector(step.selector);
                }
                
                if (target) {
                    // Update positions
                    positionHighlight(target, step.highlightStyle);
                    positionArrow(target, step.arrowPosition);
                    positionText(target, step.textPosition);
                    
                    // Ensure target remains set (in case DOM has changed)
                    setTargetElement(target);
                }
            }
        }, 500); // Update every 500ms
    }
    
    /**
     * Log all possible Desmos UI elements for debugging
     * Helpful for identifying correct selectors
     */
    function logDesmosElements() {
        console.log('Desmos UI Elements:');
        
        // Get the calculator container to focus our search
        const calculatorContainer = document.getElementById('calculator-container');
        if (!calculatorContainer) {
            console.log('Calculator container not found');
            return;
        }
        
        const allElements = calculatorContainer.querySelectorAll('[class*="dcg-"]');
        const buttonElements = calculatorContainer.querySelectorAll('button');
        
        console.log('All Desmos elements in calculator container:', allElements.length);
        console.log('All buttons in calculator container:', buttonElements.length);
        
        // Look specifically for the Add Item button
        const addItemButton = calculatorContainer.querySelector('[aria-label="Add Item"]');
        console.log('Add Item button found:', !!addItemButton);
        if (addItemButton) {
            console.log('Add Item button details:', {
                element: addItemButton,
                classes: addItemButton.className,
                ariaLabel: addItemButton.getAttribute('aria-label'),
                ariaExpanded: addItemButton.getAttribute('aria-expanded')
            });
        }
        
        // Check for the dropdown specifically (v1.10 style)
        const dropdowns = calculatorContainer.querySelectorAll('.dcg-add-expression-dropdown');
        console.log('Expression dropdowns found:', dropdowns.length);
        
        if (dropdowns.length > 0) {
            console.log('Expression dropdown details:', dropdowns[0]);
            
            // Log all elements in the dropdown
            const dropdownElements = dropdowns[0].querySelectorAll('*');
            console.log('Dropdown child elements:', dropdownElements.length);
            
            // Look for anything with "image" in its classes or text
            let imageRelatedItems = [];
            dropdownElements.forEach((el, index) => {
                const classes = el.className || '';
                const textContent = el.textContent || '';
                const dataAction = el.getAttribute('data-action') || '';
                
                if (classes.includes('image') || 
                    textContent.toLowerCase().includes('image') || 
                    dataAction === 'image') {
                    imageRelatedItems.push({
                        element: el,
                        index: index,
                        classes: classes,
                        textContent: textContent,
                        dataAction: dataAction
                    });
                }
            });
            
            console.log('Image-related elements in dropdown:', imageRelatedItems.length);
            imageRelatedItems.forEach((item, idx) => {
                console.log(`Image item ${idx}:`, item);
            });
        }
        
        // If we're on step 2, look for any open menus that might contain the image button
        if (currentStep === 1) {
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
                
                // Log ALL divs in the menu to find potential image items
                const allDivs = menu.querySelectorAll('div');
                console.log(`  All divs in menu: ${allDivs.length}`);
                
                // Look through all divs for image-related content
                let imageRelatedDivs = [];
                allDivs.forEach((div, divIndex) => {
                    if (div.textContent.toLowerCase().includes('image')) {
                        imageRelatedDivs.push({
                            element: div,
                            index: divIndex,
                            classes: div.className,
                            text: div.textContent.trim()
                        });
                    }
                });
                
                console.log(`  Divs containing 'image' text: ${imageRelatedDivs.length}`);
                imageRelatedDivs.forEach((div, divIndex) => {
                    console.log(`    Image div ${divIndex}:`, div);
                });
            });
        }
        
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
        
        const elementClasses = new Set();
        allElements.forEach(el => {
            Array.from(el.classList)
                .filter(cls => cls.startsWith('dcg-'))
                .forEach(cls => elementClasses.add(cls));
        });
        
        console.log('Desmos classes:', Array.from(elementClasses).sort());
    }
    
    // Public API
    return {
        start,
        stop,
        nextStep,
        cleanup: function() {
            // Stop any active onboarding
            stop();
            
            // Clear timers
            if (inactivityTimer) {
                clearTimeout(inactivityTimer);
                inactivityTimer = null;
            }
            
            // Remove any event listeners
            document.removeEventListener('mousemove', handleUserActivity);
            document.removeEventListener('mousedown', handleUserActivity);
            document.removeEventListener('keydown', handleUserActivity);
            document.removeEventListener('touchstart', handleUserActivity);
            
            // Reset state
            currentStep = 0;
            isOnboardingActive = false;
            onboardingTarget = null;
        }
    };
})();
