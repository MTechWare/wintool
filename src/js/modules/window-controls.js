export function initWindowControls() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', async () => {
            if (window.electronAPI) {
                await window.electronAPI.hideToTray();
            }
        });
    }

    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', async () => {
            if (window.electronAPI) {
                await window.electronAPI.maximizeWindow();
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', async () => {
            if (window.electronAPI) {
                await window.electronAPI.closeWindow();
            }
        });
    }
}
