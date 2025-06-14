/**
 * PWA Manager
 * Handles Progressive Web App functionality including service worker updates
 */
const PWAManager = (function() {
    
    let swRegistration = null;
    let updateAvailable = false;
    
    /**
     * Initialize PWA functionality
     */
    async function init() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                swRegistration = await navigator.serviceWorker.register('/sw.js');
                
                // Check for updates
                swRegistration.addEventListener('updatefound', handleUpdateFound);
                
                // Listen for waiting service worker
                if (swRegistration.waiting) {
                    showUpdateNotification();
                }
                
                // Listen for controlling service worker change
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    window.location.reload();
                });
                
            } catch (error) {
                console.error('PWA: Service Worker registration failed:', error);
            }
        }
        
        // Check if app is already installed
        window.addEventListener('appinstalled', handleAppInstalled);
        
        // Check for display mode changes
        handleDisplayModeChange();
        
        // Show iOS install prompt if applicable
        checkiOSInstallPrompt();
        
        // Initialize iOS Safari URL bar hiding
        initIOSSafariOptimizations();
    }
    
    /**
     * Handle service worker update
     */
    function handleUpdateFound() {
        const newWorker = swRegistration.installing;
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available
                updateAvailable = true;
                showUpdateNotification();
            }
        });
    }
    
    /**
     * Show update notification
     */
    function showUpdateNotification() {
        // Create update notification
        const notification = document.createElement('div');
        notification.className = 'pwa-update-notification';
        notification.innerHTML = `
            <div class="pwa-notification-content">
                <span>A new version is available!</span>
                <button id="pwa-update-btn" class="btn btn-primary">Update</button>
                <button id="pwa-dismiss-btn" class="btn btn-secondary">Later</button>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2196F3;
            color: white;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // Handle update button
        document.getElementById('pwa-update-btn').addEventListener('click', () => {
            applyUpdate();
            notification.remove();
        });
        
        // Handle dismiss button
        document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }
    
    /**
     * Apply service worker update
     */
    function applyUpdate() {
        if (swRegistration && swRegistration.waiting) {
            swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    }
    
    /**
     * Handle app installed
     */
    function handleAppInstalled() {
        // App was installed - using browser's native install flow
        // No custom UI needed
    }
    
    /**
     * Handle display mode changes
     */
    function handleDisplayModeChange() {
        const mediaQuery = window.matchMedia('(display-mode: standalone)');
        
        function updateDisplayMode(e) {
            if (e.matches) {
                document.body.classList.add('pwa-standalone');
            } else {
                document.body.classList.remove('pwa-standalone');
            }
        }
        
        // Initial check
        updateDisplayMode(mediaQuery);
        
        // Listen for changes
        mediaQuery.addListener(updateDisplayMode);
    }
    
    /**
     * Check if app is installed
     */
    function isInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true;
    }
    
    /**
     * Request persistent storage
     */
    async function requestPersistentStorage() {
        if ('storage' in navigator && 'persist' in navigator.storage) {
            try {
                const persistent = await navigator.storage.persist();
                return persistent;
            } catch (error) {
                console.error('PWA: Error requesting persistent storage:', error);
                return false;
            }
        }
        return false;
    }
    
    /**
     * Check and show iOS install prompt
     */
    function checkiOSInstallPrompt() {
        // Check if we're on iOS Safari and not already in standalone mode
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        
        if (isIOS && !isInStandaloneMode) {
            // Check if user has already been prompted
            const hasBeenPrompted = localStorage.getItem('ios-install-prompted');
            
            if (!hasBeenPrompted) {
                // Show prompt after a short delay
                setTimeout(() => {
                    showIOSInstallPrompt();
                }, 3000);
            }
        }
    }
    
    /**
     * Show iOS install prompt
     */
    function showIOSInstallPrompt() {
        const prompt = document.createElement('div');
        prompt.className = 'ios-install-prompt';
        prompt.innerHTML = `
            <div class="ios-install-content">
                <h3>📱 Add to Home Screen</h3>
                <p>Get the full app experience! Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to hide the address bar and use Math Museums like a native app.</p>
                <div class="ios-install-actions">
                    <button id="ios-install-dismiss" class="btn btn-secondary">Maybe Later</button>
                    <button id="ios-install-understand" class="btn btn-primary">Got it!</button>
                </div>
            </div>
        `;
        
        // Add styles
        prompt.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            padding: 20px;
        `;
        
        document.body.appendChild(prompt);
        
        // Handle buttons
        document.getElementById('ios-install-dismiss').addEventListener('click', () => {
            prompt.remove();
        });
        
        document.getElementById('ios-install-understand').addEventListener('click', () => {
            localStorage.setItem('ios-install-prompted', 'true');
            prompt.remove();
        });
        
        // Close on background click
        prompt.addEventListener('click', (e) => {
            if (e.target === prompt) {
                prompt.remove();
            }
        });
    }
    
    /**
     * Initialize iOS Safari optimizations for hiding URL bar
     */
    function initIOSSafariOptimizations() {
        // Only run on iOS Safari
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        
        if (isIOS && isSafari && !isInstalled()) {
            // Force initial scroll to hide address bar
            setTimeout(() => {
                window.scrollTo(0, 1);
            }, 100);
            
            // Listen for orientation changes to re-hide URL bar
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    window.scrollTo(0, 1);
                }, 100);
            });
            
            // Hide URL bar on touch start (user interaction)
            let hasScrolled = false;
            document.addEventListener('touchstart', () => {
                if (!hasScrolled) {
                    window.scrollTo(0, 1);
                    hasScrolled = true;
                }
            }, { once: true });
        }
        
        // Update viewport height when URL bar appears/disappears for ALL mobile browsers
        updateViewportHeight();
        window.addEventListener('resize', updateViewportHeight);
        window.addEventListener('orientationchange', () => {
            setTimeout(updateViewportHeight, 100);
        });
    }
    
    /**
     * Update viewport height based on actual available space
     */
    function updateViewportHeight() {
        // Get the actual available viewport height
        const actualViewportHeight = window.innerHeight;
        const documentHeight = document.documentElement.clientHeight;
        
        // Set CSS custom property for accurate viewport height
        document.documentElement.style.setProperty('--actual-vh', `${actualViewportHeight}px`);
        document.documentElement.style.setProperty('--actual-vh-unit', `${actualViewportHeight * 0.01}px`);
        
        // Dispatch event so other components can respond to viewport changes
        window.dispatchEvent(new CustomEvent('viewportChanged', {
            detail: {
                height: actualViewportHeight,
                width: window.innerWidth
            }
        }));
    }
    
    /**
     * Get storage estimate
     */
    async function getStorageEstimate() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return estimate;
            } catch (error) {
                console.error('PWA: Error getting storage estimate:', error);
                return null;
            }
        }
        return null;
    }
    
    // Public API
    return {
        init,
        isInstalled,
        applyUpdate,
        requestPersistentStorage,
        getStorageEstimate
    };
})();

// Expose PWAManager globally
if (typeof window !== 'undefined') {
    window.PWAManager = PWAManager;
}
