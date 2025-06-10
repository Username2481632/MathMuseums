/**
 * Authentication Client (Static Version)
 * Since this is now a static site, authentication is simplified to always allow access
 */
const AuthClient = (function() {
    // Private variables - always authenticated for static site
    let isAuthenticated = true;
    
    /**
     * Check if the user is authenticated
     * @returns {Promise<boolean>} Promise resolving to authentication status
     */
    async function checkAuthentication() {
        // Static site - always authenticated
        isAuthenticated = true;
        return true;
    }
    
    /**
     * Get CSRF token from cookies (no longer needed)
     * @returns {string} Empty string since no server-side protection needed
     */
    function getCSRFToken() {
        return '';
    }
    
    /**
     * Log out the current user (no-op for static site)
     * @returns {Promise<void>}
     */
    async function logout() {
        // No logout needed for static site
        console.log('Logout not needed in static site');
    }
    
    /**
     * Initialize authentication
     * @returns {Promise<void>}
     */
    async function init() {
        // No authentication check needed for static site
        isAuthenticated = true;
    }
    
    // Public API
    return {
        init,
        logout,
        getCSRFToken,
        isAuthenticated: () => isAuthenticated,
        checkAuthentication
    };
})();
