/**
 * Router Module
 * Handles navigation between views using hash-based routing
 */
const Router = (function() {
    // Private variables
    let routes = {};
    let currentRoute = '';
    let defaultRoute = '';
    let currentController = null; // Track the current controller
    
    /**
     * Initialize the router
     * @param {Object} routeConfig - Configuration object with routes
     * @param {string} defaultPath - Default route path
     */
    function init(routeConfig, defaultPath) {
        routes = routeConfig;
        defaultRoute = defaultPath;
        
        // Listen for hash changes
        window.addEventListener('hashchange', handleRouteChange);
        
        // Initial route handling
        handleRouteChange();
    }
    
    /**
     * Handle route changes
     */
    function handleRouteChange() {
        // Get the current hash without the # symbol
        const hash = window.location.hash.substring(1);
        
        // Parse the route and parameters
        const [path, params] = parseRoute(hash);
        
        // If we have a current controller with a cleanup method, call it
        if (currentController && typeof currentController.cleanup === 'function') {
            currentController.cleanup();
        }
        
        // Store the current route
        currentRoute = path;
        
        // Find the matching route handler
        const route = routes[path] || routes[defaultRoute];
        
        if (route) {
            // Update the current controller reference
            currentController = getControllerForRoute(path);
            
            // Call the route handler with parameters
            route(params);
        } else {
            console.error(`Route not found: ${path}`);
            // Navigate to default route if current route not found
            navigate(defaultRoute);
        }
    }
    
    /**
     * Get the controller for a given route
     * @param {string} route - Route name
     * @returns {Object} The controller object for the route
     */
    function getControllerForRoute(route) {
        switch (route) {
            case 'home':
                return window.HomeController || {};
            case 'detail':
                return window.DetailController || {};
            default:
                return null;
        }
    }
    
    /**
     * Parse a route into path and parameters
     * @param {string} route - Route string (e.g., "detail/linear")
     * @returns {Array} Array with [path, params]
     */
    function parseRoute(route) {
        if (!route) {
            return [defaultRoute, {}];
        }
        
        const parts = route.split('/');
        const path = parts[0];
        const params = {};
        
        // Extract parameters if any
        if (parts.length > 1 && parts[1]) {
            params.id = parts[1];
        }
        
        return [path, params];
    }
    
    /**
     * Navigate to a route
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     */
    function navigate(path, params = {}) {
        let url = `#${path}`;
        
        // Add parameters to the URL if provided
        if (params.id) {
            url += `/${params.id}`;
        }
        
        // Prevent duplicate navigation to the same route
        if (window.location.hash === url) {
            return;
        }
        
        // Update the URL hash
        window.location.hash = url;
    }
    
    /**
     * Get the current route
     * @returns {string} Current route path
     */
    function getCurrentRoute() {
        return currentRoute;
    }
    
    /**
     * Get the current route parameters
     * @returns {Object} Route parameters
     */
    function getCurrentParams() {
        const hash = window.location.hash.substring(1);
        const [_, params] = parseRoute(hash);
        return params;
    }
    
    // Public API
    return {
        init,
        navigate,
        getCurrentRoute,
        getCurrentParams
    };
})();
