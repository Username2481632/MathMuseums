/**
 * Authentication Client
 * Handles login status and authentication operations
 */
const AuthClient = (function() {
    // Private variables
    let isAuthenticated = false;
    
    /**
     * Check if the user is authenticated
     * @returns {Promise<boolean>} Promise resolving to authentication status
     */
    async function checkAuthentication() {
        try {
            const response = await fetch('/api/auth/status/', {
                method: 'GET',
                credentials: 'same-origin'
            });
            
            if (response.status === 200) {
                isAuthenticated = true;
                return true;
            } else if (response.status === 401 || response.status === 403) {
                isAuthenticated = false;
                // Redirect to login page if not authenticated
                window.location.href = '/auth/request/';
                return false;
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            return false;
        }
    }
    
    /**
     * Get CSRF token from cookies
     * @returns {string} CSRF token
     */
    function getCSRFToken() {
        return document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1] || '';
    }
    
    /**
     * Log out the current user
     * @returns {Promise<void>}
     */
    async function logout() {
        try {
            await fetch('/auth/logout/', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });
            window.location.href = '/auth/request/';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }
    
    /**
     * Initialize authentication
     * @returns {Promise<void>}
     */
    async function init() {
        await checkAuthentication();
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
