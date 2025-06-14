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
