/**
 * WinTool - Cleanup Tab
 * Handles system cleanup operations
 */

function initCleanupTab() {
    setupAdvancedCleanup();
}

function setupAdvancedCleanup() {
    const advancedCleanupBtn = document.getElementById('btn-advanced-cleanup');
    if (advancedCleanupBtn) {
        advancedCleanupBtn.addEventListener('click', async () => {
            const options = {
                temp: document.getElementById('cleanup-temp').checked,
                prefetch: document.getElementById('cleanup-prefetch').checked,
                windowsLogs: document.getElementById('cleanup-windows-logs').checked,
                dnsCache: document.getElementById('cleanup-dns-cache').checked,
                updates: document.getElementById('cleanup-updates').checked,
                installers: document.getElementById('cleanup-installers').checked,
                eventLogs: document.getElementById('cleanup-event-logs').checked
            };

            try {
                advancedCleanupBtn.disabled = true;
                advancedCleanupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cleaning...';
                showProgress('Running selected cleanup tasks...');

                await window.electronAPI.runAdvancedCleanup(options);
                showNotification('Advanced cleanup completed successfully', { type: 'success' });
            } catch (error) {
                showErrorNotification('Advanced cleanup failed: ' + error.message);
            } finally {
                hideProgress();
                advancedCleanupBtn.disabled = false;
                advancedCleanupBtn.innerHTML = '<i class="fas fa-play"></i> Run Selected Cleanup';
            }
        });
    }
}

function showProgress(text) {
    const progress = document.querySelector('.progress-container');
    const progressText = progress.querySelector('.progress-text');
    progressText.textContent = text;
    progress.style.display = 'block';
}

function hideProgress() {
    const progress = document.querySelector('.progress-container');
    progress.style.display = 'none';
}

// Export the initialization function
window.initCleanupTab = initCleanupTab;
