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





            // Load performance settings
            await loadPerformanceSettings();

            const elevationPreference = await window.electronAPI.getSetting('elevationChoice', 'ask');
            const elevationSelector = document.getElementById('elevation-preference');
            if (elevationSelector) {
                elevationSelector.value = elevationPreference;
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

            const disableAnimations = await window.electronAPI.getSetting('disableAnimations', true);
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

            const elevationPreference = document.getElementById('elevation-preference')?.value || 'ask';
            await window.electronAPI.setSetting('elevationChoice', elevationPreference);





            const enableDevTools = document.getElementById('enable-dev-tools')?.checked || false;
            await window.electronAPI.setSetting('enableDevTools', enableDevTools);

            const clearPluginCache = document.getElementById('clear-plugin-cache')?.checked || false;
            await window.electronAPI.setSetting('clearPluginCache', clearPluginCache);

            const disableAnimations = document.getElementById('disable-animations-checkbox')?.checked || false;
            await window.electronAPI.setSetting('disableAnimations', disableAnimations);


            const topMost = document.getElementById('top-most-checkbox')?.checked || false;
            await window.electronAPI.setSetting('topMost', topMost);



            // Save performance settings
            await savePerformanceSettings();


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
    const disableAnimations = await window.electronAPI.getSetting('disableAnimations', true);
    if (disableAnimations) {
        document.body.classList.add('no-animations');
    } else {
        document.body.classList.remove('no-animations');
    }

    // Update the performance toggle button appearance
    updatePerformanceToggleButton(disableAnimations);
}

export async function togglePerformanceMode() {
    const currentSetting = await window.electronAPI.getSetting('disableAnimations', true);
    const newSetting = !currentSetting;

    // Save the new setting
    await window.electronAPI.setSetting('disableAnimations', newSetting);

    // Apply the setting immediately
    if (newSetting) {
        document.body.classList.add('no-animations');
    } else {
        document.body.classList.remove('no-animations');
    }

    // Update the checkbox in settings if it exists
    const checkbox = document.getElementById('disable-animations-checkbox');
    if (checkbox) {
        checkbox.checked = newSetting;
    }

    // Update the toggle button appearance
    updatePerformanceToggleButton(newSetting);

    // Show a brief notification
    showPerformanceNotification(newSetting);
}

function updatePerformanceToggleButton(isEnabled) {
    const button = document.getElementById('performance-toggle-btn');
    if (button) {
        const icon = button.querySelector('i');
        const span = button.querySelector('span');

        if (isEnabled) {
            button.style.borderColor = 'var(--primary-color)';
            button.style.background = 'rgba(var(--primary-rgb), 0.1)';
            icon.className = 'fas fa-rocket';
            span.textContent = 'Performance ✓';
            button.title = 'Performance Mode Active - Click to disable';
        } else {
            button.style.borderColor = '';
            button.style.background = '';
            icon.className = 'fas fa-rocket';
            span.textContent = 'Performance';
            button.title = 'Toggle Performance Mode (Disable Animations)';
        }
    }
}

function showPerformanceNotification(isEnabled) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: var(--card-bg);
        border: 1px solid var(--primary-color);
        border-radius: 8px;
        padding: 12px 16px;
        color: var(--text-primary);
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    notification.innerHTML = `
        <i class="fas fa-rocket" style="margin-right: 8px; color: var(--primary-color);"></i>
        Performance Mode ${isEnabled ? 'Enabled' : 'Disabled'}
    `;

    document.body.appendChild(notification);

    // Remove notification after 2 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 2000);
}



// Debug function for performance mode (can be called from console)
window.debugPerformanceMode = function () {
    console.log('=== PERFORMANCE MODE DEBUG ===');
    console.log('Current performance mode variable:', currentPerformanceMode);

    const selectedCards = document.querySelectorAll('.mode-card.selected');
    console.log('Selected mode cards:', selectedCards.length);
    selectedCards.forEach(card => {
        console.log('Selected card mode:', card.dataset.mode);
    });

    console.log('All mode cards:');
    document.querySelectorAll('.mode-card').forEach(card => {
        console.log(`- ${card.dataset.mode}: ${card.classList.contains('selected') ? 'SELECTED' : 'not selected'}`);
    });
    console.log('=== END PERFORMANCE DEBUG ===');
    return currentPerformanceMode;
};

// Helper function to reset performance customization flag (can be called from console)
window.resetPerformanceCustomization = async function () {
    if (window.electronAPI) {
        await window.electronAPI.setSetting('hasCustomizedPerformanceSettings', false);
        console.log('Performance customization flag reset. Restart the app to allow automatic optimizations.');
        return true;
    }
    return false;
};

// Performance Settings Functions
let currentPerformanceMode = 'auto';

async function loadPerformanceSettings() {
    try {
        if (window.electronAPI) {
            // Load performance mode
            const savedMode = await window.electronAPI.getSetting('performanceMode', 'balanced');
            console.log('=== PERFORMANCE MODE LOAD DEBUG ===');
            console.log('Saved performance mode from storage:', savedMode);
            currentPerformanceMode = savedMode;
            console.log('Current performance mode variable set to:', currentPerformanceMode);
            updatePerformanceModeSelection(currentPerformanceMode);

            // Load advanced performance settings
            const fastSystemInfo = await window.electronAPI.getSetting('fastSystemInfo', false);
            const fastSystemInfoCheckbox = document.getElementById('fast-system-info');
            if (fastSystemInfoCheckbox) {
                fastSystemInfoCheckbox.checked = fastSystemInfo;
            }

            const cacheSystemInfo = await window.electronAPI.getSetting('cacheSystemInfo', true);
            const cacheSystemInfoCheckbox = document.getElementById('cache-system-info');
            if (cacheSystemInfoCheckbox) {
                cacheSystemInfoCheckbox.checked = cacheSystemInfo;
            }

            const enableDiscordRpc = await window.electronAPI.getSetting('enableDiscordRpc', true);
            const enableDiscordRpcCheckbox = document.getElementById('enable-discord-rpc');
            if (enableDiscordRpcCheckbox) {
                enableDiscordRpcCheckbox.checked = enableDiscordRpc;
            }

            // Load lazy loading setting (now part of performance settings)
            const enableLazyLoading = await window.electronAPI.getSetting('enableLazyLoading', true);
            const enableLazyLoadingCheckbox = document.getElementById('enable-lazy-loading');
            if (enableLazyLoadingCheckbox) {
                enableLazyLoadingCheckbox.checked = enableLazyLoading;
            }

            // Setup performance mode card click handlers
            setupPerformanceModeHandlers();

            // Show recommendation (placeholder for future implementation)
            // showPerformanceRecommendation();
        }
    } catch (error) {
        console.error('Error loading performance settings:', error);
    }
}

async function savePerformanceSettings() {
    try {
        if (window.electronAPI) {
            // Get current settings from UI
            const fastSystemInfo = document.getElementById('fast-system-info')?.checked || false;
            const cacheSystemInfo = document.getElementById('cache-system-info')?.checked !== false; // Default to true
            const enableDiscordRpc = document.getElementById('enable-discord-rpc')?.checked !== false; // Default to true
            const enableLazyLoading = document.getElementById('enable-lazy-loading')?.checked !== false; // Default to true
            const disableAnimations = document.getElementById('disable-animations-checkbox')?.checked || false;

            // Check if current settings match any predefined performance mode
            const detectedMode = detectPerformanceModeFromSettings(fastSystemInfo, cacheSystemInfo, enableDiscordRpc, enableLazyLoading, disableAnimations);

            console.log('=== PERFORMANCE MODE SAVE DEBUG ===');
            console.log('Current performance mode variable:', currentPerformanceMode);
            console.log('Detected mode from current settings:', detectedMode);

            // If detected mode differs from current mode, ask user what they want to do
            if (detectedMode !== currentPerformanceMode && detectedMode !== 'custom') {
                const shouldOverride = confirm(
                    `Your current settings match "${getPerformanceModeDisplayName(detectedMode)}" mode, but you have "${getPerformanceModeDisplayName(currentPerformanceMode)}" selected.\n\n` +
                    `Would you like to switch to "${getPerformanceModeDisplayName(detectedMode)}" mode to match your settings?\n\n` +
                    `Click "OK" to switch modes, or "Cancel" to keep "${getPerformanceModeDisplayName(currentPerformanceMode)}" mode with custom settings.`
                );

                if (shouldOverride) {
                    currentPerformanceMode = detectedMode;
                    updatePerformanceModeSelection(currentPerformanceMode);
                    console.log('User chose to override performance mode to:', currentPerformanceMode);
                } else {
                    console.log('User chose to keep current performance mode with custom settings');
                }
            } else if (detectedMode === 'custom') {
                console.log('Settings don\'t match any predefined mode - keeping current mode with custom settings');
            }

            // Double-check which card is selected
            const selectedCard = document.querySelector('.mode-card.selected');
            console.log('Selected card element:', selectedCard);
            console.log('Selected card mode:', selectedCard?.dataset?.mode);

            await window.electronAPI.setSetting('performanceMode', currentPerformanceMode);
            console.log('Performance mode saved successfully');

            // Verify the setting was saved by reading it back
            const savedMode = await window.electronAPI.getSetting('performanceMode', 'auto');
            console.log('Verification - performance mode read back from storage:', savedMode);

            // Save advanced performance settings
            await window.electronAPI.setSetting('fastSystemInfo', fastSystemInfo);
            await window.electronAPI.setSetting('cacheSystemInfo', cacheSystemInfo);
            await window.electronAPI.setSetting('enableDiscordRpc', enableDiscordRpc);

            // Save lazy loading setting (now part of performance settings)
            const previousLazyLoading = await window.electronAPI.getSetting('enableLazyLoading', true);
            await window.electronAPI.setSetting('enableLazyLoading', enableLazyLoading);

            // Mark that user has customized performance settings
            await window.electronAPI.setSetting('hasCustomizedPerformanceSettings', true);

            // Notify user if lazy loading setting changed
            if (enableLazyLoading !== previousLazyLoading) {
                const message = enableLazyLoading
                    ? 'Lazy loading enabled. Restart the application for optimal startup performance.'
                    : 'Lazy loading disabled. All tabs will load immediately on startup.';
                showNotification(message, 'info');
            }

            console.log('All performance settings saved successfully');
            console.log('=== END PERFORMANCE DEBUG ===');
        }
    } catch (error) {
        console.error('Error saving performance settings:', error);
    }
}

function updatePerformanceModeSelection(mode) {
    console.log('Updating performance mode selection to:', mode);
    const cards = document.querySelectorAll('.mode-card');
    console.log('Found mode cards for selection update:', cards.length);

    cards.forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.mode === mode) {
            console.log('Selecting card with mode:', card.dataset.mode);
            card.classList.add('selected');
        }
    });

    // Verify selection
    const selectedCard = document.querySelector('.mode-card.selected');
    console.log('After update, selected card mode:', selectedCard?.dataset?.mode);
}

function setupPerformanceModeHandlers() {
    const modeCards = document.querySelectorAll('.mode-card');
    console.log('Setting up performance mode handlers. Found cards:', modeCards.length);

    modeCards.forEach((card, index) => {
        console.log(`Card ${index}: mode="${card.dataset.mode}"`);
        card.addEventListener('click', async () => {
            console.log('Performance mode card clicked:', card.dataset.mode);
            const selectedMode = card.dataset.mode;

            // Add temporary visual feedback
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.transform = '';
            }, 150);

            // Check if user has custom settings that would be overwritten
            const hasCustomSettings = await checkForCustomSettings(selectedMode);

            if (hasCustomSettings) {
                const userConfirmed = confirm(
                    `Switching to ${getPerformanceModeDisplayName(selectedMode)} mode will overwrite your current advanced settings.\n\n` +
                    `Do you want to continue and apply the preset settings for ${getPerformanceModeDisplayName(selectedMode)} mode?`
                );

                if (!userConfirmed) {
                    console.log('User cancelled performance mode change');
                    return; // Don't change the mode if user cancels
                }
            }

            currentPerformanceMode = selectedMode;
            console.log('Current performance mode set to:', currentPerformanceMode);

            updatePerformanceModeSelection(currentPerformanceMode);

            // Update advanced settings based on mode only if user confirmed or no custom settings
            applyPerformanceModeSettings(currentPerformanceMode);

            // Mark that user has customized performance settings
            if (window.electronAPI) {
                await window.electronAPI.setSetting('hasCustomizedPerformanceSettings', true);
            }
        });
    });
}

// Helper function to check if user has custom settings that differ from the selected mode
async function checkForCustomSettings(selectedMode) {
    try {
        // Get current checkbox states with correct defaults matching the app's actual defaults
        const currentFastSystemInfo = document.getElementById('fast-system-info')?.checked ?? false;
        const currentCacheSystemInfo = document.getElementById('cache-system-info')?.checked ?? true;
        const currentEnableDiscordRpc = document.getElementById('enable-discord-rpc')?.checked ?? true;
        const currentEnableLazyLoading = document.getElementById('enable-lazy-loading')?.checked ?? true;
        const currentDisableAnimations = document.getElementById('disable-animations-checkbox')?.checked ?? true;

        // Get expected settings for the selected mode
        const expectedSettings = getExpectedSettingsForMode(selectedMode);

        // Check if current settings match expected settings
        return (
            currentFastSystemInfo !== expectedSettings.fastSystemInfo ||
            currentCacheSystemInfo !== expectedSettings.cacheSystemInfo ||
            currentEnableDiscordRpc !== expectedSettings.enableDiscordRpc ||
            currentEnableLazyLoading !== expectedSettings.enableLazyLoading ||
            currentDisableAnimations !== expectedSettings.disableAnimations
        );
    } catch (error) {
        console.error('Error checking for custom settings:', error);
        return false; // If we can't check, assume no custom settings
    }
}

// Helper function to get expected settings for a performance mode
function getExpectedSettingsForMode(mode) {
    switch (mode) {
        case 'low-end':
            return {
                fastSystemInfo: true,
                cacheSystemInfo: true,
                enableDiscordRpc: false,
                enableLazyLoading: true,
                disableAnimations: true
            };
        case 'balanced':
            return {
                fastSystemInfo: true,
                cacheSystemInfo: true,
                enableDiscordRpc: true,
                enableLazyLoading: true,
                disableAnimations: true
            };
        case 'high-end':
            return {
                fastSystemInfo: false,
                cacheSystemInfo: false,
                enableDiscordRpc: true,
                enableLazyLoading: false,
                disableAnimations: true
            };
        default:
            return {
                fastSystemInfo: false,
                cacheSystemInfo: false,
                enableDiscordRpc: false,
                enableLazyLoading: false,
                disableAnimations: false
            };
    }
}

// Helper function to apply performance mode settings
function applyPerformanceModeSettings(mode) {
    const settings = getExpectedSettingsForMode(mode);

    if (document.getElementById('fast-system-info')) {
        document.getElementById('fast-system-info').checked = settings.fastSystemInfo;
    }
    if (document.getElementById('cache-system-info')) {
        document.getElementById('cache-system-info').checked = settings.cacheSystemInfo;
    }
    if (document.getElementById('enable-discord-rpc')) {
        document.getElementById('enable-discord-rpc').checked = settings.enableDiscordRpc;
    }
    if (document.getElementById('enable-lazy-loading')) {
        document.getElementById('enable-lazy-loading').checked = settings.enableLazyLoading;
    }
    if (document.getElementById('disable-animations-checkbox')) {
        document.getElementById('disable-animations-checkbox').checked = settings.disableAnimations;
    }
}

// Helper function to detect performance mode from current settings
function detectPerformanceModeFromSettings(fastSystemInfo, cacheSystemInfo, enableDiscordRpc, enableLazyLoading, disableAnimations) {
    // Low-end mode characteristics
    if (fastSystemInfo && cacheSystemInfo && !enableDiscordRpc && enableLazyLoading && disableAnimations) {
        return 'low-end';
    }

    // Balanced mode characteristics
    if (fastSystemInfo && cacheSystemInfo && enableDiscordRpc && enableLazyLoading && disableAnimations) {
        return 'balanced';
    }

    // High-end mode characteristics
    if (!fastSystemInfo && !cacheSystemInfo && enableDiscordRpc && !enableLazyLoading && disableAnimations) {
        return 'high-end';
    }

    // If settings don't match any predefined mode, return 'custom'
    return 'custom';
}

// Helper function to get display name for performance modes
function getPerformanceModeDisplayName(mode) {
    switch (mode) {
        case 'low-end':
            return 'Low-End Mode';
        case 'balanced':
            return 'Balanced Mode';
        case 'high-end':
            return 'High-End Mode';
        default:
            return 'Custom Mode';
    }
}


