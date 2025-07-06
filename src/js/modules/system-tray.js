import { showSettings } from './settings.js';
import { showNotification } from './notifications.js';


export function initSystemTrayListeners() {
    
    if (window.electronAPI && window.electronAPI.onMessage) {
        window.electronAPI.onMessage((event, message) => {
            if (message === 'show-settings') {
                showSettings();
            }
        });
    }

    
    if (window.electronAPI && window.electronAPI.onDisplayNotification) {
        window.electronAPI.onDisplayNotification(({ title, body, type }) => {
            showNotification(body, type); 
        });
    }
}


export async function hideToTray() {
    if (window.electronAPI) {
        await window.electronAPI.hideToTray();
    }
}


export async function showFromTray() {
    if (window.electronAPI) {
        await window.electronAPI.showFromTray();
    }
}


export async function quitApplication() {
    if (window.electronAPI) {
        await window.electronAPI.quitApp();
    }
}
