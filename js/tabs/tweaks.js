/**
 * WinTool - Tweaks Tab JavaScript
 * Handles functionality specific to the tweaks tab
 */

// Fetch tweaks from the system
async function fetchTweaks() {
    document.getElementById('tweaks-loading').style.display = '';
    document.getElementById('tweaks-list').style.display = 'none';
    document.getElementById('tweaks-loading').querySelector('p').innerText = 'Loading tweaks...';
    
    try {
        const raw = await window.electronAPI.getCurrentTweaks();
        console.log('getCurrentTweaks returned:', raw);
        
        // Normalize registry values
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
        
        let data = norm;
        
        // Transform tweaks object into an array for renderTweaksList
        const tweaksArr = [
            {
                key: 'visualfx',
                label: 'Visual Effects',
                description: 'Adjusts Windows visual effects for performance or appearance.',
                enabled: data.visualfx === 2
            },
            {
                key: 'show_hidden_files',
                label: 'Show Hidden Files',
                description: 'Show or hide hidden files and folders in File Explorer.',
                enabled: data.show_hidden_files == 1
            },
            {
                key: 'file_extensions',
                label: 'Show File Extensions',
                description: 'Show or hide file extensions for known file types.',
                enabled: data.file_extensions == 0
            },
            {
                key: 'disable_telemetry',
                label: 'Disable Telemetry',
                description: 'Disables Windows telemetry (diagnostic data collection).',
                enabled: data.disable_telemetry == 0
            },
            {
                key: 'disable_advertising_id',
                label: 'Disable Advertising ID',
                description: 'Prevents apps from using your advertising ID for experiences across apps.',
                enabled: data.disable_advertising_id == 0
            },
            {
                key: 'show_this_pc_on_desktop',
                label: 'Show This PC on Desktop',
                description: 'Displays the This PC icon on the desktop.',
                enabled: data.show_this_pc_on_desktop == 0
            },
            {
                key: 'show_recycle_bin_on_desktop',
                label: 'Show Recycle Bin on Desktop',
                description: 'Displays the Recycle Bin icon on the desktop.',
                enabled: data.show_recycle_bin_on_desktop == 0
            },
            {
                key: 'disable_lock_screen',
                label: 'Disable Lock Screen',
                description: 'Removes the lock screen for faster access to your desktop.',
                enabled: data.disable_lock_screen == 1
            },
            {
                key: 'disable_cortana',
                label: 'Disable Cortana',
                description: 'Disables Cortana, the personal assistant.',
                enabled: data.disable_cortana == 0
            },
            {
                key: 'small_taskbar_buttons',
                label: 'Use Small Taskbar Buttons',
                description: 'Use smaller icons on the taskbar.',
                enabled: data.small_taskbar_buttons == 1
            },
            {
                key: 'show_seconds_on_taskbar_clock',
                label: 'Show Seconds on Taskbar Clock',
                description: 'Show seconds in the Windows taskbar clock.',
                enabled: data.show_seconds_on_taskbar_clock == 1
            },
            {
                key: 'disable_startup_sound',
                label: 'Disable Startup Sound',
                description: 'Disables the Windows startup sound.',
                enabled: data.disable_startup_sound == 1
            },
            {
                key: 'disable_animations',
                label: 'Disable Animations',
                description: 'Disables Windows animations for better performance.',
                enabled: data.disable_animations == 2
            }
        ];
        
        renderTweaksList(tweaksArr);
    } catch (error) {
        console.error('Error fetching tweaks:', error);
        document.getElementById('tweaks-loading').querySelector('p').innerText = 'Error loading tweaks: ' + error.message;
    }
}

// Render the tweaks list with categories
function renderTweaksList(tweaks) {
    const list = document.getElementById('tweaks-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    // Define categories with icons
    const categories = {
        'performance': {
            label: 'Performance Tweaks',
            icon: 'fas fa-tachometer-alt',
            tweaks: []
        },
        'visual': {
            label: 'Visual Settings',
            icon: 'fas fa-eye',
            tweaks: []
        },
        'privacy': {
            label: 'Privacy & Security',
            icon: 'fas fa-shield-alt',
            tweaks: []
        },
        'explorer': {
            label: 'File Explorer',
            icon: 'fas fa-folder-open',
            tweaks: []
        }
    };
    
    // Categorize tweaks
    tweaks.forEach(tweak => {
        if (tweak.key === 'visualfx' || tweak.key === 'disable_animations' || tweak.key === 'small_taskbar_buttons') {
            categories.performance.tweaks.push(tweak);
        } else if (tweak.key === 'show_hidden_files' || tweak.key === 'file_extensions' || 
                  tweak.key === 'show_this_pc_on_desktop' || tweak.key === 'show_recycle_bin_on_desktop') {
            categories.explorer.tweaks.push(tweak);
        } else if (tweak.key === 'disable_telemetry' || tweak.key === 'disable_advertising_id' || 
                  tweak.key === 'disable_cortana') {
            categories.privacy.tweaks.push(tweak);
        } else {
            categories.visual.tweaks.push(tweak);
        }
    });
    
    // Render each category
    Object.entries(categories).forEach(([key, category]) => {
        if (category.tweaks.length > 0) {
            const catDiv = document.createElement('div');
            catDiv.className = 'tweaks-category';
            
            // Create category header
            const header = document.createElement('h3');
            header.innerHTML = `<i class="${category.icon}"></i> ${category.label}`;
            catDiv.appendChild(header);
            
            // Create tweaks items container
            const tweaksItems = document.createElement('div');
            tweaksItems.className = 'tweaks-items';
            
            // Add tweaks to this category
            category.tweaks.forEach(tweak => {
                const row = document.createElement('div');
                row.className = 'tweak-item';
                row.dataset.key = tweak.key;
                
                // Create label container
                const labelContainer = document.createElement('div');
                labelContainer.className = 'tweak-item-label';
                
                // Create label and description
                const label = document.createElement('div');
                label.className = 'tweak-title';
                label.textContent = tweak.label;
                
                const description = document.createElement('p');
                description.className = 'tweak-item-description';
                description.textContent = tweak.description;
                
                labelContainer.appendChild(label);
                labelContainer.appendChild(description);
                
                // Create toggle switch
                const toggleContainer = document.createElement('div');
                toggleContainer.className = 'tweak-item-toggle';
                
                const label2 = document.createElement('label');
                label2.className = 'switch';
                
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.id = `tweak-${tweak.key}`;
                input.checked = tweak.enabled;
                input.tabIndex = 0;
                
                const slider = document.createElement('span');
                slider.className = 'slider';
                
                label2.appendChild(input);
                label2.appendChild(slider);
                toggleContainer.appendChild(label2);
                
                // Append elements to row
                row.appendChild(labelContainer);
                row.appendChild(toggleContainer);
                
                // Add change event for instant apply
                input.addEventListener('change', async function() {
                    const key = this.id.replace('tweak-','');
                    const checked = this.checked;
                    
                    // Determine the value based on the key and checked state
                    let value;
                    switch (key) {
                        case 'visualfx': value = checked ? 2 : 3; break;
                        case 'disable_animations': value = checked ? 2 : 1; break;
                        case 'show_hidden_files': value = checked ? 1 : 2; break;
                        case 'file_extensions': value = checked ? 0 : 1; break;
                        case 'disable_telemetry': value = checked ? 0 : 1; break;
                        case 'disable_advertising_id': value = checked ? 0 : 1; break;
                        case 'show_this_pc_on_desktop': value = checked ? 0 : 1; break;
                        case 'show_recycle_bin_on_desktop': value = checked ? 0 : 1; break;
                        case 'disable_lock_screen': value = checked ? 1 : 0; break;
                        case 'disable_cortana': value = checked ? 0 : 1; break;
                        case 'small_taskbar_buttons': value = checked ? 1 : 0; break;
                        case 'show_seconds_on_taskbar_clock': value = checked ? 1 : 0; break;
                        case 'disable_startup_sound': value = checked ? 1 : 0; break;
                        default: value = checked ? 1 : 0;
                    }
                    
                    const tweaks = {};
                    tweaks[key] = value;
                    
                    // Show loading state
                    const originalTitle = label.textContent;
                    label.textContent = 'Applying...';
                    row.classList.add('applying');
                    
                    try {
                        // Disable the checkbox while applying
                        input.disabled = true;
                        
                        const result = await window.electronAPI.applyTweaks(tweaks);
                        
                        // Restore original title and enable checkbox
                        label.textContent = originalTitle;
                        row.classList.remove('applying');
                        input.disabled = false;
                        
                        if (result && result.errors && result.errors.length > 0) {
                            console.error('Backend reported errors applying tweak:', result.errors);
                            showNotification('Failed to apply tweak: ' + result.errors.join('\n'), { type: 'error' });
                            
                            // Revert checkbox state without triggering the change event
                            input.checked = !checked;
                        } else {
                            showNotification(`${tweak.label} has been ${checked ? 'enabled' : 'disabled'}.`, { type: 'success' });
                        }
                    } catch (e) {
                        console.error('Error applying tweak:', e);
                        
                        // Restore original title and enable checkbox
                        label.textContent = originalTitle;
                        row.classList.remove('applying');
                        input.disabled = false;
                        
                        // Revert checkbox state without triggering the change event
                        input.checked = !checked;
                        
                        showNotification('Failed to apply tweak: ' + e.message, { type: 'error' });
                    }
                });
                
                tweaksItems.appendChild(row);
            });
            
            catDiv.appendChild(tweaksItems);
            list.appendChild(catDiv);
        }
    });
    
    // Show the list and hide loading indicator
    document.getElementById('tweaks-loading').style.display = 'none';
    list.style.display = '';
}

// Initialize the tweaks tab
function initTweaksTab() {
    console.log('Tweaks tab initialized');
    fetchTweaks();
}

// Export the initialization function
window.initTweaksTab = initTweaksTab;
