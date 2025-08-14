import { showSplashScreen, updateSplashProgress, hideSplashScreen } from './modules/splash.js';
import { initWindowControls } from './modules/window-controls.js';
import {
    initTabSystem,
    switchToTab,
    refreshCurrentTab,
    refreshSystemInformation,
    loadTabOrder,
} from './modules/tabs.js';
import { initModals, closeModal, showSystemInfo } from './modules/modals.js';
import {
    initSystemTrayListeners,
    hideToTray,
    showFromTray,
    quitApplication,
} from './modules/system-tray.js';
import {
    initGlobalKeyboardShortcuts,
    resetShortcut,
    resetAllShortcuts,
    exportShortcuts,
    importShortcuts,
} from './modules/keyboard-shortcuts.js';
import { initContextMenu } from './modules/context-menu.js';
import { showNotification } from './modules/notifications.js';
import {
    initCommandPalette,
    showCommandPalette,
    registerDefaultCommands,
    registerServiceControlCommands,
} from './modules/command-palette.js';
import {
    initPluginInstallButton,
    initOpenPluginsDirButton,
    renderPluginCards,
} from './modules/plugins.js';
import {
    loadAndApplyStartupSettings,
    saveSettings,
    resetSettings,
    cancelSettings,
    applyHiddenTabs,
    restoreLastActiveTab,
    showSettings,

    generateThemePresets,
    selectThemePreset,
    updateActiveThemePreset,
} from './modules/settings.js';
import {
    openThemeCreator,
    saveCustomTheme,
    importTheme,
    exportTheme,
    resetCustomTheme,
} from './modules/theme.js';
import { initFpsCounter, showFpsCounter, hideFpsCounter } from './modules/fps-counter.js';
import { DEFAULT_TAB_ORDER, setTabLoader } from './modules/state.js';
import { bannerManager } from './modules/banner-manager.js';

import './utils/lazy-loading-helper.js';
import './utils/batch-checker.js';

/**
 * Performs the initial boot sequence for the application.
 * Initializes all core modules, loads settings, and sets up the user interface.
 * Shows splash screen during initialization and tracks performance metrics.
 *
 * @async
 * @returns {Promise<void>} Promise that resolves when initial boot is complete
 * @throws {Error} If critical initialization steps fail
 */
async function initialBoot() {
    const startTime = performance.now();
    showSplashScreen();

    const initStart = performance.now();
    initWindowControls();
    initModals();
    initSystemTrayListeners();
    initContextMenu();
    initFpsCounter();

    // Help modal is now included directly in index.html
}

/**
 * Performs deferred initialization tasks after the main boot sequence.
 * Initializes non-critical modules and features that can be loaded after the UI is ready.
 *
 * @async
 * @returns {Promise<void>} Promise that resolves when deferred boot is complete
 */
async function deferredBoot() {
    initTabSystem();
    initGlobalKeyboardShortcuts();
    initPluginInstallButton();
    initOpenPluginsDirButton();

    updateSplashProgress('Preparing application...', 20);
    await loadAndApplyStartupSettings();
    await continueNormalStartup();
}

document.addEventListener('DOMContentLoaded', async function () {
    window.startupTimes = {
        domContentLoaded: performance.now(),
        phases: {},
    };

    await initialBoot();

    setTimeout(deferredBoot, 10);
});

/**
 * Continues the normal startup sequence after initial checks and optimizations.
 * Handles tab loading, settings application, and final UI setup.
 *
 * @async
 * @returns {Promise<void>} Promise that resolves when normal startup is complete
 * @throws {Error} If startup sequence encounters critical errors
 */
async function continueNormalStartup() {
    try {
        updateSplashProgress('Setting up workspace...', 40);

        if (window.TabLoader) {
            const newTabLoader = new window.TabLoader();
            setTabLoader(newTabLoader);
            window.tabLoader = newTabLoader;

            newTabLoader.setProgressCallback((message, percentage) => {
                const adjustedPercentage = 40 + percentage * 0.6;
                updateSplashProgress(message, adjustedPercentage);
            });

            // Configure sequential loading delay (can be customized via settings)
            // Reduced default from 100ms to 25ms for faster startup - system auto-detection will optimize further
            const sequentialLoadDelay = await window.electronAPI.getSetting(
                'sequentialLoadDelay',
                25
            );
            newTabLoader.setSequentialLoadDelay(sequentialLoadDelay);

            // Configure lazy loading preference (default: enabled)
            const enableLazyLoading = await window.electronAPI.getSetting(
                'enableLazyLoading',
                true
            );
            newTabLoader.setLazyLoadingEnabled(enableLazyLoading);

            newTabLoader.setCompleteCallback(async loadedTabs => {
                await loadTabOrder();
                await applyHiddenTabs();
                renderPluginCards();
                await restoreLastActiveTab();

                registerDefaultCommands(loadedTabs);

                // Finish startup phase (compatibility with SimpleCommandExecutor)
                if (window.electronAPI && window.electronAPI.finishStartupPhase) {
                    await window.electronAPI.finishStartupPhase();
                }

                // Load services for command palette
                try {
                    const services = await window.electronAPI.getServices();
                    registerServiceControlCommands(services);
                    // Cache services for offline use
                    localStorage.setItem('cachedServices', JSON.stringify(services));
                } catch (error) {
                    console.error('Failed to fetch services:', error);
                    // Try to use cached services if available
                    const cached = localStorage.getItem('cachedServices');
                    if (cached) {
                        showNotification('Using cached service commands (offline mode)', 'warning');
                        registerServiceControlCommands(JSON.parse(cached));
                    }
                }

                initCommandPalette();
                hideSplashScreen();
            });

            await newTabLoader.init(DEFAULT_TAB_ORDER);
        } else {
            await restoreLastActiveTab();

            registerDefaultCommands(new Map());
            initCommandPalette();

            updateSplashProgress('Welcome to WinTool', 100);
            setTimeout(hideSplashScreen, 500);
        }
    } catch (error) {
        console.error('Error during normal startup:', error);
        hideSplashScreen();
    }
}

/**
 * Load help modal during app initialization
 */
async function loadHelpModalDuringInit() {
    console.log('Loading help modal during initialization...');
    const helpModalContainer = document.getElementById('help-modal-container');
    if (!helpModalContainer) {
        console.error('Help modal container not found in DOM');
        return;
    }

    try {
        console.log('Fetching help-modal.html during init...');
        const response = await fetch('help-modal.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.text();
        console.log('Help modal HTML fetched during init, length:', data.length);

        helpModalContainer.innerHTML = data;

        // Verify the modal was inserted
        const insertedModal = document.getElementById('help-modal');
        if (!insertedModal) {
            throw new Error('Modal was not properly inserted into DOM during init');
        }

        // Cache the content in localStorage
        localStorage.setItem('cachedHelpModal', data);
        console.log('Help modal loaded and cached successfully during initialization');
    } catch (error) {
        console.warn('Failed to load help modal during initialization:', error);
        const cached = localStorage.getItem('cachedHelpModal');
        if (cached) {
            helpModalContainer.innerHTML = cached;
            console.log('Using cached help modal content during init');

            // Verify the cached modal was inserted
            const insertedModal = document.getElementById('help-modal');
            if (!insertedModal) {
                console.error('Cached modal was not properly inserted into DOM during init');
            } else {
                showNotification('Using cached help content (offline mode)', 'warning');
            }
        } else {
            console.error('No cached help modal content available during init');
        }
    }
}



window.closeModal = closeModal;

window.showCommandPalette = showCommandPalette;
window.showSystemInfo = showSystemInfo;
window.showSettings = showSettings;
window.saveSettings = saveSettings;
window.resetSettings = resetSettings;
window.switchToTab = switchToTab;
window.hideToTray = hideToTray;
window.showFromTray = showFromTray;
window.quitApplication = quitApplication;
window.showSplashScreen = showSplashScreen;
window.updateSplashProgress = updateSplashProgress;

window.hideSplashScreen = hideSplashScreen;
window.refreshCurrentTab = refreshCurrentTab;
window.refreshSystemInformation = refreshSystemInformation;
window.resetShortcut = resetShortcut;
window.resetAllShortcuts = resetAllShortcuts;
window.exportShortcuts = exportShortcuts;
window.importShortcuts = importShortcuts;
window.showNotification = showNotification;
window.cancelSettings = cancelSettings;
window.openThemeCreator = openThemeCreator;
window.saveCustomTheme = saveCustomTheme;
window.importTheme = importTheme;
window.exportTheme = exportTheme;
window.resetCustomTheme = resetCustomTheme;

window.showFpsCounter = showFpsCounter;
window.hideFpsCounter = hideFpsCounter;
window.generateThemePresets = generateThemePresets;
window.selectThemePreset = selectThemePreset;
window.updateActiveThemePreset = updateActiveThemePreset;

import('./modules/offline-status.js').then(module => {
    module.initOfflineStatusIndicator();
});
