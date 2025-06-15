/**
 * Performance Manager (Simplified for Static App)
 * Handles PWA performance optimizations without network dependencies
 */
const PerformanceManager = (function() {
    
    let performanceObserver = null;
    let isLowEndDevice = false;
    
    /**
     * Initialize performance monitoring
     */
    function init() {
        detectDeviceCapabilities();
        setupPerformanceObserver();
        optimizeForDevice();
        setupLazyLoading();
    }
    
    /**
     * Detect device capabilities
     */
    function detectDeviceCapabilities() {
        // Check hardware concurrency (CPU cores)
        const cores = navigator.hardwareConcurrency || 2;
        
        // Check memory (if available)
        const memory = navigator.deviceMemory || 2;
        
        // Check if running on mobile
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Determine if this is a low-end device
        isLowEndDevice = cores <= 2 || memory <= 2 || isMobile;
        
        // Add class to body for CSS optimizations
        if (isLowEndDevice) {
            document.body.classList.add('low-end-device');
        }
    }
    
    /**
     * Setup performance observer
     */
    function setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            try {
                performanceObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        // Track performance metrics silently
                        if (entry.entryType === 'navigation') {
                            // Navigation timing tracked silently
                        } else if (entry.entryType === 'paint') {
                            // Track paint metrics silently
                        } else if (entry.entryType === 'largest-contentful-paint') {
                            // Track LCP silently - no optimization needed since resources are preloaded in HTML
                        }
                    });
                });
                
                // Observe different types of performance entries
                try {
                    performanceObserver.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
                } catch (e) {
                    // Fallback for browsers that don't support all entry types
                    performanceObserver.observe({ entryTypes: ['navigation'] });
                }
            } catch (error) {
                // PerformanceObserver not fully supported
            }
        }
    }
    
    /**
     * Optimize for device capabilities
     */
    function optimizeForDevice() {
        if (isLowEndDevice) {
            // Reduce animations
            const style = document.createElement('style');
            style.textContent = `
                .low-end-device .concept-tile {
                    will-change: auto !important;
                }
            `;
            document.head.appendChild(style);
            
            // Reduce the number of visible tiles for low-end devices
            setTimeout(() => {
                const tiles = document.querySelectorAll('.concept-tile');
                if (tiles.length > 20) {
                    // Implement virtual scrolling or pagination for many tiles
                }
            }, 1000);
        }
    }
    
    /**
     * Setup lazy loading for images and content
     */
    function setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px'
            });
            
            // Observe images with data-src
            const lazyImages = document.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => imageObserver.observe(img));
            
            // Setup observer for dynamically added images
            const contentObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            const lazyImages = node.querySelectorAll ? node.querySelectorAll('img[data-src]') : [];
                            lazyImages.forEach(img => imageObserver.observe(img));
                        }
                    });
                });
            });
            
            contentObserver.observe(document.body, { childList: true, subtree: true });
        }
    }
    
    /**
     * Optimize Desmos calculator rendering
     */
    function optimizeDesmosRendering() {
        if (isLowEndDevice) {
            // Return settings for reduced quality on low-end devices
            return {
                expressions: false, // Hide expression list
                settingsMenu: false,
                zoomButtons: false,
                showGrid: false,
                showXAxis: false,
                showYAxis: false,
                trace: false,
                pointsOfInterest: false,
                animations: false
            };
        }
        
        return {}; // Default settings
    }
    
    /**
     * Debounce function for performance optimization
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Throttle function for performance optimization
     */
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    /**
     * Get performance metrics
     */
    function getPerformanceMetrics() {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        return {
            domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
            loadComplete: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
            isLowEndDevice
        };
    }
    
    /**
     * Cleanup performance monitoring
     */
    function cleanup() {
        if (performanceObserver) {
            performanceObserver.disconnect();
        }
    }
    
    // Public API (simplified - no network methods)
    return {
        init,
        optimizeDesmosRendering,
        debounce,
        throttle,
        getPerformanceMetrics,
        isLowEndDevice: () => isLowEndDevice,
        cleanup
    };
})();

// Expose PerformanceManager globally
if (typeof window !== 'undefined') {
    window.PerformanceManager = PerformanceManager;
}
