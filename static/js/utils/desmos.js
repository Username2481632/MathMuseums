/**
 * Desmos Utilities
 * Provides utilities for working with Desmos calculator states and thumbnails
 */
const DesmosUtils = (function() {
    // Private variables
    let hiddenCalculator = null;
    let hiddenContainer = null;
    
    /**
     * Initialize the hidden calculator for thumbnail generation
     * @returns {Promise} Resolves when the calculator is ready
     */
    async function initHiddenCalculator() {
        return new Promise((resolve, reject) => {
            try {
                // If the calculator is already initialized, resolve immediately
                if (hiddenCalculator) {
                    return resolve(hiddenCalculator);
                }
                
                // Check if Desmos is loaded
                if (typeof Desmos === 'undefined') {
                    return reject(new Error('Desmos API not loaded'));
                }
                
                // Create a hidden container for the calculator
                if (!hiddenContainer) {
                    hiddenContainer = document.createElement('div');
                    hiddenContainer.style.position = 'absolute';
                    hiddenContainer.style.visibility = 'hidden';
                    hiddenContainer.style.width = '300px';
                    hiddenContainer.style.height = '200px';
                    hiddenContainer.style.pointerEvents = 'none';
                    hiddenContainer.id = 'hidden-calculator-container';
                    document.body.appendChild(hiddenContainer);
                }
                
                // Create a hidden calculator instance
                hiddenCalculator = Desmos.GraphingCalculator(hiddenContainer, {
                    expressions: true, // must be true to render equations/images
                    settingsMenu: false,
                    zoomButtons: false,
                    expressionsTopbar: false,
                    border: false,
                    lockViewport: true,
                    autosize: false
                });
                
                // Wait a bit to ensure it's fully initialized
                setTimeout(() => {
                    resolve(hiddenCalculator);
                }, 100);
            } catch (error) {
                console.error('Error initializing hidden calculator:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Generate a thumbnail from a Desmos state
     * @param {string} stateString - Stringified Desmos state
     * @returns {Promise<string>} Resolves with data URL of the thumbnail
     */
    async function generateThumbnail(stateString) {
        if (!stateString) {
            throw new Error('Invalid state string');
        }
        
        try {
            // Initialize hidden calculator
            const calculator = await initHiddenCalculator();
            
            // Parse the state
            const state = JSON.parse(stateString);
            
            // Set the calculator state
            calculator.setState(state);
            
            // Give time for the graph to render - increased for better reliability
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Capture the screenshot
            const dataUrl = calculator.screenshot({
                width: 250,
                height: 200,
                targetPixelRatio: 1.5,
                preserveAxisNumbers: false
            });
            
            // A simple cache mechanism could be added here in the future
            // localStorage.setItem(`thumbnail-${hash(stateString)}`, dataUrl);
            
            return dataUrl;
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            throw error;
        }
    }
    
    /**
     * Clean up resources
     */
    function cleanup() {
        if (hiddenCalculator) {
            try {
                hiddenCalculator.destroy();
                hiddenCalculator = null;
            } catch (error) {
                console.error('Error destroying hidden calculator:', error);
            }
        }
        
        if (hiddenContainer && hiddenContainer.parentNode) {
            hiddenContainer.parentNode.removeChild(hiddenContainer);
            hiddenContainer = null;
        }
    }
    
    // Expose the public API
    return {
        generateThumbnail,
        cleanup
    };
})();