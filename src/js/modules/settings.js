import { showNotification } from './notifications.js';
import { loadTabOrder, switchToTab } from './tabs.js';
import { applyTheme, updatePrimaryColorVariables, applyRainbowEffect, removeRainbowEffect, loadCustomTheme } from './theme.js';
import { showFpsCounter, hideFpsCounter } from './fps-counter.js';
import { THEMES, hiddenTabs, rainbowAnimationId, setHiddenTabs } from './state.js';
import { loadKeyboardShortcutsSettings, saveKeyboardShortcuts } from './keyboard-shortcuts.js';


export async function showSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        
        await loadCurrentSettings();

        
        initSettingsNavigation();

        
        modal.style.display = 'flex';

        console.log('Settings modal opened');
    }
}


async function loadCurrentSettings() {
    try {
        if (window.electronAPI) {
            
            const theme = await window.electronAPI.getSetting('theme', 'classic-dark');
            const themeSelector = document.getElementById('theme-selector');
            if (themeSelector) {
                themeSelector.value = theme;
            }

            
            const primaryColor = await window.electronAPI.getSetting('primaryColor', '#ff9800');
            const colorPicker = document.getElementById('primary-color-picker');
            const colorPreview = document.getElementById('primary-color-preview');
            if (colorPicker && colorPreview) {
                colorPicker.value = primaryColor;
                colorPreview.textContent = primaryColor;
            }

            
            const rainbowMode = await window.electronAPI.getSetting('rainbowMode', false);
            const rainbowModeCheckbox = document.getElementById('rainbow-mode-checkbox');
            if (rainbowModeCheckbox) {
                rainbowModeCheckbox.checked = rainbowMode;
            }

            const rainbowSpeed = await window.electronAPI.getSetting('rainbowSpeed', 5);
            const rainbowSpeedSlider = document.getElementById('rainbow-speed-slider');
            const rainbowSpeedValue = document.getElementById('rainbow-speed-value');
            if (rainbowSpeedSlider && rainbowSpeedValue) {
                rainbowSpeedSlider.value = rainbowSpeed;
                rainbowSpeedValue.textContent = `${rainbowSpeed}s`;
            }
            toggleRainbowSpeedContainer(rainbowMode);

            
            const transparency = await window.electronAPI.getSetting('transparency', 1);
            const transparencySlider = document.getElementById('transparency-slider');
            const transparencyValue = document.getElementById('transparency-value');
            if (transparencySlider && transparencyValue) {
                transparencySlider.value = transparency;
                transparencyValue.textContent = `${Math.round(transparency * 100)}%`;
            }

            

            
            const rememberLastTab = await window.electronAPI.getSetting('rememberLastTab', false);
            const rememberLastTabCheckbox = document.getElementById('remember-last-tab');
            if (rememberLastTabCheckbox) {
                rememberLastTabCheckbox.checked = rememberLastTab;
            }

            const autoRefreshData = await window.electronAPI.getSetting('autoRefreshData', true);
            const autoRefreshCheckbox = document.getElementById('auto-refresh-data');
            if (autoRefreshCheckbox) {
                autoRefreshCheckbox.checked = autoRefreshData;
            }

            const elevationPreference = await window.electronAPI.getSetting('elevationChoice', 'ask');
            const elevationSelector = document.getElementById('elevation-preference');
            if (elevationSelector) {
                elevationSelector.value = elevationPreference;
            }

            const enableDiscordRpc = await window.electronAPI.getSetting('enableDiscordRpc', true);
            const enableDiscordRpcCheckbox = document.getElementById('enable-discord-rpc');
            if (enableDiscordRpcCheckbox) {
                enableDiscordRpcCheckbox.checked = enableDiscordRpc;
            }


            
            const enableDevTools = await window.electronAPI.getSetting('enableDevTools', false);
            const enableDevToolsCheckbox = document.getElementById('enable-dev-tools');
            if (enableDevToolsCheckbox) {
                enableDevToolsCheckbox.checked = enableDevTools;
                enableDevToolsCheckbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        showFpsCounter();
                    } else {
                        hideFpsCounter();
                    }
                });
            }

            const clearPluginCache = await window.electronAPI.getSetting('clearPluginCache', false);
            const clearPluginCacheCheckbox = document.getElementById('clear-plugin-cache');
            if (clearPluginCacheCheckbox) {
                clearPluginCacheCheckbox.checked = clearPluginCache;
            }

            const disableAnimations = await window.electronAPI.getSetting('disableAnimations', false);
            const disableAnimationsCheckbox = document.getElementById('disable-animations-checkbox');
            if (disableAnimationsCheckbox) {
                disableAnimationsCheckbox.checked = disableAnimations;
            }

            
            const topMost = await window.electronAPI.getSetting('topMost', false);
            const topMostCheckbox = document.getElementById('top-most-checkbox');
            if (topMostCheckbox) {
                topMostCheckbox.checked = topMost;
            }

            
            await loadKeyboardShortcutsSettings();
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}


function initSettingsNavigation() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    const panels = document.querySelectorAll('.settings-panel');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-settings-tab');

            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            
            panels.forEach(panel => panel.classList.remove('active'));
            const targetPanel = document.getElementById(`settings-${targetTab}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
        themeSelector.addEventListener('change', async (e) => {
            const selectedTheme = e.target.value;
            await applyTheme(selectedTheme);
            const customThemeCreator = document.getElementById('custom-theme-creator');
            if (customThemeCreator) {
                customThemeCreator.style.display = selectedTheme === 'custom' ? 'block' : 'none';
            }
        });
    }

    
    const colorPicker = document.getElementById('primary-color-picker');
    const colorPreview = document.getElementById('primary-color-preview');
    if (colorPicker && colorPreview) {
        colorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            colorPreview.textContent = color;
            
            updatePrimaryColorVariables(color);
        });
    }

    
    const transparencySlider = document.getElementById('transparency-slider');
    const transparencyValue = document.getElementById('transparency-value');
    if (transparencySlider && transparencyValue) {
        transparencySlider.addEventListener('input', (e) => {
            const value = e.target.value;
            transparencyValue.textContent = `${Math.round(value * 100)}%`;
            if (window.electronAPI && window.electronAPI.setWindowOpacity) {
                window.electronAPI.setWindowOpacity(parseFloat(value));
            }
        });
    }

    
    const rainbowModeCheckbox = document.getElementById('rainbow-mode-checkbox');
    if (rainbowModeCheckbox) {
        rainbowModeCheckbox.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            toggleRainbowSpeedContainer(enabled);
            if (enabled) {
                applyRainbowEffect();
            } else {
                removeRainbowEffect();
                
                const primaryColor = document.getElementById('primary-color-picker').value;
                updatePrimaryColorVariables(primaryColor);
            }
        });
    }

    const rainbowSpeedSlider = document.getElementById('rainbow-speed-slider');
    const rainbowSpeedValue = document.getElementById('rainbow-speed-value');
    if (rainbowSpeedSlider && rainbowSpeedValue) {
        rainbowSpeedSlider.addEventListener('input', (e) => {
            const speed = e.target.value;
            rainbowSpeedValue.textContent = `${speed}s`;
            
            if (rainbowAnimationId) {
                applyRainbowEffect(speed);
            }
        });
    }
}

function toggleRainbowSpeedContainer(enabled) {
    const container = document.getElementById('rainbow-speed-container');
    if (container) {
        container.style.display = enabled ? 'block' : 'none';
    }
}


export async function saveSettings() {
    try {
        if (window.electronAPI) {
            
            const theme = document.getElementById('theme-selector')?.value || 'classic-dark';
            await window.electronAPI.setSetting('theme', theme);

            
            const primaryColor = document.getElementById('primary-color-picker')?.value || '#ff9800';
            await window.electronAPI.setSetting('primaryColor', primaryColor);

            
            const rainbowMode = document.getElementById('rainbow-mode-checkbox')?.checked || false;
            await window.electronAPI.setSetting('rainbowMode', rainbowMode);

            
            let rainbowSpeed = parseInt(document.getElementById('rainbow-speed-slider')?.value, 10);
            if (isNaN(rainbowSpeed) || rainbowSpeed < 1 || rainbowSpeed > 10) {
                rainbowSpeed = 5; 
            }
            await window.electronAPI.setSetting('rainbowSpeed', rainbowSpeed);

            
            const transparency = document.getElementById('transparency-slider')?.value || 1;
            await window.electronAPI.setSetting('transparency', parseFloat(transparency));

            
            const rememberLastTab = document.getElementById('remember-last-tab')?.checked || false;
            await window.electronAPI.setSetting('rememberLastTab', rememberLastTab);

            const autoRefreshData = document.getElementById('auto-refresh-data')?.checked || true;
            await window.electronAPI.setSetting('autoRefreshData', autoRefreshData);

            const elevationPreference = document.getElementById('elevation-preference')?.value || 'ask';
            await window.electronAPI.setSetting('elevationChoice', elevationPreference);

            const enableDiscordRpc = document.getElementById('enable-discord-rpc')?.checked || false;
            await window.electronAPI.setSetting('enableDiscordRpc', enableDiscordRpc);


            
            const enableDevTools = document.getElementById('enable-dev-tools')?.checked || false;
            await window.electronAPI.setSetting('enableDevTools', enableDevTools);

            const clearPluginCache = document.getElementById('clear-plugin-cache')?.checked || false;
            await window.electronAPI.setSetting('clearPluginCache', clearPluginCache);

            const disableAnimations = document.getElementById('disable-animations-checkbox')?.checked || false;
            await window.electronAPI.setSetting('disableAnimations', disableAnimations);

            
            const topMost = document.getElementById('top-most-checkbox')?.checked || false;
            await window.electronAPI.setSetting('topMost', topMost);

            
            await saveKeyboardShortcuts();

            
            applySettings();

            const modal = document.getElementById('settings-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            
            showNotification('Settings saved successfully!', 'success');
        } else {
            showNotification('Error: electronAPI not available', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings: ' + error.message, 'error');
    }
}


export function cancelSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}


export async function resetSettings() {
    if (!confirm('Are you sure you want to reset all application settings? This will restart the application and cannot be undone.')) {
        return;
    }

    try {
        if (window.electronAPI) {
            
            const success = await window.electronAPI.clearAllSettings();

            if (success) {
                showNotification('Settings have been reset. The application will now restart.', 'success');
                
                setTimeout(async () => {
                    await window.electronAPI.restartApplication();
                }, 3000);
            } else {
                showNotification('Failed to reset settings. Please try again.', 'error');
            }
        }
    } catch (error) {
        console.error('Error resetting settings:', error);
        showNotification(`An error occurred: ${error.message}`, 'error');
    }
}


export async function loadAndApplyStartupSettings() {
    try {
        if (window.electronAPI) {
            
            const theme = await window.electronAPI.getSetting('theme', 'classic-dark');
            if (theme === 'custom') {
                await loadCustomTheme();
            }
            await applyTheme(theme);

            const rainbowMode = await window.electronAPI.getSetting('rainbowMode', false);
            if (rainbowMode) {
                const rainbowSpeed = await window.electronAPI.getSetting('rainbowSpeed', 5);
                applyRainbowEffect(rainbowSpeed);
            } else {
                
                const primaryColor = await window.electronAPI.getSetting('primaryColor', '#ff9800');
                updatePrimaryColorVariables(primaryColor);
            }

            const transparency = await window.electronAPI.getSetting('transparency', 1);

            const enableDevTools = await window.electronAPI.getSetting('enableDevTools', false);
            if (enableDevTools) {
                window.electronAPI.openLogViewer();
            }

            

            
            await loadTabOrder();

            
            const loadedHiddenTabs = await window.electronAPI.getSetting('hiddenTabs', []);
            setHiddenTabs(loadedHiddenTabs);
            await applyAnimationSetting();
            console.log('Startup settings loaded and applied');
        }
    } catch (error) {
        console.error('Error loading startup settings:', error);
    }
}


export function applyHiddenTabs() {
   if (!hiddenTabs || hiddenTabs.length === 0) return;

   hiddenTabs.forEach(tabId => {
       const tabItem = document.querySelector(`.tab-item[data-tab="${tabId}"]`);
       if (tabItem) {
           tabItem.classList.add('is-hidden');
       }
   });
   console.log('Hidden tabs applied:', hiddenTabs);
}


export async function restoreLastActiveTab() {
    try {
        if (!window.electronAPI) {
            console.log('No electronAPI available, skipping tab restoration');
            return;
        }

        
        const rememberLastTab = await window.electronAPI.getSetting('rememberLastTab', false);
        if (!rememberLastTab) {
            console.log('Remember last tab setting is disabled');
            return;
        }

        
        const lastActiveTab = await window.electronAPI.getSetting('lastActiveTab', 'welcome');
        if (!lastActiveTab || lastActiveTab === 'welcome') {
            console.log('No last active tab to restore or it\'s already welcome tab');
            return;
        }

        
        const targetTabElement = document.querySelector(`[data-tab="${lastActiveTab}"]`);
        const targetContentElement = document.getElementById(`tab-${lastActiveTab}`);

        if (!targetTabElement || !targetContentElement) {
            console.warn(`Target tab "${lastActiveTab}" not found, falling back to welcome tab`);
            
            await window.electronAPI.setSetting('lastActiveTab', 'welcome');
            return;
        }

        
        console.log(`Restoring last active tab: ${lastActiveTab}`);
        switchToTab(lastActiveTab);

    } catch (error) {
        console.error('Error restoring last active tab:', error);
        
        try {
            switchToTab('welcome');
        } catch (fallbackError) {
            console.error('Error switching to welcome tab as fallback:', fallbackError);
        }
    }
}


function applySettings() {
    applyAnimationSetting();
    const rainbowMode = document.getElementById('rainbow-mode-checkbox')?.checked || false;
    if (rainbowMode) {
        const rainbowSpeed = document.getElementById('rainbow-speed-slider')?.value || 5;
        applyRainbowEffect(rainbowSpeed);
    } else {
        removeRainbowEffect();
        
        const primaryColor = document.getElementById('primary-color-picker')?.value || '#ff9800';
        updatePrimaryColorVariables(primaryColor);
    }

    
    const transparency = document.getElementById('transparency-slider')?.value || 1;
    if (window.electronAPI && window.electronAPI.setWindowOpacity) {
        window.electronAPI.setWindowOpacity(parseFloat(transparency));
    }

    

    
}

export async function applyAnimationSetting() {
    const disableAnimations = await window.electronAPI.getSetting('disableAnimations', false);
    if (disableAnimations) {
        document.body.classList.add('no-animations');
    } else {
        document.body.classList.remove('no-animations');
    }
}
