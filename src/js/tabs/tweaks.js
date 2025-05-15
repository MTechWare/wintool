/**
 * WinTool - Tweaks Tab JavaScript
 * Handles functionality specific to the tweaks tab
 */

// Registry value mappings for different tweak types
const TWEAK_VALUES = {
    // Explorer tweaks - HideFileExt and ShowSuperHidden in Explorer
    'file_extensions': { enabled: 0, disabled: 1, invert: true },      // 0 = show extensions
    'show_hidden_files': { enabled: 1, disabled: 2 },    // 1 = show hidden files

    // System tweaks
    'disable_telemetry': { enabled: 0, disabled: 1, invert: true },    // 0 = telemetry disabled
    'disable_animations': { enabled: 0, disabled: 1, invert: true },    // 0 = animations disabled
    'disable_startup_sound': { enabled: 0, disabled: 1, invert: true }, // 0 = sound disabled
    'disable_lock_screen': { enabled: 0, disabled: 1, invert: true },   // 0 = lock screen disabled
    'disable_notifications': { enabled: 0, disabled: 1, invert: true }, // 0 = notifications disabled

    // Appearance tweaks
    'small_taskbar_buttons': { enabled: 1, disabled: 0 },              // 1 = small buttons
    'show_this_pc_on_desktop': { enabled: 1, disabled: 0 },            // 1 = show icon
    'show_recycle_bin_on_desktop': { enabled: 1, disabled: 0 },        // 1 = show icon
    'show_seconds_on_taskbar_clock': { enabled: 1, disabled: 0 },      // 1 = show seconds

    // Privacy tweaks
    'disable_advertising_id': { enabled: 0, disabled: 1, invert: true }, // 0 = ad ID disabled
    'disable_cortana': { enabled: 0, disabled: 1, invert: true }         // 0 = cortana disabled
};

// Base tweak definitions
const BASE_TWEAKS = [
    // Performance & Gaming
    {
        key: 'visualfx',
        label: 'Visual Effects',
        description: 'Optimize for performance or appearance',
        category: 'performance',
        type: 'select',
        options: [
            { value: 2, label: 'Best Performance' },
            { value: 3, label: 'Best Appearance' }
        ]
    },
    {
        key: 'uac_level',
        label: 'UAC Level',
        description: 'User Account Control notification level',
        category: 'security',
        type: 'select',
        options: [
            { value: 0, label: 'Never Notify' },
            { value: 1, label: 'No Dimming' },
            { value: 2, label: 'Default' },
            { value: 3, label: 'Always' }
        ]
    },
    {
        key: 'disable_notifications',
        label: 'Disable Notifications',
        description: 'Turn off Windows notifications',
        category: 'system'
    },
    {
        key: 'show_hidden_files',
        label: 'Show Hidden Files',
        description: 'Show or hide hidden files and folders in File Explorer.',
        category: 'explorer'
    },
    {
        key: 'file_extensions',
        label: 'Show File Extensions',
        description: 'Show or hide file extensions for known file types.',
        category: 'explorer'
    },
    {
        key: 'disable_telemetry',
        label: 'Disable Telemetry',
        description: 'Disables Windows telemetry (diagnostic data collection).',
        category: 'security'
    },
    {
        key: 'disable_advertising_id',
        label: 'Disable Advertising ID',
        description: 'Prevents apps from using your advertising ID for experiences across apps.',
        category: 'security'
    },
    {
        key: 'show_this_pc_on_desktop',
        label: 'Show This PC on Desktop',
        description: 'Displays the This PC icon on the desktop.',
        category: 'appearance'
    },
    {
        key: 'show_recycle_bin_on_desktop',
        label: 'Show Recycle Bin on Desktop',
        description: 'Displays the Recycle Bin icon on the desktop.',
        category: 'appearance'
    },
    {
        key: 'disable_lock_screen',
        label: 'Disable Lock Screen',
        description: 'Removes the lock screen for faster access to your desktop.',
        category: 'system'
    },
    {
        key: 'disable_cortana',
        label: 'Disable Cortana',
        description: 'Disables Cortana, the personal assistant.',
        category: 'system'
    },
    {
        key: 'small_taskbar_buttons',
        label: 'Use Small Taskbar Buttons',
        description: 'Use smaller icons on the taskbar.',
        category: 'appearance'
    },
    {
        key: 'show_seconds_on_taskbar_clock',
        label: 'Show Seconds on Taskbar Clock',
        description: 'Show seconds in the Windows taskbar clock.',
        category: 'appearance'
    },
    {
        key: 'disable_startup_sound',
        label: 'Disable Startup Sound',
        description: 'Disables the Windows startup sound.',
        category: 'system'
    },
    {
        key: 'disable_animations',
        label: 'Disable Animations',
        description: 'Disables Windows animations for better performance.',
        category: 'performance'
    }
];

// Normalize registry values
function normalizeRegistryValues(raw) {
    const norm = {};
    Object.entries(raw).forEach(([k, v]) => {
        let nv = v;
        if (typeof v === 'string') {
            if (v.startsWith('0x')) nv = parseInt(v, 16);
            else if (v === 'true' || v === 'false') nv = (v === 'true');
            else if (!isNaN(Number(v))) nv = Number(v);
        }
        norm[k] = nv;
    });
    return norm;
}

// Fetch tweaks from the system
async function fetchTweaks() {
    document.getElementById('tweaks-loading').style.display = '';
    document.getElementById('tweaks-list').style.display = 'none';

    try {
        const raw = await window.electronAPI.getCurrentTweaks();

        // Check if there was an error
        if (raw.error) {
            throw new Error(raw.error);
        }

        const data = normalizeRegistryValues(raw);

        const tweaksArr = BASE_TWEAKS.map(tweak => ({
            ...tweak,
            value: tweak.type === 'select' ? data[tweak.key] : undefined,
            enabled: tweak.type !== 'select' ? data[tweak.key] === TWEAK_VALUES[tweak.key]?.enabled : undefined
        }));

        renderTweaksList(tweaksArr);
    } catch (error) {
        console.error('Error fetching tweaks:', error);
        showLoadingError(error.message);
    }
}

// Render the tweaks list with categories
function renderTweaksList(tweaks) {
    const list = document.getElementById('tweaks-list');
    if (!list) return;

    list.innerHTML = '';

    const categories = {
        'performance': {
            label: 'Performance & Gaming',
            icon: 'fas fa-tachometer-alt',
            tweaks: []
        },
        'security': {
            label: 'Security & Privacy',
            icon: 'fas fa-shield-alt',
            tweaks: []
        },
        'system': {
            label: 'System Settings',
            icon: 'fas fa-cog',
            tweaks: []
        },
        'appearance': {
            label: 'Appearance',
            icon: 'fas fa-paint-brush',
            tweaks: []
        },
        'explorer': {
            label: 'File Explorer',
            icon: 'fas fa-folder-open',
            tweaks: []
        }
    };

    // Sort tweaks into categories
    tweaks.forEach(tweak => {
        const category = tweak.category || 'system';
        if (categories[category]) {
            categories[category].tweaks.push(tweak);
        }
    });

    // Render categories
    Object.entries(categories).forEach(([key, category]) => {
        if (category.tweaks.length > 0) {
            const catDiv = createCategorySection(category);

            category.tweaks.forEach(tweak => {
                const tweakElement = createTweakElement(tweak);
                catDiv.querySelector('.tweaks-items').appendChild(tweakElement);
            });

            list.appendChild(catDiv);
        }
    });

    list.style.display = '';
    document.getElementById('tweaks-loading').style.display = 'none';
}

function createCategorySection(category) {
    const catDiv = document.createElement('div');
    catDiv.className = 'tweaks-category';

    const header = document.createElement('h3');
    header.innerHTML = `<i class="${category.icon}"></i> ${category.label}`;
    catDiv.appendChild(header);

    const tweaksItems = document.createElement('div');
    tweaksItems.className = 'tweaks-items';
    catDiv.appendChild(tweaksItems);

    return catDiv;
}

function createTweakElement(tweak) {
    const row = document.createElement('div');
    row.className = 'tweak-item';
    row.dataset.key = tweak.key;

    // Add a class to indicate if the tweak is enabled or disabled
    if (tweak.type === 'select') {
        row.classList.add('tweak-configured');
    } else if (tweak.enabled === true) {
        row.classList.add('tweak-enabled');
    } else {
        row.classList.add('tweak-disabled');
    }

    const labelContainer = createLabelContainer(tweak);
    const controlContainer = createControlContainer(tweak);

    row.appendChild(labelContainer);
    row.appendChild(controlContainer);

    return row;
}

function createLabelContainer(tweak) {
    const container = document.createElement('div');
    container.className = 'tweak-item-label';

    const label = document.createElement('div');
    label.className = 'tweak-title';
    label.textContent = tweak.label;

    // Add status indicator
    if (tweak.type === 'select') {
        const selectedOption = tweak.options.find(opt => opt.value === tweak.value);
        if (selectedOption) {
            const statusBadge = document.createElement('span');
            statusBadge.className = 'tweak-status-badge';
            statusBadge.textContent = selectedOption.label;
            label.appendChild(statusBadge);
        }
    } else if (tweak.enabled === true) {
        const statusBadge = document.createElement('span');
        statusBadge.className = 'tweak-status-badge enabled';
        statusBadge.textContent = 'Enabled';
        label.appendChild(statusBadge);
    } else {
        const statusBadge = document.createElement('span');
        statusBadge.className = 'tweak-status-badge disabled';
        statusBadge.textContent = 'Disabled';
        label.appendChild(statusBadge);
    }

    const description = document.createElement('p');
    description.className = 'tweak-item-description';
    description.textContent = tweak.description;

    container.appendChild(label);
    container.appendChild(description);

    return container;
}

function createControlContainer(tweak) {
    const container = document.createElement('div');
    container.className = 'tweak-item-control';

    if (tweak.type === 'select') {
        const select = document.createElement('select');
        select.className = 'tweak-select';
        select.id = `tweak-${tweak.key}`;

        // Store the original value for potential revert
        select.setAttribute('data-previous-value', tweak.value);

        tweak.options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            option.selected = tweak.value === opt.value;
            select.appendChild(option);
        });

        select.addEventListener('change', () => handleTweakChange(tweak.key, parseInt(select.value)));
        container.appendChild(select);
    } else {
        const toggle = createToggleSwitch(tweak);
        container.appendChild(toggle);
    }

    return container;
}

function createToggleSwitch(tweak) {
    const label = document.createElement('label');
    label.className = 'switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `tweak-${tweak.key}`;

    // Set the checkbox state based on the tweak's enabled state
    input.checked = tweak.enabled;

    const slider = document.createElement('span');
    slider.className = 'slider';

    label.appendChild(input);
    label.appendChild(slider);

    input.addEventListener('change', () => {
        const tweakConfig = TWEAK_VALUES[tweak.key];
        const uiEnabled = input.checked;

        // For inverted tweaks, flip the value being sent
        const valueToSend = tweakConfig?.invert ?
            (uiEnabled ? tweakConfig.enabled : tweakConfig.disabled) :
            (uiEnabled ? tweakConfig.enabled : tweakConfig.disabled);

        console.log(`Toggle ${tweak.key}: UI enabled=${uiEnabled}, sending value=${valueToSend}, invert=${tweakConfig?.invert}`);

        // Temporarily disable the control
        input.disabled = true;

        // Add a visual indicator that the tweak is being applied
        const tweakItem = input.closest('.tweak-item');
        if (tweakItem) {
            tweakItem.classList.add('applying');
        }

        console.log(`Sending tweak change for ${tweak.key}: enabled=${uiEnabled}, value=${valueToSend}`);

        // Apply the tweak with a timeout
        setTimeout(() => {
            handleTweakChange(tweak.key, valueToSend)
                .then(() => {
                    // Success handling
                    console.log(`Successfully applied tweak: ${tweak.key}`);
                })
                .catch(error => {
                    // Error handling
                    console.error(`Error applying tweak ${tweak.key}:`, error);
                    // Revert the UI state on error
                    input.checked = !uiEnabled;
                    showNotification(`Failed to apply ${tweak.key}: ${error.message}`, { type: 'error' });
                })
                .finally(() => {
                    // Always re-enable the control
                    input.disabled = false;
                    if (tweakItem) {
                        tweakItem.classList.remove('applying');
                    }
                });
        }, 100);
    });

    return label;
}

async function handleTweakChange(key, value) {
    const tweakItem = document.querySelector(`.tweak-item[data-key="${key}"]`);
    if (!tweakItem) return;

    // Check if this is a visual tweak that might cause screen flicker
    const isVisualTweak = key === 'visualfx' || key === 'disable_animations' || key.includes('visual') || key.includes('animation');

    // Add applying class
    tweakItem.classList.add('applying');

    // For visual tweaks, show a warning overlay
    let warningOverlay = null;
    if (isVisualTweak) {
        // Create a warning overlay
        warningOverlay = document.createElement('div');
        warningOverlay.className = 'visual-tweak-warning';
        warningOverlay.innerHTML = `
            <div class="warning-content">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Applying visual settings...</p>
                <p class="small">Your screen may flicker or go black momentarily.</p>
                <div class="spinner"></div>
            </div>
        `;
        document.body.appendChild(warningOverlay);

        // Fade in the overlay
        setTimeout(() => {
            warningOverlay.classList.add('visible');
        }, 10);
    }

    try {
        const control = tweakItem.querySelector('select, input[type="checkbox"]');
        const originalValue = control.type === 'checkbox' ? control.checked : control.value;

        // Get the correct registry value to send
        let valueToSend = value;
        if (control.type === 'checkbox') {
            const state = control.checked ? 'enabled' : 'disabled';
            valueToSend = TWEAK_VALUES[key][state];
        }

        console.log(`Applying ${key}: UI checked=${control.checked}, sending value=${valueToSend}`);

        // For visual tweaks, add a longer delay before applying
        if (isVisualTweak) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Apply the tweak
        const result = await window.electronAPI.applyTweaks({ [key]: valueToSend });

        if (result.error || (result.errors && result.errors.length > 0)) {
            throw new Error(result.error || result.errors.join('\n') || 'Failed to apply tweak');
        }

        // For visual tweaks, add a longer delay after applying
        if (isVisualTweak) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        showNotification(`Successfully applied ${key.replace(/_/g, ' ')}`, { type: 'success' });

        // Wait a moment for registry changes to take effect
        await new Promise(resolve => setTimeout(resolve, 500));

        // Instead of immediately updating the UI, get the current state from the system
        const currentTweaks = await window.electronAPI.getCurrentTweaks();
        if (currentTweaks.error) {
            throw new Error(currentTweaks.error);
        }

        const data = normalizeRegistryValues(currentTweaks);
        console.log(`Current state after applying ${key}:`, data[key]);

        // Update the UI based on the actual system state
        if (control.type === 'checkbox') {
            const tweakConfig = TWEAK_VALUES[key];
            const registryValue = data[key];

            // For inverted tweaks, flip the comparison
            const newState = tweakConfig?.invert ?
                registryValue === tweakConfig.enabled :
                registryValue === tweakConfig.enabled;

            console.log(`${key}: registry=${registryValue}, enabled value=${tweakConfig.enabled}, invert=${tweakConfig.invert}, newState=${newState}`);

            // Only update the UI if the state has changed
            if (control.checked !== newState) {
                control.checked = newState;
            }

            tweakItem.classList.remove('tweak-enabled', 'tweak-disabled');
            tweakItem.classList.add(newState ? 'tweak-enabled' : 'tweak-disabled');

            // Update the status badge
            const titleElement = tweakItem.querySelector('.tweak-title');
            if (titleElement) {
                const statusBadge = titleElement.querySelector('.tweak-status-badge');
                if (statusBadge) {
                    statusBadge.textContent = newState ? 'Enabled' : 'Disabled';
                    statusBadge.className = `tweak-status-badge ${newState ? 'enabled' : 'disabled'}`;
                }
            }
        } else if (control.tagName === 'SELECT') {
            // For select tweaks
            if (control.value != value) {
                control.value = value;
                control.setAttribute('data-previous-value', value);
            }

            // Update the status badge for select tweaks
            const titleElement = tweakItem.querySelector('.tweak-title');
            if (titleElement) {
                const statusBadge = titleElement.querySelector('.tweak-status-badge');
                if (statusBadge) {
                    const selectedOption = Array.from(control.options).find(opt => opt.value == value);
                    if (selectedOption) {
                        statusBadge.textContent = selectedOption.textContent;
                    }
                }
            }
        }

        // Remove the applying class
        tweakItem.classList.remove('applying');

        // Remove the warning overlay if it exists
        if (warningOverlay) {
            warningOverlay.classList.remove('visible');
            setTimeout(() => {
                warningOverlay.remove();
            }, 500);
        }

        return result;
    } catch (error) {
        console.error('Error applying tweak:', error);
        showNotification(error.message, { type: 'error' });

        // Revert UI state
        const control = tweakItem.querySelector('select, input[type="checkbox"]');
        if (control) {
            if (control.type === 'checkbox') {
                // Revert the checkbox to its original state
                control.checked = !control.checked;
            } else if (control.tagName === 'SELECT') {
                // Revert the select to its previous value
                const previousValue = control.getAttribute('data-previous-value');
                if (previousValue) {
                    control.value = previousValue;
                }
            }
        }

        // Remove the applying class
        tweakItem.classList.remove('applying');

        // Remove the warning overlay if it exists
        if (warningOverlay) {
            warningOverlay.classList.remove('visible');
            setTimeout(() => {
                warningOverlay.remove();
            }, 500);
        }

        throw error; // Re-throw to propagate to the caller
    } finally {
        // Ensure cleanup happens even if there's an error
        if (tweakItem) {
            tweakItem.classList.remove('applying');
        }

        // Remove the warning overlay if it exists
        if (warningOverlay) {
            // Fade out the overlay
            warningOverlay.classList.remove('visible');

            // Remove after animation completes
            setTimeout(() => {
                if (warningOverlay.parentNode) {
                    warningOverlay.parentNode.removeChild(warningOverlay);
                }
            }, 500);
        }
    }
}

// Update the tweaks summary without refreshing the entire UI
async function updateTweakSummary() {
    try {
        const raw = await window.electronAPI.getCurrentTweaks();
        if (raw.error) {
            throw new Error(raw.error);
        }

        const data = normalizeRegistryValues(raw);

        // Update all toggle switches and select boxes to match current state
        Object.entries(data).forEach(([key, value]) => {
            const control = document.getElementById(`tweak-${key}`);
            if (control) {
                if (control.type === 'checkbox') {
                    const tweakConfig = TWEAK_VALUES[key];
                    const shouldBeChecked = tweakConfig?.invert ?
                        value === tweakConfig.enabled :
                        value === tweakConfig.enabled;

                    if (control.checked !== shouldBeChecked) {
                        control.checked = shouldBeChecked;
                    }

                    // Update the tweak item class
                    const tweakItem = document.querySelector(`.tweak-item[data-key="${key}"]`);
                    if (tweakItem) {
                        tweakItem.classList.remove('tweak-enabled', 'tweak-disabled');
                        tweakItem.classList.add(shouldBeChecked ? 'tweak-enabled' : 'tweak-disabled');

                        // Update the status badge
                        const titleElement = tweakItem.querySelector('.tweak-title');
                        if (titleElement) {
                            const statusBadge = titleElement.querySelector('.tweak-status-badge');
                            if (statusBadge) {
                                statusBadge.textContent = shouldBeChecked ? 'Enabled' : 'Disabled';
                                statusBadge.className = `tweak-status-badge ${shouldBeChecked ? 'enabled' : 'disabled'}`;
                            }
                        }
                    }
                } else if (control.tagName === 'SELECT') {
                    // For select tweaks
                    if (control.value != value) {
                        control.value = value;
                        control.setAttribute('data-previous-value', value);
                    }
                }
            }
        });

        const tweaks = BASE_TWEAKS.map(tweak => ({
            ...tweak,
            value: tweak.type === 'select' ? data[tweak.key] : undefined,
            enabled: tweak.type !== 'select' ? data[tweak.key] === TWEAK_VALUES[tweak.key]?.enabled : undefined
        }));

        const summaryContainer = document.getElementById('tweaks-summary');
        if (!summaryContainer) return;

        // Clear existing summary
        summaryContainer.innerHTML = '';

        // Count enabled tweaks
        const enabledTweaks = tweaks.filter(tweak => tweak.enabled).length;

        // Create summary text
        const totalTweaks = tweaks.length;
        const summaryText = document.createElement('p');
        summaryText.textContent = `${enabledTweaks} of ${totalTweaks} tweaks enabled`;
        summaryContainer.appendChild(summaryText);

        // Create progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';

        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        progressFill.style.width = `${(enabledTweaks / totalTweaks) * 100}%`;

        progressBar.appendChild(progressFill);
        summaryContainer.appendChild(progressBar);
    } catch (error) {
        console.error('Error updating tweaks summary:', error);
    }
}

function showLoadingError(message) {
    const loadingElement = document.getElementById('tweaks-loading');
    loadingElement.querySelector('p').innerText = `Error loading tweaks: ${message}`;
}

// Initialize the tweaks tab
function initTweaksTab() {
    console.log('Tweaks tab initialized');
    fetchTweaks();
}

// Export the initialization function
window.initTweaksTab = initTweaksTab;
