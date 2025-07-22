import { showSplashScreen, updateSplashProgress, hideSplashScreen } from './modules/splash.js';
import { initWindowControls } from './modules/window-controls.js';
import { initTabSystem, switchToTab, refreshCurrentTab, refreshSystemInformation, loadTabOrder } from './modules/tabs.js';
import { initModals, closeModal, showSystemInfo } from './modules/modals.js';
import { initSystemTrayListeners, hideToTray, showFromTray, quitApplication } from './modules/system-tray.js';
import { initGlobalKeyboardShortcuts, resetShortcut, resetAllShortcuts, exportShortcuts, importShortcuts } from './modules/keyboard-shortcuts.js';
import { initContextMenu } from './modules/context-menu.js';
import { showNotification } from './modules/notifications.js';
import { initCommandPalette, showCommandPalette, registerDefaultCommands, registerServiceControlCommands, showHelpModal } from './modules/command-palette.js';
import { initPluginInstallButton, initOpenPluginsDirButton, renderPluginCards } from './modules/plugins.js';
import { loadAndApplyStartupSettings, saveSettings, resetSettings, cancelSettings, applyHiddenTabs, restoreLastActiveTab, showSettings, applyAnimationSetting } from './modules/settings.js';
import { openThemeCreator, saveCustomTheme, importTheme, exportTheme, resetCustomTheme } from './modules/theme.js';
import { initFpsCounter, showFpsCounter, hideFpsCounter } from './modules/fps-counter.js';
import { DEFAULT_TAB_ORDER, setTabLoader } from './modules/state.js';
import { initStartupOptimizer, getStartupRecommendations } from './modules/startup-optimizer.js';


async function initialBoot() {
    const startTime = performance.now();
    console.log('🚀 WinTool starting critical boot...');
    showSplashScreen();

    const initStart = performance.now();
    initWindowControls();
    initModals();
    initSystemTrayListeners();
    initContextMenu();
    initFpsCounter();
    console.log(`⚡ Critical initialization completed in ${(performance.now() - initStart).toFixed(2)}ms`);

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

async function deferredBoot() {
    const deferredStart = performance.now();
    console.log('🔄 WinTool starting deferred boot...');

    // Apply startup optimizations first
    const optimizerStart = performance.now();
    await initStartupOptimizer();
    console.log(`🚀 Startup optimizer applied in ${(performance.now() - optimizerStart).toFixed(2)}ms`);

    // Initialize systems that can be loaded in the background.
    const systemsStart = performance.now();
    initTabSystem();
    initGlobalKeyboardShortcuts();
    initPluginInstallButton();
    initOpenPluginsDirButton();
    console.log(`⚙️ Background systems initialized in ${(performance.now() - systemsStart).toFixed(2)}ms`);

    updateSplashProgress('Loading settings...', 20);
    const settingsStart = performance.now();
    await loadAndApplyStartupSettings();
    console.log(`⚙️ Settings loaded in ${(performance.now() - settingsStart).toFixed(2)}ms`);

    await continueNormalStartup(); // This function already handles the rest of the loading process.
    console.log(`🎯 Total deferred boot time: ${(performance.now() - deferredStart).toFixed(2)}ms`);
}

document.addEventListener('DOMContentLoaded', async function() {
    window.startupTimes = {
        domContentLoaded: performance.now(),
        phases: {}
    };

    await initialBoot();
    // Reduced timeout for faster tab loading - UI should render quickly enough
    setTimeout(deferredBoot, 10);
});


async function continueNormalStartup() {
    const startupStart = performance.now();
    try {
        console.log('🏁 Starting normal startup sequence...');
        updateSplashProgress('Initializing tabs...', 40);

        
        if (window.TabLoader) {
            const newTabLoader = new window.TabLoader();
            setTabLoader(newTabLoader);
            window.tabLoader = newTabLoader;

            
            newTabLoader.setProgressCallback((message, percentage) => {
                const adjustedPercentage = 40 + (percentage * 0.6);
                updateSplashProgress(message, adjustedPercentage);
            });

            // Configure sequential loading delay (can be customized via settings)
            // Reduced default from 100ms to 25ms for faster startup - system auto-detection will optimize further
            const sequentialLoadDelay = await window.electronAPI.getSetting('sequentialLoadDelay', 25);
            console.log(`📊 Using sequential load delay: ${sequentialLoadDelay}ms`);
            newTabLoader.setSequentialLoadDelay(sequentialLoadDelay);

            // Configure lazy loading preference (default: enabled)
            const enableLazyLoading = await window.electronAPI.getSetting('enableLazyLoading', true);
            newTabLoader.setLazyLoadingEnabled(enableLazyLoading);

            newTabLoader.setCompleteCallback(async (loadedTabs) => {
                const callbackStart = performance.now();
                console.log('🎯 Tab loading completed, running completion callback...');

                const tabOrderStart = performance.now();
                await loadTabOrder();
                console.log(`📋 Tab order loaded in ${(performance.now() - tabOrderStart).toFixed(2)}ms`);

                const hiddenTabsStart = performance.now();
                await applyHiddenTabs();
                console.log(`👁️ Hidden tabs applied in ${(performance.now() - hiddenTabsStart).toFixed(2)}ms`);

                const pluginCardsStart = performance.now();
                renderPluginCards();
                console.log(`🔌 Plugin cards rendered in ${(performance.now() - pluginCardsStart).toFixed(2)}ms`);

                const restoreTabStart = performance.now();
                await restoreLastActiveTab();
                console.log(`🔄 Last active tab restored in ${(performance.now() - restoreTabStart).toFixed(2)}ms`);


                const commandsStart = performance.now();
                registerDefaultCommands(loadedTabs);
                console.log(`⌨️ Default commands registered in ${(performance.now() - commandsStart).toFixed(2)}ms`);

                // Finish startup phase early to allow more PowerShell processes
                const finishPhaseStart = performance.now();
                console.log('🏁 Finishing startup phase early after tab loading...');
                if (window.electronAPI && window.electronAPI.finishStartupPhase) {
                    await window.electronAPI.finishStartupPhase();
                }
                console.log(`✅ Startup phase finished in ${(performance.now() - finishPhaseStart).toFixed(2)}ms`);


                const servicesStart = performance.now();
                try {
                    const services = await window.electronAPI.getServices();
                    registerServiceControlCommands(services);
                    // Cache services for offline use
                    localStorage.setItem('cachedServices', JSON.stringify(services));
                    console.log(`🔧 Services loaded in ${(performance.now() - servicesStart).toFixed(2)}ms`);
                } catch (error) {
                    console.error("Failed to fetch services:", error);
                    // Try to use cached services if available
                    const cached = localStorage.getItem('cachedServices');
                    if (cached) {
                        showNotification('Using cached service commands (offline mode)', 'warning');
                        registerServiceControlCommands(JSON.parse(cached));
                    }
                    console.log(`⚠️ Services loading failed in ${(performance.now() - servicesStart).toFixed(2)}ms`);
                }

                const paletteStart = performance.now();
                initCommandPalette();
                console.log(`🎨 Command palette initialized in ${(performance.now() - paletteStart).toFixed(2)}ms`);

                const splashEnd = performance.now();
                hideSplashScreen();
                console.log(`🎯 Total completion callback time: ${(performance.now() - callbackStart).toFixed(2)}ms`);

                // Calculate and display comprehensive startup performance summary
                const totalStartupTime = performance.now() - window.startupTimes.domContentLoaded;
                console.log(`🚀 TOTAL STARTUP TIME: ${totalStartupTime.toFixed(2)}ms`);

                // Store final timing for potential analysis
                window.startupTimes.total = totalStartupTime;
                window.startupTimes.phases.completion = performance.now() - callbackStart;

                // Performance analysis and recommendations
                const recommendations = getStartupRecommendations(totalStartupTime);
                if (recommendations.length > 0) {
                    console.log('💡 Startup Performance Recommendations:');
                    recommendations.forEach(rec => {
                        console.log(`${rec.type === 'critical' ? '🔴' : rec.type === 'warning' ? '🟡' : '🔵'} ${rec.message}`);
                    });
                }

                if (totalStartupTime > 15000) {
                    console.warn(`⚠️ Startup time (${totalStartupTime.toFixed(2)}ms) is slower than expected. Consider enabling performance optimizations.`);
                } else if (totalStartupTime < 5000) {
                    console.log(`🎉 Excellent startup performance! (${totalStartupTime.toFixed(2)}ms)`);
                } else {
                    console.log(`✅ Good startup performance (${totalStartupTime.toFixed(2)}ms)`);
                }
            });

            const tabLoaderStart = performance.now();
            await newTabLoader.init(DEFAULT_TAB_ORDER);
            console.log(`📂 Tab loader initialization completed in ${(performance.now() - tabLoaderStart).toFixed(2)}ms`);
        } else {
            
            await restoreLastActiveTab();
            
            
            registerDefaultCommands(new Map()); 
            initCommandPalette();

            updateSplashProgress('Ready!', 100);
            setTimeout(hideSplashScreen, 500);
        }

        console.log('WinTool startup complete');
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
window.showFpsCounter = showFpsCounter;
window.hideFpsCounter = hideFpsCounter;

import('./modules/offline-status.js').then(module => {
    module.initOfflineStatusIndicator();
});

console.log('WinTool app.js loaded');

