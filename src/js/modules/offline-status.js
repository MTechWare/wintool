import { showNotification } from './notifications.js';

export function initOfflineStatusIndicator() {
    const statusBar = document.createElement('div');
    statusBar.id = 'offline-status';
    statusBar.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        padding: 5px 10px;
        background: #ef4444;
        color: white;
        border-radius: 4px;
        font-size: 12px;
        display: none;
        z-index: 1000;
    `;
    statusBar.textContent = 'OFFLINE';
    document.body.appendChild(statusBar);

    function updateStatus() {
        if (navigator.onLine) {
            statusBar.style.display = 'none';
        } else {
            statusBar.style.display = 'block';
            showNotification('Working in offline mode', 'warning');
        }
    }

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
}