/**
 * Dynamic Banner Management System
 * 
 * Provides dynamic warning/info banners for tabs that can be dismissed
 * and remember their state across sessions.
 */

/**
 * Banner configurations for each tab
 * Each banner has: type, icon, message, and unique ID
 */
const BANNER_CONFIGS = {
    'appx-packages': {
        id: 'appx-security-warning',
        type: 'error',
        icon: 'fas fa-exclamation-triangle',
        message: '<strong>Security Note:</strong> Removing system AppX packages may disable Windows features and cause system instability. Only uninstall packages you understand completely. <strong>Administrator privileges required</strong> for system package operations.'
    },
    'registry-editor': {
        id: 'registry-warning',
        type: 'error',
        icon: 'fas fa-exclamation-triangle',
        message: '<strong>Warning:</strong> Editing the Windows Registry can cause serious system problems if done incorrectly. Always backup your registry before making changes. <strong>Administrator privileges required</strong> for registry modifications.'
    },
    'services': {
        id: 'services-warning',
        type: 'warning',
        icon: 'fas fa-exclamation-triangle',
        message: '<strong>Disclaimer:</strong> Modifying Windows services can affect system stability. Only change services you understand. <strong>System restart may be required</strong> for some changes to take effect.'
    },
    'tweaks': {
        id: 'tweaks-warning',
        type: 'security',
        icon: 'fas fa-shield-alt',
        message: '<strong>Security Note:</strong> Registry tweaks and service modifications can impact system stability and functionality. <strong>System restart required</strong> for changes to take effect. Always create a restore point before applying modifications.'
    },
    'cleanup': {
        id: 'cleanup-warning',
        type: 'warning',
        icon: 'fas fa-exclamation-triangle',
        message: '<strong>Disclaimer:</strong> System cleanup operations permanently delete files and data. Always ensure you have backups of important data. <strong>System restart may be required</strong> after cleanup.'
    },
    'windows-unattend': {
        id: 'unattend-warning',
        type: 'error',
        icon: 'fas fa-robot',
        message: '<strong>Security Note:</strong> Unattend files enable complete Windows installation automation including disk partitioning and system configuration. <strong>Test extensively in virtual environments</strong> before production deployment. Incorrect configurations may result in data loss.'
    },
    'about': {
        id: 'about-info',
        type: 'info',
        icon: 'fas fa-rocket',
        message: '<strong>Beta Release:</strong> WinTool is actively developed with regular feature updates and improvements. Report issues or suggestions to help enhance the application. Check for updates frequently for new capabilities and optimizations.'
    },
    'environment-variables': {
        id: 'env-vars-warning',
        type: 'warning',
        icon: 'fas fa-exclamation-triangle',
        message: '<strong>Warning:</strong> Modifying environment variables can affect system and application behavior. Changes to system variables require <strong>administrator privileges</strong> and may require a restart to take effect.'
    },
    'system-info': {
        id: 'system-info-diagnostic',
        type: 'diagnostic',
        icon: 'fas fa-microchip',
        message: '<strong>Information:</strong> System information is collected via Windows Management Instrumentation (WMI) and hardware sensors. <strong>Administrator privileges</strong> may be required for complete telemetry access and advanced hardware metrics.'
    },
    'packages': {
        id: 'packages-warning',
        type: 'warning',
        icon: 'fas fa-exclamation-triangle',
        message: '<strong>Disclaimer:</strong> Installing or uninstalling packages can modify your system. Always verify package sources and ensure you trust the publisher. <strong>Administrator privileges may be required</strong> for some operations.'
    },
    'networking': {
        id: 'networking-warning',
        type: 'warning',
        icon: 'fas fa-exclamation-triangle',
        message: '<strong>Disclaimer:</strong> Network operations may require <strong>administrator privileges</strong>. Some actions like resetting TCP/IP stack will require a system restart to take full effect.'
    },
    'system-utilities': {
        id: 'system-utilities-info',
        type: 'info',
        icon: 'fas fa-info-circle',
        message: '<strong>Information:</strong> System utilities provide access to Windows administrative tools. Some utilities may require <strong>administrator privileges</strong> to function properly. Use caution when modifying system settings.'
    },
    'plugins': {
        id: 'plugins-security',
        type: 'security',
        icon: 'fas fa-shield-alt',
        message: '<strong>Security Note:</strong> Only install plugins from verified developers and trusted sources. Verified plugins are automatically validated against the official MTechWare repository. Unverified plugins require careful review before installation.'
    }
};

/**
 * Banner Manager Class
 */
class BannerManager {
    constructor() {
        this.dismissedBanners = new Set();
        this.initialized = false;
    }

    /**
     * Initialize the banner manager
     */
    async init() {
        if (this.initialized) return;
        
        try {
            // Load dismissed banners from settings
            const dismissed = await this.getDismissedBanners();
            this.dismissedBanners = new Set(dismissed);
            this.initialized = true;
            console.log('Banner Manager initialized');
        } catch (error) {
            console.error('Failed to initialize Banner Manager:', error);
        }
    }

    /**
     * Check if all warning banners are globally hidden
     */
    async areAllBannersHidden() {
        try {
            if (window.electronAPI) {
                return await window.electronAPI.getSetting('hideWarningBanners', false);
            } else {
                // Fallback to localStorage for web version
                return localStorage.getItem('hideWarningBanners') === 'true';
            }
        } catch (error) {
            console.error('Error checking global banner setting:', error);
            return false;
        }
    }

    /**
     * Load dismissed banners from storage
     */
    async getDismissedBanners() {
        try {
            if (window.electronAPI) {
                return await window.electronAPI.getSetting('dismissedBanners', []);
            } else {
                // Fallback to localStorage for web version
                const dismissed = localStorage.getItem('dismissedBanners');
                return dismissed ? JSON.parse(dismissed) : [];
            }
        } catch (error) {
            console.error('Error loading dismissed banners:', error);
            return [];
        }
    }

    /**
     * Save dismissed banners to storage
     */
    async saveDismissedBanners() {
        try {
            const dismissed = Array.from(this.dismissedBanners);
            if (window.electronAPI) {
                await window.electronAPI.setSetting('dismissedBanners', dismissed);
            } else {
                // Fallback to localStorage for web version
                localStorage.setItem('dismissedBanners', JSON.stringify(dismissed));
            }
        } catch (error) {
            console.error('Error saving dismissed banners:', error);
        }
    }

    /**
     * Check if a banner is dismissed
     */
    isBannerDismissed(bannerId) {
        return this.dismissedBanners.has(bannerId);
    }

    /**
     * Dismiss a banner
     */
    async dismissBanner(bannerId) {
        this.dismissedBanners.add(bannerId);
        await this.saveDismissedBanners();
        
        // Remove banner from DOM
        const banner = document.querySelector(`[data-banner-id="${bannerId}"]`);
        if (banner) {
            banner.remove();
        }
        
        console.log(`Banner dismissed: ${bannerId}`);
    }

    /**
     * Create a banner element
     */
    createBanner(config) {
        const banner = document.createElement('div');
        banner.className = `plugin-warning ${config.type} dismissible-banner`;
        banner.setAttribute('data-banner-id', config.id);
        
        banner.innerHTML = `
            <i class="${config.icon}"></i>
            <span>${config.message}</span>
            <button class="banner-close-btn" onclick="bannerManager.dismissBanner('${config.id}')" title="Dismiss this banner">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        return banner;
    }

    /**
     * Initialize banners for a specific tab
     */
    async initTabBanners(tabId) {
        if (!this.initialized) {
            await this.init();
        }

        // Check if all warning banners are globally hidden
        if (await this.areAllBannersHidden()) {
            return; // Don't show any banners if globally disabled
        }

        const config = BANNER_CONFIGS[tabId];
        if (!config) {
            return; // No banner configured for this tab
        }

        // Check if banner is already dismissed
        if (this.isBannerDismissed(config.id)) {
            return; // Don't show dismissed banners
        }

        // Find the specific tab content container
        const tabContent = document.querySelector(`#tab-${tabId}`);
        if (!tabContent) {
            console.warn(`No tab content found for tab: ${tabId}`);
            return;
        }

        // Check if banner already exists in this tab
        const existingBanner = tabContent.querySelector(`[data-banner-id="${config.id}"]`);
        if (existingBanner) {
            return; // Banner already exists
        }

        // Create and insert the banner
        const banner = this.createBanner(config);
        
        // Insert banner at the beginning of the tab content
        const container = tabContent.querySelector('.folder-tab-container') || tabContent;
        container.insertBefore(banner, container.firstChild);
        
        console.log(`Banner displayed for tab: ${tabId}`);
    }

    /**
     * Hide all existing banners on the page
     */
    hideAllExistingBanners() {
        const existingBanners = document.querySelectorAll('.plugin-warning');
        existingBanners.forEach(banner => {
            banner.style.display = 'none';
        });
        console.log(`Hidden ${existingBanners.length} existing banners`);
    }

    /**
     * Show all existing banners on the page
     */
    showAllExistingBanners() {
        const existingBanners = document.querySelectorAll('.plugin-warning');
        existingBanners.forEach(banner => {
            banner.style.display = '';
        });
        console.log(`Shown ${existingBanners.length} existing banners`);
    }

    /**
     * Apply the global banner setting to all existing banners
     */
    async applyGlobalSetting() {
        const hideAll = await this.areAllBannersHidden();
        if (hideAll) {
            this.hideAllExistingBanners();
        } else {
            this.showAllExistingBanners();
        }
    }

    /**
     * Reset all dismissed banners (for settings/admin purposes)
     */
    async resetAllBanners() {
        this.dismissedBanners.clear();
        await this.saveDismissedBanners();

        // Show confirmation
        if (window.showNotification) {
            window.showNotification('All banners have been reset and will show again', 'success');
        }
    }
}

// Create global instance
const bannerManager = new BannerManager();

// Export for use in other modules
export { bannerManager };

// Make it globally available for onclick handlers
window.bannerManager = bannerManager;

console.log('Banner Manager module loaded');
