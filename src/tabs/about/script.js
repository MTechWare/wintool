// Add any interactive functionality for the About tab here.
// For example, dynamically loading the version number.

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch app version
    const version = await window.api.getAppVersion();
    const wintoolVersionEl = document.getElementById('wintool-version');
    if (wintoolVersionEl) {
      wintoolVersionEl.textContent = version;
    }

    // Fetch system info
    const systemInfo = await window.api.getSystemInfo();

    const osEl = document.getElementById('sys-os');
    if (osEl) {
      osEl.textContent = systemInfo.os;
    }

    const cpuEl = document.getElementById('sys-cpu');
    if (cpuEl) {
      cpuEl.textContent = systemInfo.cpu;
    }

    const memEl = document.getElementById('sys-mem');
    if (memEl) {
      memEl.textContent = systemInfo.memory;
    }

    const diskEl = document.getElementById('sys-disk');
    if (diskEl) {
      diskEl.textContent = systemInfo.diskSpace;
    }
  } catch (error) {
    console.error('Failed to load about tab data:', error);
  }

  // Signal that this tab is ready
  if (window.markTabAsReady && typeof tabId !== 'undefined') {
    window.markTabAsReady(tabId);
  }
});
