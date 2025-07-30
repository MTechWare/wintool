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
    showHelpModal,
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
    applyAnimationSetting,
    togglePerformanceMode,
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

    // Try to fetch help modal content, fallback to cached version if offline
    const helpModalContainer = document.getElementById('help-modal-container');
    if (helpModalContainer) {
        fetch('help-modal.html')
            .then(response => response.text())
            .then(data => {
                helpModalContainer.innerHTML = data;
                // Cache the content in localStorage
                localStorage.setItem('cachedHelpModal', data);
            })
            .catch(() => {
                const cached = localStorage.getItem('cachedHelpModal');
                if (cached) {
                    helpModalContainer.innerHTML = cached;
                    showNotification('Using cached help content (offline mode)', 'warning');
                }
            });
    }
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

window.closeModal = closeModal;
window.showHelpModal = showHelpModal;
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
window.applyAnimationSetting = applyAnimationSetting;
window.togglePerformanceMode = togglePerformanceMode;
window.showFpsCounter = showFpsCounter;
window.hideFpsCounter = hideFpsCounter;
window.generateThemePresets = generateThemePresets;
window.selectThemePreset = selectThemePreset;
window.updateActiveThemePreset = updateActiveThemePreset;

import('./modules/offline-status.js').then(module => {
    module.initOfflineStatusIndicator();
});
