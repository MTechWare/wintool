// Import necessary Electron modules and Node.js built-in modules
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// --- Function to Create the Application Window ---
function createWindow() {
  console.log("Creating application window...");
  // Create the browser window with specified options
  const win = new BrowserWindow({
    width: 936,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    resizable: true,
    frame: false,
    transparent: false,
    backgroundColor: '#23272a',
    title: 'WinTool - Utility Dashboard',
    autoHideMenuBar: true,
    show: false, // Don't show until ready-to-show event
    alwaysOnTop: true,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  // Load the main HTML file
  win.loadFile('index.html')
    .then(() => console.log('index.html loaded successfully.'))
    .catch(err => {
        console.error('Failed to load index.html:', err);
        if (app.isReady()) {
            dialog.showErrorBox('UI Load Error', `Could not load the application interface (index.html):\n${err.message}`);
        }
    });

  // Show the window gracefully when content is ready
  win.once('ready-to-show', () => {
    win.show();
    console.log('Window ready and shown.');
  });

  // Minimize the window once it's initially shown (if desired)
  win.once('show', () => {
    if (win && !win.isDestroyed()) {
        win.minimize();
        console.log('Window minimized on startup.');
    }
  });

  win.on('closed', () => {
    console.log('Main window closed.');
  });
}

// --- Require backend modules ---
const { getSystemInfo } = require('./system-info');
const { launchTaskManager, launchDiskCleanup } = require('./system-commands');
const { getPackages } = require('./packages');
const { packageAction } = require('./package-actions');
const { getCurrentTweaks, applyTweaks } = require('./tweaks');

// --- IPC handlers ---
ipcMain.handle('get-system-info', async () => {
  try {
    return await getSystemInfo();
  } catch (error) {
    return { error: error.message };
  }
});
ipcMain.handle('launch-task-manager', async () => {
  try {
    return await launchTaskManager();
  } catch (error) {
    return { error: error.message };
  }
});
ipcMain.handle('launch-disk-cleanup', async () => {
  try {
    return await launchDiskCleanup();
  } catch (error) {
    return { error: error.message };
  }
});
ipcMain.handle('get-packages', async () => {
  try {
    return await getPackages();
  } catch (error) {
    return { error: error.message };
  }
});
ipcMain.handle('package-action', async (event, action, packageId) => {
  try {
    return await packageAction(action, packageId);
  } catch (error) {
    return { error: error.message };
  }
});
ipcMain.handle('get-current-tweaks', async () => {
  try {
    return await getCurrentTweaks();
  } catch (error) {
    return { error: error.message };
  }
});
ipcMain.handle('apply-tweaks', async (event, tweaks) => {
  try {
    return await applyTweaks(tweaks);
  } catch (error) {
    return { error: error.message };
  }
});
ipcMain.handle('close-window', async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

// --- IPC Handlers ---
ipcMain.on('resize-window', (event, height, width) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win && width && height) {
    console.log(`Resizing window to: ${width}x${height}`);
    try {
      win.setSize(parseInt(width, 10), parseInt(height, 10), true);
    } catch (e) {
      console.error("Failed to resize window:", e);
    }
  } else if (!win) {
    console.warn("Resize request received but no focused window found.");
  } else {
    console.warn("Resize request received with invalid dimensions:", width, height);
  }
});

// --- App Lifecycle Events ---
app.whenReady().then(createWindow);

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  console.warn(`Certificate error for ${url}: ${error}`);
  event.preventDefault();
  callback(true);
});

app.on('window-all-closed', () => {
  console.log('All windows closed.');
  if (process.platform !== 'darwin') {
     console.log('Non-macOS: App will quit.');
     app.quit(); // Let 'will-quit' handle backend cleanup
  } else {
    console.log('App remains running (macOS standard behavior).');
  }
});
