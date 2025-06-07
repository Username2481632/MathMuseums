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
                    expressions: false,
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
     * Extract direct image URLs from a Desmos state if available
     * @param {string} stateString - Stringified Desmos state
     * @returns {string|null} The image URL or null if not found
     */
    function extractImageUrl(stateString) {
        if (!stateString) {
            console.log('extractImageUrl: No state string provided');
            return null;
        }
        
        try {
            const state = JSON.parse(stateString);
            console.log('extractImageUrl: Parsed state:', state);
            
            if (!state || !state.expressions || !state.expressions.list) {
                console.log('extractImageUrl: No expressions list found');
                return null;
            }
            
            // Look for images in the state
            const imageExpression = state.expressions.list.find(item => item.type === 'image');
            console.log('extractImageUrl: Found image expression:', imageExpression);
            
            if (!imageExpression) {
                console.log('extractImageUrl: No image expression found');
                return null;
            }
            
            // Check for the direct image_url property (Desmos API format)
            if (imageExpression.image_url) {
                console.log('extractImageUrl: Found image_url:', imageExpression.image_url.substring(0, 50) + '...');
                return imageExpression.image_url;
            }
            
            // Check if the image has a nested image object with URL
            if (imageExpression.image && imageExpression.image.url) {
                console.log('extractImageUrl: Found nested image URL:', imageExpression.image.url);
                return imageExpression.image.url;
            }
            
            // Check for data URL in nested image object
            if (imageExpression.image && imageExpression.image.data) {
                const dataUrl = `data:${imageExpression.image.mime};base64,${imageExpression.image.data}`;
                console.log('extractImageUrl: Found nested image data, created data URL length:', dataUrl.length);
                return dataUrl;
            }
            
            console.log('extractImageUrl: No URL or data found in image');
            return null;
        } catch (error) {
            console.error('Error extracting image URL:', error);
            return null;
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
        extractImageUrl,
        cleanup
    };
})();