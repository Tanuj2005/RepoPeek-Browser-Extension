const CONFIG = {

    BACKEND_URL: 'http://localhost:8000',
    
    GITHUB_CLIENT_ID: 'Ov23liFRN3cb6YlfUXjT',
    
    DEFAULT_EXPIRY_DAYS: 7,
    MIN_EXPIRY_DAYS: 1,
    MAX_EXPIRY_DAYS: 60,
    
    // Environment - Set to 'production' before building for users
    ENVIRONMENT: 'development',
    
    // Debug - Set to false in production
    DEBUG: true
};

// Auto-disable console logs in production
if (CONFIG.ENVIRONMENT === 'production' && !CONFIG.DEBUG) {
    const noop = () => {};
    console.log = noop;
    console.debug = noop;
    console.info = noop;
    // Keep console.error and console.warn for critical issues
}

// Export config
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
