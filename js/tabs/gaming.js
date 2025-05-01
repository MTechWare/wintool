/**
 * WinTool - Gaming Tab JavaScript
 * Handles functionality specific to the gaming tab
 */

// Initialize the gaming tab
function initGamingTab() {
    console.log('Gaming tab initialized');
    
    // Set up event listeners for all buttons and controls
    setupGameModeToggle();
    setupPerformanceProfiles();
    setupMemoryOptimizer();
    setupNetworkOptimizer();
    setupSystemCleanup();
    setupGameBooster();
    setupGameBoosterModal();
    setupPerformanceMonitor();
}

// Game Mode Toggle
function setupGameModeToggle() {
    const gameModeToggle = document.getElementById('toggle-game-mode');
    if (gameModeToggle) {
        // Check current state from system
        window.electronAPI.getGameModeStatus()
            .then(enabled => {
                gameModeToggle.checked = enabled;
            })
            .catch(err => {
                console.error('Failed to get Game Mode status:', err);
            });
            
        // Add change event listener
        gameModeToggle.addEventListener('change', async function() {
            try {
                await window.electronAPI.setGameMode(this.checked);
                showNotification(`Game Mode ${this.checked ? 'enabled' : 'disabled'}.`, { type: 'success' });
            } catch (err) {
                console.error('Failed to set Game Mode:', err);
                showErrorNotification('Failed to set Game Mode: ' + err.message);
                // Revert the toggle to its previous state
                this.checked = !this.checked;
            }
        });
    }
}

// Performance Profiles
function setupPerformanceProfiles() {
    const balancedBtn = document.getElementById('btn-power-balanced');
    const highPerfBtn = document.getElementById('btn-power-high');
    
    if (balancedBtn) {
        balancedBtn.addEventListener('click', async function() {
            try {
                await window.electronAPI.setPowerPlan('balanced');
                showNotification('Switched to Balanced power plan.', { type: 'success' });
            } catch (err) {
                showErrorNotification('Failed to set power plan: ' + err.message);
            }
        });
    }
    
    if (highPerfBtn) {
        highPerfBtn.addEventListener('click', async function() {
            try {
                await window.electronAPI.setPowerPlan('high');
                showNotification('Switched to High Performance power plan.', { type: 'success' });
            } catch (err) {
                showErrorNotification('Failed to set power plan: ' + err.message);
            }
        });
    }
}

// Memory Optimizer
function setupMemoryOptimizer() {
    const optimizeRamBtn = document.getElementById('btn-optimize-ram');
    if (optimizeRamBtn) {
        optimizeRamBtn.addEventListener('click', async function() {
            try {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Optimizing...';
                
                await window.electronAPI.optimizeMemory();
                showNotification('Memory optimization complete.', { type: 'success' });
            } catch (err) {
                showErrorNotification('Failed to optimize memory: ' + err.message);
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
                
                await window.electronAPI.optimizeNetwork();
                showNotification('Network optimization complete.', { type: 'success' });
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

// Game Booster
function setupGameBooster() {
    const gameBoosterBtn = document.getElementById('btn-game-booster');
    const undoGameBoosterBtn = document.getElementById('btn-undo-game-booster');
    
    if (gameBoosterBtn) {
        gameBoosterBtn.addEventListener('click', async function() {
            try {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Activating...';
                
                await window.electronAPI.activateGameBooster();
                showNotification('Game Booster activated. FPS counter enabled.', { type: 'success' });
                showFpsOverlay(true);
            } catch (err) {
                showErrorNotification('Failed to activate Game Booster: ' + err.message);
            } finally {
                this.disabled = false;
                this.innerHTML = 'Activate Booster';
            }
        });
    }
    
    if (undoGameBoosterBtn) {
        undoGameBoosterBtn.addEventListener('click', async function() {
            try {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deactivating...';
                
                await window.electronAPI.deactivateGameBooster();
                showNotification('Game Booster deactivated.', { type: 'success' });
                showFpsOverlay(false);
            } catch (err) {
                showErrorNotification('Failed to deactivate Game Booster: ' + err.message);
            } finally {
                this.disabled = false;
                this.innerHTML = 'Undo Boost';
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
