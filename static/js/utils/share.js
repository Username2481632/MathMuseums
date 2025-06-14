/**
 * Share Manager (Simplified for File Sharing Only)
 * Handles sharing exported .mathmuseums files
 */
const ShareManager = (function() {
    
    /**
     * Check if Web Share API is supported
     */
    function isWebShareSupported() {
        return 'share' in navigator;
    }
    
    /**
     * Check if file sharing is supported
     */
    function isFileShareSupported() {
        return isWebShareSupported() && 'canShare' in navigator;
    }
    
    /**
     * Share exported museum file
     */
    async function shareMuseumFile() {
        try {
            // First create the export data
            if (!window.FileManager) {
                throw new Error('FileManager not available');
            }
            
            const exportData = await window.FileManager.createExportData();
            
            // Get filename from preferences
            const filename = window.PreferencesClient.getExportFilename();
            
            // Create blob for the file
            const jsonString = JSON.stringify(exportData, null, 2);
            const fileBlob = new Blob([jsonString], { type: 'application/json' });
            
            // Try Web Share API with file
            if (isFileShareSupported()) {
                const shareData = {
                    title: 'Math Museum Export',
                    text: 'My Math Museum data export',
                    files: [new File([fileBlob], filename, { type: fileBlob.type })]
                };
                
                if (navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                    return true;
                }
            }
            
            // Fallback to download
            const url = URL.createObjectURL(fileBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showShareNotification('File downloaded - you can share it manually');
            return true;
            
        } catch (error) {
            console.error('Share: Error sharing museum file:', error);
            showShareNotification('Unable to share file: ' + error.message, 'error');
            return false;
        }
    }
    
    /**
     * Show notification for share feedback
     */
    function showShareNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 50%;
            left: 50%;
            transform: translate(-50%, 50%);
            background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            animation: slideDown 0.3s ease;
            max-width: 300px;
            text-align: center;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * Initialize share functionality
     */
    function init() {
        const shareButton = document.getElementById('share-button');
        if (!shareButton) return;
        
        // Check if sharing is available
        const canShareFiles = isFileShareSupported();
        
        if (!canShareFiles && !isWebShareSupported()) {
            // Disable button if no sharing capability
            shareButton.disabled = true;
            shareButton.title = 'File sharing not supported in this browser';
        } else {
            shareButton.title = canShareFiles ? 
                'Share museum file' : 
                'Download museum file (sharing not available)';
                
            shareButton.addEventListener('click', shareMuseumFile);
        }
    }
    
    // Public API (simplified)
    return {
        init,
        shareMuseumFile,
        isFileShareSupported
    };
})();

// Expose ShareManager globally
if (typeof window !== 'undefined') {
    window.ShareManager = ShareManager;
}
