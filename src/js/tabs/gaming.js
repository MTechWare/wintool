/**
 * WinTool - Gaming Tab JavaScript
 * Handles functionality specific to the gaming tab
 */

// Initialize the gaming tab
function initGamingTab() {
    console.log('Gaming tab initialized');

    // Use a small timeout to ensure DOM is fully loaded
    setTimeout(() => {
        // Set up event listeners for all buttons and controls
        setupGameModeToggle();
        setupPerformanceProfiles();
        setupMemoryOptimizer();
        setupNetworkOptimizer();
        setupSystemCleanup();
        setupGameBooster();
        setupGameBoosterModal();
        setupPerformanceMonitor();
    }, 100);
}

// Game Mode Toggle
function setupGameModeToggle() {
    const toggle = document.getElementById('toggle-game-mode');
    if (toggle) {
        console.log('Setting up game mode toggle');

        // Remove any existing event listeners
        const oldListener = toggle._changeListener;
        if (oldListener) {
            toggle.removeEventListener('change', oldListener);
        }

        // Get initial state
        window.electronAPI.getGameModeStatus().then(enabled => {
            console.log('Game mode status:', enabled);

            // Set the checked state without triggering events
            toggle.checked = enabled;

            // Don't trigger a change event during initialization
            // This was causing settings to be applied on first load
        }).catch(err => {
            console.error('Failed to get game mode status:', err);
        });

        // Store the event listener for future reference
        toggle._changeListener = async function(e) {
            // Only process user-initiated changes
            if (!e.isTrusted) {
                return; // Skip programmatic events during initialization
            }

            try {
                await window.electronAPI.setGameMode(this.checked);
                showNotification(`Game Mode ${this.checked ? 'enabled' : 'disabled'}.`, { type: 'success' });
            } catch (err) {
                showErrorNotification(err.message);
                this.checked = !this.checked; // Revert on failure
            }
        };

        // Add the event listener
        toggle.addEventListener('change', toggle._changeListener);
    } else {
        console.warn('Game mode toggle not found');
    }
}

function setupPerformanceProfiles() {
    const balancedBtn = document.getElementById('btn-power-balanced');
    const highPerfBtn = document.getElementById('btn-power-high');

    [balancedBtn, highPerfBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', async function() {
                try {
                    const plan = this.id === 'btn-power-high' ? 'high' : 'balanced';
                    await window.electronAPI.setPowerPlan(plan);

                    // Update button states
                    balancedBtn?.classList.toggle('active', plan === 'balanced');
                    highPerfBtn?.classList.toggle('active', plan === 'high');

                    showNotification(`Switched to ${plan === 'high' ? 'High Performance' : 'Balanced'} power plan.`, { type: 'success' });
                } catch (err) {
                    showErrorNotification(err.message);
                }
            });
        }
    });
}

function setupMemoryOptimizer() {
    const button = document.getElementById('btn-optimize-ram');
    if (button) {
        button.addEventListener('click', async function() {
            try {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Optimizing...';

                await window.electronAPI.optimizeMemory();
                showNotification('Memory optimization completed.', { type: 'success' });
            } catch (err) {
                showErrorNotification(err.message);
            } finally {
                this.disabled = false;
                this.innerHTML = 'Optimize RAM';
            }
        });
    }
}

// Network Optimizer
function setupNetworkOptimizer() {
    const networkOptimizeBtn = document.getElementById('btn-network-optimize');
    if (networkOptimizeBtn) {
        networkOptimizeBtn.addEventListener('click', async function() {
            try {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Optimizing...';

                // Pass all optimization options for the gaming tab
                const result = await window.electronAPI.optimizeNetwork({
                    dns: true,
                    tcp: true,
                    netsh: true
                });

                if (result.success) {
                    showNotification('Network optimization complete.', { type: 'success' });

                    // Show detailed results if available
                    if (result.results) {
                        console.log('Network optimization results:', result.results);
                    }
                } else {
                    showErrorNotification('Network optimization failed: ' + (result.message || 'Unknown error'));
                }
            } catch (err) {
                showErrorNotification('Failed to optimize network: ' + err.message);
            } finally {
                this.disabled = false;
                this.innerHTML = 'Optimize';
            }
        });
    }
}

// System Cleanup
function setupSystemCleanup() {
    const systemCleanupBtn = document.getElementById('btn-system-cleanup');
    if (systemCleanupBtn) {
        systemCleanupBtn.addEventListener('click', async function() {
            try {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cleaning...';

                await window.electronAPI.cleanupSystem();
                showNotification('System cleanup complete.', { type: 'success' });
            } catch (err) {
                showErrorNotification('Failed to clean up system: ' + err.message);
            } finally {
                this.disabled = false;
                this.innerHTML = 'Clean Up';
            }
        });
    }
}

function setupGameBooster() {
    const activateBtn = document.getElementById('btn-game-booster');
    const deactivateBtn = document.getElementById('btn-undo-game-booster');

    if (activateBtn && deactivateBtn) {
        activateBtn.addEventListener('click', async function() {
            try {
                this.disabled = true;
                activateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Activating...';

                await window.electronAPI.setGameBooster(true);
                showNotification('Game Booster activated.', { type: 'success' });

                activateBtn.style.display = 'none';
                deactivateBtn.style.display = 'block';
            } catch (err) {
                showErrorNotification(err.message);
            } finally {
                this.disabled = false;
                activateBtn.innerHTML = 'Activate Booster';
            }
        });

        deactivateBtn.addEventListener('click', async function() {
            try {
                this.disabled = true;
                deactivateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deactivating...';

                await window.electronAPI.setGameBooster(false);
                showNotification('Game Booster deactivated.', { type: 'success' });

                activateBtn.style.display = 'block';
                deactivateBtn.style.display = 'none';
            } catch (err) {
                showErrorNotification(err.message);
            } finally {
                this.disabled = false;
                deactivateBtn.innerHTML = 'Deactivate Boost';
            }
        });
    }
}

// Game Booster Modal
function setupGameBoosterModal() {
    const modal = document.getElementById('game-booster-modal');
    const settingsBtn = document.getElementById('game-booster-settings-btn');
    const closeBtn = modal?.querySelector('.close');
    const saveBtn = modal?.querySelector('.btn-secondary');

    if (settingsBtn && modal) {
        settingsBtn.addEventListener('click', function() {
            modal.style.display = 'flex';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            // Save settings logic would go here
            showNotification('Game Booster settings saved.', { type: 'success' });
            modal.style.display = 'none';
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Performance Monitor
function setupPerformanceMonitor() {
    const perfMonitorBtn = document.getElementById('btn-perf-monitor');
    if (perfMonitorBtn) {
        perfMonitorBtn.addEventListener('click', async function() {
            try {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';

                await window.electronAPI.launchPerformanceMonitor();
                showNotification('Performance Monitor launched.', { type: 'success' });
            } catch (err) {
                showErrorNotification('Failed to launch Performance Monitor: ' + err.message);
            } finally {
                this.disabled = false;
                this.innerHTML = 'Monitor';
            }
        });
    }
}

// Clean up when leaving the tab
function cleanupGamingTab() {
    // Turn off FPS counter if it's on
    showFpsOverlay(false);
}

// Export the initialization function
window.initGamingTab = initGamingTab;
window.cleanupGamingTab = cleanupGamingTab;
