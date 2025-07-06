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
import { loadAndApplyStartupSettings, saveSettings, resetSettings, cancelSettings, applyHiddenTabs, restoreLastActiveTab, showSettings } from './modules/settings.js';
import { openThemeCreator, saveCustomTheme, importTheme, exportTheme, resetCustomTheme } from './modules/theme.js';
import { DEFAULT_TAB_ORDER, setTabLoader } from './modules/state.js';


document.addEventListener('DOMContentLoaded', async function() {
    console.log('WinTool starting...');

    
    showSplashScreen();

    
    initWindowControls();
    initTabSystem();
    initModals();
    initSystemTrayListeners();
    initGlobalKeyboardShortcuts();
    initContextMenu();
    initPluginInstallButton();
    initOpenPluginsDirButton();

    
    updateSplashProgress('Loading settings...', 20);

    
    await loadAndApplyStartupSettings();

    
    await continueNormalStartup();
    
    
    fetch('help-modal.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('help-modal-container').innerHTML = data;
        });
});


async function continueNormalStartup() {
    try {
        
        updateSplashProgress('Initializing tabs...', 40);

        
        if (window.TabLoader) {
            const newTabLoader = new window.TabLoader();
            setTabLoader(newTabLoader);
            window.tabLoader = newTabLoader;

            
            tabLoader.setProgressCallback((message, percentage) => {
                const adjustedPercentage = 40 + (percentage * 0.6); 
                updateSplashProgress(message, adjustedPercentage);
            });

            tabLoader.setCompleteCallback(async (loadedTabs) => {
                
                await loadTabOrder();
                
                await applyHiddenTabs();
                
                renderPluginCards();
                
                await restoreLastActiveTab();

                
                registerDefaultCommands(loadedTabs);

                
                try {
                    const services = await window.electronAPI.getServices();
                    registerServiceControlCommands(services);
                } catch (error) {
                    console.error("Failed to fetch and register service commands:", error);
                }

                initCommandPalette();
                hideSplashScreen();
            });

            await tabLoader.init(DEFAULT_TAB_ORDER);
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

console.log('WinTool app.js loaded');

