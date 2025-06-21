/**
 * Application Configuration
 * Central location for all app constants and settings
 */

// Make API key available in all contexts
self.DESMOS_API_KEY = 'd38ef1c6097a41498a850f6324aff83d';

// Service worker specific constants
if (typeof self !== 'undefined' && self.importScripts) {
    self.SW_CACHE_VERSION = '0.1.2';
}

// Main thread specific constants
if (typeof window !== 'undefined') {
    
    // Cache Configuration
    window.THUMBNAIL_CACHE_PREFIX = 'thumb_';
    window.MAX_THUMBNAIL_CACHE_SIZE = 50;
    window.THUMBNAIL_GENERATION_DELAY = 100;
    
    // File Management
    window.FILE_FORMAT_VERSION = '0.1.0';
    window.DEFAULT_EXPORT_FILENAME = '{name} - Math Museum.mathmuseums';
    
    // UI Defaults
    window.DEFAULT_ASPECT_RATIO_WIDTH = 1;
    window.DEFAULT_ASPECT_RATIO_HEIGHT = 1;
    window.DEFAULT_SCREEN_FIT = 'fit';
    window.DEFAULT_THEME = 'light';
}
