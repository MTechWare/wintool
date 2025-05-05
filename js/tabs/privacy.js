function initPrivacyTab() {
    console.log('Privacy tab initialized');
    
    // Initialize privacy lockdown button
    const lockdownBtn = document.getElementById('btn-privacy-lockdown');
    if (lockdownBtn) {
        lockdownBtn.addEventListener('click', async () => {
            try {
                lockdownBtn.disabled = true;
                lockdownBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
                
                const result = await window.electronAPI.applyPrivacyLockdown();
                
                if (result.success) {
                    showNotification('Privacy settings applied successfully', { type: 'success' });
                } else {
                    throw new Error(result.error || 'Failed to apply privacy settings');
                }
            } catch (error) {
                showNotification(error.message, { type: 'error' });
            } finally {
                lockdownBtn.disabled = false;
                lockdownBtn.innerHTML = 'Apply Privacy Settings';
            }
        });
    }
    
    // Initialize telemetry toggle
    const telemetryToggle = document.getElementById('toggle-telemetry');
    if (telemetryToggle) {
        telemetryToggle.addEventListener('change', async function() {
            try {
                const result = await window.electronAPI.setTelemetry(!this.checked);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to update telemetry settings');
                }
                showNotification('Telemetry settings updated', { type: 'success' });
            } catch (error) {
                showNotification(error.message, { type: 'error' });
                this.checked = !this.checked; // Revert toggle
            }
        });
    }
    
    // Initialize privacy toggles
    initializePrivacyToggles();
}

async function initializePrivacyToggles() {
    const toggles = {
        'toggle-location': 'location',
        'toggle-camera': 'camera',
        'toggle-microphone': 'microphone',
        'toggle-activity': 'activity'
    };
    
    try {
        // Get actual system states instead of cached states
        const systemStates = await window.electronAPI.getSystemPrivacySettings();
        
        for (const [toggleId, settingKey] of Object.entries(toggles)) {
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                // Set initial state from actual system settings
                toggle.checked = systemStates[settingKey] || false;
                
                toggle.addEventListener('change', async function() {
                    try {
                        const result = await window.electronAPI.setPrivacySetting(settingKey, this.checked);
                        if (!result.success) {
                            throw new Error(result.error || `Failed to update ${settingKey} settings`);
                        }
                        
                        // Verify the change was applied at system level
                        const newState = (await window.electronAPI.getSystemPrivacySettings())[settingKey];
                        if (newState !== this.checked) {
                            throw new Error(`Failed to apply ${settingKey} setting`);
                        }
                        
                        showNotification(`${settingKey} settings updated`, { type: 'success' });
                    } catch (error) {
                        showNotification(error.message, { type: 'error' });
                        this.checked = !this.checked; // Revert toggle
                    }
                });
            }
        }
    } catch (error) {
        console.error('Failed to initialize privacy toggles:', error);
        showNotification('Failed to load privacy settings', { type: 'error' });
    }
}
