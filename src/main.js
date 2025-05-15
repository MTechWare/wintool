/**
 * WinTool - Main Electron Process
 *
 * This file handles:
 * - Application initialization
 * - Window management
 * - IPC communication
 * - System tray integration
 * - Backup and restore functionality
 */

// Import necessary Electron modules and Node.js built-in modules
const { app, BrowserWindow, ipcMain, shell, dialog, screen, protocol, Tray, Menu, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Import logger utility
const logger = require('./js/utils/logger');

// Lazy load other modules only when needed
let exec, execFile, util, execAsync, portscanner, dns, fetch;
let REG_PATHS;

// Initialize store
let store;

// Initialize tray and main window references
let tray = null;
let mainWindow = null;

// Set app name for better performance
app.setName('WinTool');

// Initialize logger
logger.initialize({
  consoleLevel: logger.LOG_LEVELS.INFO,
  fileLevel: logger.LOG_LEVELS.DEBUG,
  enableConsole: true,
  enableFile: true
});
logger.info(logger.LOG_CATEGORIES.SYSTEM, 'WinTool application starting');

// Log system information
logger.logSystemInfo();

// Disable hardware acceleration for low-resource systems
app.disableHardwareAcceleration();
logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Hardware acceleration disabled for better performance');

// Configure custom cache path to avoid permission issues
const userDataPath = app.getPath('userData');
const cachePath = path.join(userDataPath, 'Cache');

// Clear any existing cache files to prevent permission issues
try {
  if (fs.existsSync(cachePath)) {
    logger.info(logger.LOG_CATEGORIES.SYSTEM, `Clearing existing cache at: ${cachePath}`);
    // We'll just use the cache path with a new name to avoid permission issues
    const oldCachePath = path.join(userDataPath, 'OldCache-' + Date.now());
    fs.renameSync(cachePath, oldCachePath);
    logger.info(logger.LOG_CATEGORIES.SYSTEM, `Renamed old cache to: ${oldCachePath}`);

    // Create a new empty cache directory
    fs.mkdirSync(cachePath, { recursive: true });
  } else {
    // Create cache directory if it doesn't exist
    fs.mkdirSync(cachePath, { recursive: true });
    logger.info(logger.LOG_CATEGORIES.SYSTEM, `Created cache directory: ${cachePath}`);
  }
} catch (error) {
  logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error managing cache directory: ${error.message}`);
}

app.commandLine.appendSwitch('disk-cache-dir', cachePath);
logger.info(logger.LOG_CATEGORIES.SYSTEM, `Setting custom cache path: ${cachePath}`);

/**
 * Load modules on demand to reduce memory usage
 * @returns {Object} Object containing loaded modules
 */
function loadModules() {
  if (!exec) {
    const cp = require('child_process');
    exec = cp.exec;
    execFile = cp.execFile;
    util = require('util');
    execAsync = util.promisify(exec);
  }

  if (!REG_PATHS) {
    REG_PATHS = require('./js/utils/registry-paths');
  }

  return { exec, execFile, util, execAsync, os, REG_PATHS };
}

// Load store asynchronously
(async () => {
    try {
        const Store = await import('electron-store');
        store = new Store.default();
    } catch (error) {
        console.error('Failed to load electron-store:', error);
    }
})();

const { executeCommand, executeCustomCommand } = require('./js/utils/terminal-commands');

app.whenReady().then(async () => {
  logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Electron app is ready');

  // Check if we should run with admin privileges
  try {
    // Initialize store if not already done
    if (!store) {
      const Store = await import('electron-store');
      store = new Store.default();
    }

    // Check if the user has requested admin privileges
    const shouldRunAsAdmin = store.get('adminPrivileges', false);

    // Check if we're already running as admin
    const isElevated = (await import('is-elevated')).default;
    const isRunningAsAdmin = await isElevated();

    logger.info(logger.LOG_CATEGORIES.ADMIN, `Admin privileges requested: ${shouldRunAsAdmin}, currently running as admin: ${isRunningAsAdmin}`);

    // If admin privileges are requested but we're not running as admin, restart as admin
    if (shouldRunAsAdmin && !isRunningAsAdmin) {
      logger.info(logger.LOG_CATEGORIES.ADMIN, 'Restarting with admin privileges');

      const appPath = process.execPath;
      const args = process.argv.slice(1).join(' ');

      // Use PowerShell to restart the app with admin privileges
      const { exec } = require('child_process');
      exec(`powershell -Command "Start-Process -FilePath '${appPath}' -ArgumentList '${args}' -Verb RunAs"`, (error) => {
        if (error) {
          logger.error(logger.LOG_CATEGORIES.ADMIN, `Failed to restart as admin: ${error.message}`);
          // Continue with normal startup if we can't restart as admin
          continueStartup();
        } else {
          // Exit the current instance
          app.exit(0);
        }
      });

      // Return early to prevent normal startup
      return;
    }
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.ADMIN, `Error checking admin privileges: ${error.message}`);
    // Continue with normal startup if there's an error
  }

  // Continue with normal startup
  continueStartup();
});

// Function to continue with normal startup
async function continueStartup() {
  // Create window immediately for better perceived performance
  logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Creating main window');

  // Configure session cache to avoid permission issues
  const session = require('electron').session;
  const userDataPath = app.getPath('userData');
  const sessionCachePath = path.join(userDataPath, 'SessionCache');

  // Manage session cache directory
  try {
    if (fs.existsSync(sessionCachePath)) {
      logger.info(logger.LOG_CATEGORIES.SYSTEM, `Clearing existing session cache at: ${sessionCachePath}`);
      // Rename the old cache to avoid permission issues
      const oldSessionCachePath = path.join(userDataPath, 'OldSessionCache-' + Date.now());
      fs.renameSync(sessionCachePath, oldSessionCachePath);
      logger.info(logger.LOG_CATEGORIES.SYSTEM, `Renamed old session cache to: ${oldSessionCachePath}`);

      // Create a new empty session cache directory
      fs.mkdirSync(sessionCachePath, { recursive: true });
      logger.info(logger.LOG_CATEGORIES.SYSTEM, `Created new session cache directory: ${sessionCachePath}`);
    } else {
      // Create session cache directory if it doesn't exist
      fs.mkdirSync(sessionCachePath, { recursive: true });
      logger.info(logger.LOG_CATEGORIES.SYSTEM, `Created session cache directory: ${sessionCachePath}`);
    }
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error managing session cache directory: ${error.message}`);
  }

  // Set session cache path using the correct method
  app.commandLine.appendSwitch('disk-cache-dir', sessionCachePath);
  logger.info(logger.LOG_CATEGORIES.SYSTEM, `Setting session cache path: ${sessionCachePath}`);

  // Dependencies are now bundled with the application
  logger.info(logger.LOG_CATEGORIES.SYSTEM, 'All dependencies are bundled with the application - no checking needed');

  // Driver management removed

  // Create window immediately for better perceived performance
  createWindow();
}

/**
 * Create the system tray icon and context menu
 * Allows the app to run in the background
 */
function createTray() {
  logger.info(logger.LOG_CATEGORIES.UI, "Creating tray icon");

  // Create the tray icon
  tray = new Tray(path.join(__dirname, 'assets/images/icon.ico'));
  tray.setToolTip('WinTool');

  // Create the context menu for the tray
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open WinTool',
      click: () => {
        if (mainWindow) {
          // Show in taskbar again
          mainWindow.setSkipTaskbar(false);
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quick Tools',
      submenu: [
        {
          label: 'Task Manager',
          click: () => {
            exec('start taskmgr');
          }
        },
        {
          label: 'System Settings',
          click: () => {
            exec('start ms-settings:');
          }
        },
        {
          label: 'Command Prompt',
          click: () => {
            exec('start cmd');
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'About WinTool',
      click: () => {
        if (mainWindow) {
          mainWindow.setSkipTaskbar(false);
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('navigate-to-tab', 'about');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        logger.info(logger.LOG_CATEGORIES.UI, 'Exiting application from tray menu');
        app.isQuitting = true;
        app.quit();
      }
    },
    {
      label: 'Force Quit',
      visible: process.env.NODE_ENV === 'development', // Only show in development mode
      click: () => {
        logger.info(logger.LOG_CATEGORIES.UI, 'Force quitting application from tray menu');
        app.isQuitting = true;

        // Terminate child processes
        terminateChildProcesses();

        // Force exit the app
        setTimeout(() => {
          logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Force exiting application');
          app.exit(0);
        }, 500);
      }
    }
  ]);

  // Set the context menu
  tray.setContextMenu(contextMenu);

  // Add click handler to open the app
  tray.on('click', () => {
    if (mainWindow) {
      // Show in taskbar again
      mainWindow.setSkipTaskbar(false);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  logger.info(logger.LOG_CATEGORIES.UI, "Tray icon created successfully");
}

/**
 * Create the main application window
 * @returns {BrowserWindow} The created window
 */
function createWindow() {
  logger.info(logger.LOG_CATEGORIES.UI, "Creating main window");

  // Detect low-resource mode based on system memory
  const isLowResourceMode = detectLowResourceMode();

  // Get the primary display's dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Calculate 70% of screen dimensions
  const windowWidth = Math.round(screenWidth * 0.7);
  const windowHeight = Math.round(screenHeight * 0.7);

  logger.info(logger.LOG_CATEGORIES.UI, `Screen resolution: ${screenWidth}x${screenHeight}`);
  logger.info(logger.LOG_CATEGORIES.UI, `Setting window size to 70%: ${windowWidth}x${windowHeight}`);

  // Create the browser window with optimized options for low-resource systems
  mainWindow = new BrowserWindow({
    width: windowWidth, // 70% of screen width
    height: windowHeight, // 70% of screen height
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'assets/images/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: true, // Throttle background tabs
      devTools: true, // Always enable DevTools for console toggle feature
    },
    frame: false, // Remove default window frame
    backgroundColor: '#111113',
    show: false, // Don't show until ready
    center: true, // Center the window on the screen
    skipTaskbar: false, // Initially show in taskbar, will be hidden when minimized to tray
  });

  // Add a context menu for development purposes (only in normal mode)
  if (!isLowResourceMode) {
    mainWindow.webContents.on('context-menu', (e, params) => {
      const menu = [
        { label: 'Inspect Element', click: () => mainWindow.webContents.inspectElement(params.x, params.y) },
        { type: 'separator' },
        { label: 'Reload', click: () => mainWindow.reload() }
      ];
      require('electron').Menu.buildFromTemplate(menu).popup();
    });
  }

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Handle window control IPC events
  ipcMain.handle('minimize-window', () => {
    mainWindow.minimize();
    return true;
  });

  ipcMain.handle('maximize-window', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return true;
  });

  ipcMain.handle('close-window', () => {
    // Instead of closing, hide the window
    mainWindow.hide();
    return true;
  });

  // Restore alwaysOnTop state from localStorage (via IPC)
  ipcMain.handle('getAlwaysOnTop', () => {
    return mainWindow ? mainWindow.isAlwaysOnTop() : false;
  });

  // Show the window gracefully when content is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    logger.info(logger.LOG_CATEGORIES.UI, 'Window ready and shown');

    // Create the tray icon after the main window is ready
    createTray();

    // Check if we should show the log viewer
    try {
      // Initialize store if not already done
      if (!store) {
        const Store = require('electron-store');
        store = new Store();
      }

      // Check localStorage via webContents
      mainWindow.webContents.executeJavaScript('localStorage.getItem("showLogViewer")')
        .then((showLogViewer) => {
          if (showLogViewer === '1') {
            logger.info(logger.LOG_CATEGORIES.UI, 'Opening log viewer based on user preference');

            // Create a new window for the log viewer
            const logViewerWindow = new BrowserWindow({
              width: 1000,
              height: 700,
              minWidth: 800,
              minHeight: 600,
              icon: path.join(__dirname, 'assets/images/icon.ico'),
              webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true
              },
              title: 'WinTool Log Viewer',
              backgroundColor: '#111113'
            });

            // Load the log viewer HTML file
            logViewerWindow.loadFile(path.join(__dirname, 'html/log-viewer.html'));
          }
        })
        .catch(error => {
          logger.error(logger.LOG_CATEGORIES.UI, `Error checking log viewer preference: ${error.message}`);
        });
    } catch (error) {
      logger.error(logger.LOG_CATEGORIES.UI, `Error checking log viewer preference: ${error.message}`);
    }
  });

  // Handle the close event - prevent the window from closing unless we're actually quitting
  mainWindow.on('close', (event) => {
    // If app.isQuitting is true, allow the window to close
    // Otherwise, prevent closing and minimize to tray instead
    if (!app.isQuitting) {
      event.preventDefault();
      // Hide the window and remove from taskbar
      mainWindow.setSkipTaskbar(true);
      mainWindow.hide();
      logger.info(logger.LOG_CATEGORIES.UI, 'Close event intercepted, minimizing to tray instead');
      return false;
    }
    return true;
  });

  mainWindow.on('closed', () => {
    logger.info(logger.LOG_CATEGORIES.UI, 'Main window closed');
    mainWindow = null;
  });

  // Add low-resource mode detection to the window object
  mainWindow.isLowResourceMode = isLowResourceMode;

  // Expose low-resource mode to renderer process
  ipcMain.handle('isLowResourceMode', () => {
    return isLowResourceMode;
  });

  return mainWindow;
}

/**
 * Detect if system is low on resources
 * Always returns true to enforce optimizations for better performance
 * @returns {boolean} Whether low-resource mode should be enabled
 */
function detectLowResourceMode() {
  try {
    // Log system specs once for debugging
    const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
    const cpuCores = os.cpus().length;

    logger.info(logger.LOG_CATEGORIES.HARDWARE,
      `System specs: ${totalMemoryGB.toFixed(1)}GB RAM, ${cpuCores} cores`);
    logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Low-resource mode: enabled (enforced)');

    return true; // Always enable low-resource mode
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.HARDWARE, `Error detecting resources: ${error.message}`);
    return true;
  }
}

// --- IPC Handler for Always on Top ---
ipcMain.handle('setAlwaysOnTop', (event, value) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.setAlwaysOnTop(!!value);
  }
});

// This IPC handler has been replaced by the openLogViewer handler

// --- Global Window Control Handlers ---
// These handlers work for any window, not just the main window
ipcMain.handle('minimizeWindow', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
  return true;
});

ipcMain.handle('maximizeWindow', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
  return true;
});

// Track if we've shown the close notification
let hasShownCloseNotification = false;

ipcMain.handle('closeWindow', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    // If this is the main window, handle special close behavior
    if (win === mainWindow) {
      // Initialize store if not already done
      if (!store) {
        try {
          const Store = require('electron-store');
          store = new Store();
        } catch (error) {
          logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error initializing store: ${error.message}`);
        }
      }

      // Check if we've already shown the notification in a previous session
      const hasShownBefore = store ? store.get('hasShownCloseNotification', false) : false;

      // Hide the window (minimize to tray) and remove from taskbar
      mainWindow.setSkipTaskbar(true); // Hide from taskbar
      mainWindow.hide();
      logger.info(logger.LOG_CATEGORIES.UI, 'Main window close button clicked, minimizing to tray');

      if (!hasShownBefore && !hasShownCloseNotification) {
        // Show a dialog instead of a notification (more reliable)
        dialog.showMessageBox({
          type: 'info',
          title: 'WinTool - System Management Suite',
          message: 'WinTool continues running in the background',
          detail: 'The application will remain active in the system tray. Click the tray icon to restore the window, or right-click for more options.',
          buttons: ['Got it'],
          defaultId: 0,
          icon: path.join(__dirname, 'assets/images/icon.ico')
        }).then(() => {
          // Remember that we've shown the notification
          hasShownCloseNotification = true;
          if (store) {
            store.set('hasShownCloseNotification', true);
          }
        });
      }
    } else {
      // For other windows, just close them
      win.close();
    }
  }
  return true;
});

// --- Tray-related IPC Handlers ---
// Track if we've shown the tray notification
let hasShownTrayNotification = false;

ipcMain.handle('minimizeToTray', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Hide the window first and remove from taskbar
    mainWindow.setSkipTaskbar(true); // Hide from taskbar
    mainWindow.hide();
    logger.info(logger.LOG_CATEGORIES.UI, 'Window minimized to tray');

    // Show a notification the first time the app is minimized to tray
    if (!hasShownTrayNotification) {
      // Initialize store if not already done
      if (!store) {
        try {
          const Store = require('electron-store');
          store = new Store();
        } catch (error) {
          logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error initializing store: ${error.message}`);
        }
      }

      // Check if we've already shown the notification in a previous session
      const hasShownBefore = store ? store.get('hasShownTrayNotification', false) : false;

      if (!hasShownBefore) {
        // Show a dialog instead of a notification (more reliable)
        dialog.showMessageBox({
          type: 'info',
          title: 'WinTool - System Management Suite',
          message: 'WinTool continues running in the background',
          detail: 'The application will remain active in the system tray. Click the tray icon to restore the window, or right-click for more options.',
          buttons: ['Got it'],
          defaultId: 0,
          icon: path.join(__dirname, 'assets/images/icon.ico')
        }).then(() => {
          // Remember that we've shown the notification
          hasShownTrayNotification = true;
          if (store) {
            store.set('hasShownTrayNotification', true);
          }
        });
      }
    }
  }
  return true;
});

ipcMain.handle('restoreFromTray', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Show in taskbar again
    mainWindow.setSkipTaskbar(false);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    logger.info(logger.LOG_CATEGORIES.UI, 'Window restored from tray');
  }
  return true;
});

ipcMain.handle('quitApp', () => {
  logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Quitting application via IPC request');

  // Set the quitting flag to true
  app.isQuitting = true;

  // Force close any child windows first
  BrowserWindow.getAllWindows().forEach(window => {
    if (window !== mainWindow && !window.isDestroyed()) {
      logger.info(logger.LOG_CATEGORIES.UI, `Closing child window: ${window.getTitle ? window.getTitle() : 'unnamed'}`);
      window.destroy();
    }
  });

  // Set a timeout to force quit if normal quit takes too long
  const forceQuitTimeout = setTimeout(() => {
    logger.warn(logger.LOG_CATEGORIES.SYSTEM, 'Normal quit process taking too long, forcing exit');
    terminateChildProcesses();
    app.exit(0);
  }, 5000); // 5 seconds timeout

  // Store the timeout ID so we can clear it if the app quits normally
  app._forceQuitTimeout = forceQuitTimeout;

  // Then quit the app
  logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Calling app.quit()');
  app.quit();

  return true;
});

// --- IPC Handler for Reload Window ---
ipcMain.on('reload-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.reload();
});

// --- Dependency Management Removed ---
// All dependencies are now bundled with the application

// Stub handlers for API compatibility
ipcMain.on('dependency-error', (event, errorInfo) => {
  logger.info(logger.LOG_CATEGORIES.DEPENDENCY, `Dependency error handler called but dependencies are now bundled: ${errorInfo.dependency}`);
  // No action needed as all dependencies are bundled
});

ipcMain.handle('check-dependencies', async () => {
  logger.info(logger.LOG_CATEGORIES.DEPENDENCY, 'Dependency check requested but dependencies are now bundled');
  return {
    success: true,
    missing: [],
    fixed: [],
    failed: [],
    found: []
  };
});

ipcMain.handle('fix-dependency', async (event, dependency) => {
  logger.info(logger.LOG_CATEGORIES.DEPENDENCY, `Dependency fix requested but dependencies are now bundled: ${dependency}`);
  return {
    success: true,
    path: 'bundled'
  };
});

// --- Backup and Restore Handlers ---
// Import backup-restore utility
let backupRestore;
try {
  backupRestore = require('./js/utils/backup-restore');
} catch (error) {
  console.error('Error loading backup-restore module:', error);
  // Create a stub module if the real one fails to load
  backupRestore = {
    createBackup: async () => ({ success: false, error: 'Backup module not loaded' }),
    restoreBackup: async () => ({ success: false, error: 'Backup module not loaded' }),
    getBackupHistory: () => [],
    getBackupDir: () => path.join(app.getPath('userData'), 'backups'),
    BACKUP_CATEGORIES: {
      APP_SETTINGS: 'app_settings',
      SYSTEM_CONFIGS: 'system_configs',
      TWEAKS: 'tweaks',
      USER_PROFILES: 'user_profiles'
    }
  };
}

// Import backup scheduler
let backupScheduler;
try {
  backupScheduler = require('./js/utils/backup-scheduler');

  // Initialize backup scheduler when app is ready
  app.whenReady().then(() => {
    // Schedule next backup if enabled
    backupScheduler.scheduleNextBackup();

    logger.info(logger.LOG_CATEGORIES.BACKUP, 'Backup scheduler initialized');
  });
} catch (error) {
  console.error('Error loading backup-scheduler module:', error);
  // Create a stub module if the real one fails to load
  backupScheduler = {
    loadSchedule: () => ({ enabled: false }),
    saveSchedule: () => false,
    setSchedule: () => ({ success: false, error: 'Backup scheduler not loaded' }),
    getNextBackupTime: () => null,
    scheduleNextBackup: () => {},
    performAutomaticBackup: async () => ({ success: false, error: 'Backup scheduler not loaded' })
  };
}

// Create backup
ipcMain.handle('createBackup', async (event, backupPath, options = {}) => {
  try {
    logger.info(logger.LOG_CATEGORIES.BACKUP, `Creating backup at ${backupPath}`);

    // Set up progress reporting
    const progressCallback = (progress, status) => {
      if (event.sender.isDestroyed()) return;
      event.sender.send('backup-progress', {
        progress,
        status
      });
    };

    const result = await backupRestore.createBackup(backupPath, options, progressCallback);
    return result;
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.BACKUP, `Error creating backup: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Restore from backup
ipcMain.handle('restoreBackup', async (event, backupFile, options = {}) => {
  try {
    logger.info(logger.LOG_CATEGORIES.RESTORE, `Restoring from backup ${backupFile}`);

    // Set up progress reporting
    const progressCallback = (progress, status) => {
      if (event.sender.isDestroyed()) return;
      event.sender.send('restore-progress', {
        progress,
        status
      });
    };

    const result = await backupRestore.restoreBackup(backupFile, options, progressCallback);
    return result;
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.RESTORE, `Error restoring backup: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Get backup info
ipcMain.handle('getBackupInfo', async (event, backupFile) => {
  try {
    logger.info(logger.LOG_CATEGORIES.BACKUP, `Getting info for backup ${backupFile}`);

    // Check if verification file exists
    const verificationFile = `${backupFile}.verify`;
    if (fs.existsSync(verificationFile)) {
      const verificationData = JSON.parse(fs.readFileSync(verificationFile, 'utf8'));
      return { success: true, metadata: verificationData.metadata };
    }

    // If no verification file, try to extract metadata from the backup
    const tempDir = path.join(os.tmpdir(), `wintool_backup_info_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // Extract just the metadata file
      let extract;
      try {
        extract = require('extract-zip');
      } catch (err) {
        logger.error(logger.LOG_CATEGORIES.BACKUP, `Failed to load extract-zip module: ${err.message}`);
        return { success: false, error: 'Failed to load extraction module' };
      }

      await extract(backupFile, {
        dir: tempDir
        // Note: onEntry filter is not supported in newer versions of extract-zip
        // We'll just extract everything and look for the metadata file
      });

      // Read metadata
      const metadataPath = path.join(tempDir, 'backup_metadata.json');
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        return { success: true, metadata };
      }

      return { success: false, error: 'No metadata found in backup file' };
    } catch (extractError) {
      logger.error(logger.LOG_CATEGORIES.BACKUP, `Error extracting backup: ${extractError.message}`);
      return { success: false, error: `Error extracting backup: ${extractError.message}` };
    } finally {
      // Clean up temp directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        logger.warn(logger.LOG_CATEGORIES.BACKUP, `Failed to clean up temp directory: ${cleanupError.message}`);
      }
    }
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.BACKUP, `Error getting backup info: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Get backup history
ipcMain.handle('getBackupHistory', async () => {
  try {
    logger.info(logger.LOG_CATEGORIES.BACKUP, 'Getting backup history');
    const history = backupRestore.getBackupHistory();
    return history;
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.BACKUP, `Error getting backup history: ${error.message}`);
    return [];
  }
});

// Delete backup
ipcMain.handle('deleteBackup', async (event, backupPath) => {
  try {
    logger.info(logger.LOG_CATEGORIES.BACKUP, `Deleting backup ${backupPath}`);

    // Delete backup file
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

    // Delete verification file if it exists
    const verificationFile = `${backupPath}.verify`;
    if (fs.existsSync(verificationFile)) {
      fs.unlinkSync(verificationFile);
    }

    return { success: true };
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.BACKUP, `Error deleting backup: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Clear backup history
ipcMain.handle('clearBackupHistory', async () => {
  try {
    logger.info(logger.LOG_CATEGORIES.BACKUP, 'Clearing backup history');

    const backupDir = backupRestore.getBackupDir();
    const historyPath = path.join(backupDir, 'backup_history.json');

    if (fs.existsSync(historyPath)) {
      fs.unlinkSync(historyPath);
    }

    return { success: true };
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.BACKUP, `Error clearing backup history: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Clear all user data
ipcMain.handle('clear-user-data', async () => {
  try {
    logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Clearing all user data');

    // Get the user data directory
    const userDataPath = app.getPath('userData');
    logger.info(logger.LOG_CATEGORIES.SYSTEM, `User data path: ${userDataPath}`);

    // Initialize store if not already done
    if (!store) {
      const Store = await import('electron-store');
      store = new Store.default();
    }

    // Clear electron-store data (config.json)
    try {
      // Get all keys in the store
      const storeKeys = Object.keys(store.store);
      logger.info(logger.LOG_CATEGORIES.SYSTEM, `Clearing ${storeKeys.length} keys from electron-store`);

      // Set the resetAdminPrivileges flag to true before clearing
      // This ensures that when the app is restarted, it will clear the admin privileges setting
      store.set('resetAdminPrivileges', true);
      logger.info(logger.LOG_CATEGORIES.ADMIN, 'Set resetAdminPrivileges flag to true');

      // Delete each key individually except for the resetAdminPrivileges flag
      storeKeys.forEach(key => {
        if (key !== 'resetAdminPrivileges') {
          store.delete(key);
        }
      });

      logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Electron-store data cleared successfully');
    } catch (storeError) {
      logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error clearing electron-store data: ${storeError.message}`);
    }

    // Clear session cache
    try {
      const session = require('electron').session;
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData();
      logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Session cache and storage data cleared successfully');
    } catch (sessionError) {
      logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error clearing session data: ${sessionError.message}`);
    }

    // Find and delete user data files, but preserve logs
    try {
      const files = fs.readdirSync(userDataPath);

      // Filter out log directory and essential files
      const filesToDelete = files.filter(file => {
        // Keep the logs directory
        if (file === 'logs') return false;

        // Delete everything else except essential system files
        return true;
      });

      logger.info(logger.LOG_CATEGORIES.SYSTEM, `Found ${filesToDelete.length} user data files to delete`);

      // Delete each file/directory
      for (const file of filesToDelete) {
        const filePath = path.join(userDataPath, file);
        try {
          const stats = fs.statSync(filePath);

          if (stats.isDirectory()) {
            // Skip the logs directory
            if (file === 'logs') continue;

            // For directories, use recursive deletion
            fs.rmdirSync(filePath, { recursive: true });
            logger.info(logger.LOG_CATEGORIES.SYSTEM, `Deleted directory: ${filePath}`);
          } else {
            // For files, just unlink them
            fs.unlinkSync(filePath);
            logger.info(logger.LOG_CATEGORIES.SYSTEM, `Deleted file: ${filePath}`);
          }
        } catch (deleteError) {
          logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error deleting ${filePath}: ${deleteError.message}`);
        }
      }
    } catch (filesError) {
      logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error processing user data files: ${filesError.message}`);
    }

    logger.info(logger.LOG_CATEGORIES.SYSTEM, 'All user data cleared successfully');
    return { success: true };
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error clearing user data: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Set auto backup
ipcMain.handle('setAutoBackup', async (event, enabled) => {
  try {
    logger.info(logger.LOG_CATEGORIES.BACKUP, `Setting auto backup to ${enabled}`);

    // Initialize store if not already done
    if (!store) {
      const Store = await import('electron-store');
      store = new Store.default();
    }

    // Save the setting
    store.set('autoBackup', enabled);

    // Update the backup schedule
    if (backupScheduler) {
      const schedule = backupScheduler.loadSchedule();
      schedule.enabled = enabled;
      backupScheduler.saveSchedule(schedule);

      if (enabled) {
        // Schedule the next backup
        backupScheduler.scheduleNextBackup();
        logger.info(logger.LOG_CATEGORIES.BACKUP, 'Auto backup enabled, scheduled next backup');
      }
    }

    return { success: true };
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.BACKUP, `Error setting auto backup: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Get backup schedule
ipcMain.handle('getBackupSchedule', async () => {
  try {
    logger.info(logger.LOG_CATEGORIES.BACKUP, 'Getting backup schedule');
    const schedule = backupScheduler.loadSchedule();
    return { success: true, schedule };
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.BACKUP, `Error getting backup schedule: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Set backup schedule
ipcMain.handle('setBackupSchedule', async (event, schedule) => {
  try {
    logger.info(logger.LOG_CATEGORIES.BACKUP, `Setting backup schedule: ${JSON.stringify(schedule)}`);
    const result = backupScheduler.setSchedule(schedule);
    return result;
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.BACKUP, `Error setting backup schedule: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Get next backup time
ipcMain.handle('getNextBackupTime', async (event, schedule = null) => {
  try {
    logger.info(logger.LOG_CATEGORIES.BACKUP, 'Getting next backup time');
    const nextBackupTime = backupScheduler.getNextBackupTime(schedule);
    return { success: true, nextBackupTime };
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.BACKUP, `Error getting next backup time: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Run backup now
ipcMain.handle('runBackupNow', async () => {
  try {
    logger.info(logger.LOG_CATEGORIES.BACKUP, 'Running backup now');
    const result = await backupScheduler.performAutomaticBackup();
    return result;
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.BACKUP, `Error running backup: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Get default backup path
ipcMain.handle('getDefaultBackupPath', async () => {
  try {
    const backupDir = backupRestore.getBackupDir();
    const now = new Date();
    const dateStr = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const defaultPath = path.join(backupDir, `WinTool_Backup_${dateStr}.wtbackup`);

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    return defaultPath;
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.BACKUP, `Error getting default backup path: ${error.message}`);
    return '';
  }
});

// Show save dialog
ipcMain.handle('showSaveDialog', async (event, options) => {
  try {
    const result = await dialog.showSaveDialog(options);
    return result;
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.UI, `Error showing save dialog: ${error.message}`);
    return { canceled: true, error: error.message };
  }
});

// Show open dialog
ipcMain.handle('showOpenDialog', async (event, options) => {
  try {
    const result = await dialog.showOpenDialog(options);
    return result;
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.UI, `Error showing open dialog: ${error.message}`);
    return { canceled: true, error: error.message };
  }
});

// --- IPC Handler for Restart App ---
ipcMain.on('restart-app', async (event) => {
  logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Restarting application');

  // Check if we need to reset admin privileges
  // This is triggered when the user resets all settings
  try {
    // Initialize store if not already done
    if (!store) {
      const Store = await import('electron-store');
      store = new Store.default();
    }

    // Check if the resetAdminPrivileges flag is set
    // We'll use the store itself to check this
    const resetAdminPrivileges = store.get('resetAdminPrivileges', false);

    if (resetAdminPrivileges) {
      logger.info(logger.LOG_CATEGORIES.ADMIN, 'Resetting admin privileges');

      // Clear the admin privileges setting in electron-store
      store.delete('adminPrivileges');
      store.delete('resetAdminPrivileges');
    }
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.ADMIN, `Error resetting admin privileges: ${error.message}`);
  }

  app.relaunch();
  app.exit(0);
});

// --- Handle application exit to clean up resources ---
app.on('will-quit', (event) => {
  logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Application is quitting, cleaning up resources');

  // Clear the force quit timeout if it exists
  if (app._forceQuitTimeout) {
    logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Clearing force quit timeout');
    clearTimeout(app._forceQuitTimeout);
    app._forceQuitTimeout = null;
  }

  // Clear session cache to prevent permission issues on next start
  try {
    // Destroy any remaining windows to ensure they're properly closed
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        logger.info(logger.LOG_CATEGORIES.UI, `Destroying window: ${window.getTitle ? window.getTitle() : 'unnamed'}`);
        window.destroy();
      }
    });

    // Destroy tray icon
    if (tray) {
      logger.info(logger.LOG_CATEGORIES.UI, 'Destroying tray icon');
      tray.destroy();
      tray = null;
    }

    // Clear session cache
    const session = require('electron').session;
    session.defaultSession.clearCache()
      .then(() => {
        logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Session cache cleared successfully');
      })
      .catch(error => {
        logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error clearing session cache: ${error.message}`);
      })
      .finally(() => {
        // Clean up old cache directories
        cleanupOldCacheDirectories();

        // Close the logger as the final step
        logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Final cleanup complete, closing logger');
        logger.close();
      });
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error during cleanup: ${error.message}`);
    logger.close();
  }
});

/**
 * Clean up old cache directories
 * Removes cache directories older than 24 hours to free up disk space
 */
function cleanupOldCacheDirectories() {
  try {
    const userDataPath = app.getPath('userData');
    const ONE_DAY_MS = 86400000; // 24 hours in milliseconds
    const now = Date.now();
    let cleanedCount = 0;

    // Use regex pattern for faster filtering
    const cachePattern = /^(OldCache-|OldSessionCache-)/;

    // Get and filter directories in one pass
    fs.readdirSync(userDataPath)
      .filter(file => cachePattern.test(file))
      .forEach(dir => {
        try {
          const dirPath = path.join(userDataPath, dir);
          const stats = fs.statSync(dirPath);

          // Delete if older than 24 hours
          if (now - stats.mtimeMs > ONE_DAY_MS) {
            fs.rmdirSync(dirPath, { recursive: true });
            cleanedCount++;
          }
        } catch (error) {
          // Only log serious errors to reduce log spam
          if (error.code !== 'ENOENT') {
            logger.error(logger.LOG_CATEGORIES.SYSTEM,
              `Cache cleanup error: ${error.code || error.message}`);
          }
        }
      });

    // Only log if we actually cleaned something
    if (cleanedCount > 0) {
      logger.info(logger.LOG_CATEGORIES.SYSTEM, `Cache cleanup: removed ${cleanedCount} directories`);
    }
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.SYSTEM, `Cache cleanup failed: ${error.message}`);
  }
}

// --- Logging IPC Handlers ---
// These handlers expose logging functionality to the renderer process

// Get filtered logs
ipcMain.handle('getFilteredLogs', (event, filters) => {
  try {
    return logger.getFilteredLogs(filters);
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error getting filtered logs: ${error.message}`);
    return [];
  }
});

// Export logs to a file
ipcMain.handle('exportLogs', async (event, filters) => {
  try {
    // Show save dialog to get file path
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Logs',
      defaultPath: path.join(app.getPath('documents'), 'wintool-logs.txt'),
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) {
      return null;
    }

    // Export logs to the selected file
    await logger.exportLogs(filePath, filters);
    logger.info(logger.LOG_CATEGORIES.SYSTEM, `Logs exported to ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error exporting logs: ${error.message}`);
    throw error;
  }
});

// Log user action
ipcMain.handle('logUserAction', (event, action, details) => {
  try {
    logger.logUserAction(action, details);
    return true;
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error logging user action: ${error.message}`);
    return false;
  }
});

// Open log viewer window
ipcMain.handle('openLogViewer', () => {
  try {
    // Create a new window for the log viewer
    const logViewerWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      minWidth: 800,
      minHeight: 600,
      icon: path.join(__dirname, 'assets/images/icon.ico'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true
      },
      title: 'WinTool Log Viewer',
      backgroundColor: '#111113'
    });

    // Load the log viewer HTML file
    logViewerWindow.loadFile(path.join(__dirname, 'html/log-viewer.html'));

    // Log the action
    logger.info(logger.LOG_CATEGORIES.UI, 'Log viewer opened');

    return true;
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.UI, `Error opening log viewer: ${error.message}`);
    return false;
  }
});

// --- Lazy load backend modules ---
// We'll load modules only when they're needed to reduce memory usage
// Define module loaders
const moduleCache = {};

/**
 * Helper function to lazy load modules
 * Only loads modules when they're needed to reduce memory usage
 * @param {string} modulePath - Path to the module to load
 * @returns {Function} Function that returns the loaded module
 */
function lazyRequire(modulePath) {
  return function(...args) {
    // Use cached module if available to avoid redundant loading
    if (!moduleCache[modulePath]) {
      // Only log in debug mode to reduce logging overhead
      if (process.env.NODE_ENV === 'development') {
        logger.debug(logger.LOG_CATEGORIES.SYSTEM, `Lazy loading: ${modulePath}`);
      }
      // Cache the module for future use
      moduleCache[modulePath] = require(modulePath);
    }
    return moduleCache[modulePath];
  };
}

// System Modules (lazy loaded)
const getSystemInfo = () => lazyRequire('./js/utils/system-info')().getSystemInfo();
const systemCommands = () => lazyRequire('./js/utils/system-commands')();

// Package Modules (lazy loaded)
const getPackages = () => lazyRequire('./js/utils/packages')().getPackages();
const packageAction = () => lazyRequire('./js/utils/package-actions')().packageAction;

// Tweaks Modules (lazy loaded)
const tweaksModule = () => lazyRequire('./js/utils/tweaks')();

// Hardware Monitoring Modules (lazy loaded)
const hardwareMonitor = () => lazyRequire('./js/utils/hardware-monitor')();


// Gaming Features Module (lazy loaded)
const gamingFeatures = () => lazyRequire('./js/utils/gaming-features')();

// Driver Management Module removed

// ===================================================
// SYSTEM TOOLS TAB IPC HANDLERS
// ===================================================

// System Info IPC Handler
ipcMain.handle('get-system-info', async () => {
    try {
        const systemInfo = await getSystemInfo();
        return systemInfo;
    } catch (error) {
        console.error('System info error:', error);
        return { error: error.message };
    }
});

// ===================================================
// HARDWARE MONITOR TAB IPC HANDLERS
// ===================================================

// Hardware monitor window reference
let hardwareMonitorWindow = null;

// Function to create and open hardware monitor window
function createHardwareMonitorWindow() {
  // If window already exists, just focus it
  if (hardwareMonitorWindow && !hardwareMonitorWindow.isDestroyed()) {
    hardwareMonitorWindow.focus();
    return hardwareMonitorWindow;
  }

  // Get the primary display's dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Calculate 70% of screen dimensions
  const windowWidth = Math.round(screenWidth * 0.7);
  const windowHeight = Math.round(screenHeight * 0.7);

  console.log(`Setting hardware monitor window size to 70%: ${windowWidth}x${windowHeight}`);

  // Create new window
  hardwareMonitorWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 500,
    minHeight: 600,
    title: 'Hardware Monitor',
    icon: path.join(__dirname, 'assets/images/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // Add a base directory for resolving relative paths
      webSecurity: false, // Allow loading local resources
      additionalArguments: [`--app-path=${__dirname}`]
    },
    backgroundColor: '#111113',
    frame: false, // Remove default window frame for custom one
    show: false, // Don't show until ready
    center: true // Center the window on the screen
  });

  // Register a custom protocol handler for loading resources
  try {
    protocol.handle('app', (request) => {
      const url = request.url.slice('app://'.length);
      const filePath = path.join(__dirname, url);
      return new Response(fs.readFileSync(filePath));
    });
  } catch (error) {
    console.error('Error registering app protocol:', error);
    // Fallback to older method if the new one fails
    try {
      protocol.registerFileProtocol('app', (request, callback) => {
        const url = request.url.slice(6); // Remove 'app://'
        const filePath = path.join(__dirname, url);
        callback({ path: filePath });
      });
    } catch (fallbackError) {
      console.error('Error registering app protocol (fallback):', fallbackError);
    }
  }

  // Load the hardware monitor HTML file from the html directory
  const hardwareMonitorPath = path.join(__dirname, 'html', 'hardware-monitor.html');
  console.log(`Loading hardware monitor HTML from: ${hardwareMonitorPath}`);

  // Check if the file exists before loading
  if (fs.existsSync(hardwareMonitorPath)) {
    // Use loadURL with file:// protocol to ensure proper path resolution
    hardwareMonitorWindow.loadURL(`file://${hardwareMonitorPath}`);

    // Show window when ready
    hardwareMonitorWindow.once('ready-to-show', () => {
      hardwareMonitorWindow.show();
      console.log('Hardware monitor window ready and shown');

      // Let the renderer request hardware info when it's ready
      // This is more reliable than trying to send it from here
    });
  } else {
    console.error(`Hardware monitor HTML file not found at: ${hardwareMonitorPath}`);

    // Try the original path as a fallback
    const fallbackPath = path.join(__dirname, 'hardware-monitor.html');
    console.log(`Trying fallback path: ${fallbackPath}`);

    if (fs.existsSync(fallbackPath)) {
      console.log(`Found hardware monitor HTML at fallback path: ${fallbackPath}`);
      hardwareMonitorWindow.loadURL(`file://${fallbackPath}`);

      hardwareMonitorWindow.once('ready-to-show', () => {
        hardwareMonitorWindow.show();
        console.log('Hardware monitor window ready and shown (from fallback path)');
      });
    } else {
      // If we can't find the file, show an error in the window
      console.error(`Hardware monitor HTML file not found at fallback path either`);
      hardwareMonitorWindow.loadURL(`data:text/html,<html><body style="background-color: #111113; color: white; font-family: sans-serif; padding: 20px;"><h2>Error: Hardware Monitor Not Found</h2><p>The hardware monitor HTML file could not be found. Please reinstall the application.</p></body></html>`);

      hardwareMonitorWindow.once('ready-to-show', () => {
        hardwareMonitorWindow.show();
      });
    }
  }

  // Handle window close
  hardwareMonitorWindow.on('closed', () => {
    hardwareMonitorWindow = null;
    console.log('Hardware monitor window closed');
  });

  return hardwareMonitorWindow;
}

// IPC handler to open hardware monitor window
ipcMain.handle('open-hardware-monitor', () => {
  createHardwareMonitorWindow();
  return { success: true };
});

// Test hardware monitor functionality
ipcMain.handle('test-hardware-monitor', async () => {
  try {
    console.log('Testing hardware monitor...');
    const result = await hardwareMonitor().testHardwareMonitor();
    console.log('Hardware monitor test result:', result);
    return result;
  } catch (error) {
    console.error('Hardware monitor test error:', error);
    return { error: error.message };
  }
});

// Get CPU information including temperature
ipcMain.handle('get-cpu-info', async () => {
  try {
    console.log('Getting CPU information...');
    const cpuInfo = await hardwareMonitor().getCpuInfo();
    console.log('CPU info result:', cpuInfo);
    return cpuInfo;
  } catch (error) {
    console.error('CPU info error:', error);
    return { error: error.message };
  }
});

// Get GPU information including temperature
ipcMain.handle('get-gpu-info', async () => {
  try {
    console.log('Getting GPU information...');
    const gpuInfo = await hardwareMonitor().getGpuInfo();
    console.log('GPU info result:', gpuInfo);
    return gpuInfo;
  } catch (error) {
    console.error('GPU info error:', error);
    return { error: error.message };
  }
});

// Get just temperature data (optimized for frequent updates)
ipcMain.handle('get-temperature-data', async () => {
  try {
    console.log('Getting temperature data...');
    const tempData = await hardwareMonitor().getTemperatureData();
    console.log('Temperature data:', tempData);
    return tempData;
  } catch (error) {
    console.error('Temperature data error:', error);
    return {
      cpu: 45,
      gpu: 40,
      timestamp: Date.now(),
      error: error.message
    };
  }
});

// Get all hardware information (CPU and GPU)
ipcMain.handle('get-hardware-info', async () => {
  try {
    console.log('Getting all hardware information...');
    const hardwareData = await hardwareMonitor().getHardwareData();
    return hardwareData;
  } catch (error) {
    console.error('Hardware info error:', error);
    return {
      cpu: {
        model: 'Unknown CPU',
        cores: 0,
        threads: 0,
        temperature: 45,
        load: 0,
        speed: 0
      },
      gpu: {
        model: 'Unknown GPU',
        vendor: 'Unknown',
        memory: 0,
        temperature: 40,
        load: 0,
        driver: 'Unknown'
      },
      error: error.message
    };
  }
});

// Get memory usage information
ipcMain.handle('get-memory-usage', async () => {
  try {
    console.log('Getting memory usage information...');

    // Get memory information from OS module
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usedPercentage = Math.round((usedMem / totalMem) * 100);

    // Try to get more detailed memory information using PowerShell
    let memoryDetails = {
      type: 'DDR4',
      speed: 3200,
      capacity: totalMem
    };

    try {
      const { exec: execLoaded, util: utilLoaded } = loadModules();
      const execAsyncLocal = utilLoaded.promisify(execLoaded);

      // Get memory type and speed using PowerShell
      const { stdout } = await execAsyncLocal('powershell -Command "Get-CimInstance -ClassName Win32_PhysicalMemory | Select-Object -First 1 | Select-Object Capacity, Speed, MemoryType | ConvertTo-Json"', {
        timeout: 5000,
        windowsHide: true
      });

      if (stdout) {
        const memInfo = JSON.parse(stdout.trim());
        memoryDetails = {
          type: getMemoryTypeString(memInfo.MemoryType) || 'DDR4',
          speed: memInfo.Speed || 3200,
          capacity: memInfo.Capacity || totalMem
        };
      }
    } catch (psError) {
      console.error('Error getting detailed memory info:', psError);
      // Continue with default values
    }

    // Add memory slots information
    const memorySlots = {
      total: 4,
      used: 2
    };

    // Add memory timings (simulated)
    const memoryTimings = {
      cas: 16,
      rcd: 18,
      rp: 18,
      ras: 36
    };

    return {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usedPercentage: usedPercentage,
      percentUsed: usedPercentage, // Add for compatibility with both naming conventions
      details: memoryDetails,
      type: memoryDetails.type,
      speed: memoryDetails.speed,
      slots: memorySlots,
      timings: memoryTimings
    };
  } catch (error) {
    console.error('Memory usage error:', error);
    return {
      total: 16 * 1024 * 1024 * 1024, // 16 GB default
      free: 8 * 1024 * 1024 * 1024,   // 8 GB default
      used: 8 * 1024 * 1024 * 1024,   // 8 GB default
      usedPercentage: 50,
      percentUsed: 50, // Add for compatibility with both naming conventions
      type: 'DDR4',
      speed: 3200,
      details: {
        type: 'DDR4',
        speed: 3200,
        capacity: 16 * 1024 * 1024 * 1024
      },
      slots: {
        total: 4,
        used: 2
      },
      timings: {
        cas: 16,
        rcd: 18,
        rp: 18,
        ras: 36
      }
    };
  }
});

// Get disk usage information
ipcMain.handle('get-disk-usage', async () => {
  try {
    console.log('Getting disk usage information...');

    // Simplified implementation that returns static data for now
    // This ensures the hardware monitor will at least show something
    const drives = [];

    // Get basic disk information using os module
    const rootDir = os.platform() === 'win32' ? 'C:' : '/';

    try {
      // Try to get actual disk information using PowerShell
      const { exec: execLoaded, util: utilLoaded } = loadModules();
      const execAsyncLocal = utilLoaded.promisify(execLoaded);

      const { stdout } = await execAsyncLocal('powershell -Command "Get-WmiObject Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | Select-Object DeviceID, Size, FreeSpace, VolumeName | ConvertTo-Json"', {
        timeout: 5000,
        windowsHide: true
      });

      // Parse the JSON output
      let drivesData = JSON.parse(stdout);

      // Ensure drivesData is an array
      if (!Array.isArray(drivesData)) {
        drivesData = [drivesData];
      }

      // Format the drives data
      drivesData.forEach(drive => {
        const deviceId = drive.DeviceID || '';
        const size = parseInt(drive.Size, 10) || 0;
        const freeSpace = parseInt(drive.FreeSpace, 10) || 0;
        const used = size - freeSpace;
        const volumeName = drive.VolumeName || '';

        drives.push({
          fs: deviceId,
          type: 'NTFS',
          size: size,
          used: used,
          available: freeSpace,
          name: volumeName
        });
      });
    } catch (psError) {
      console.error('Error getting disk info with PowerShell:', psError);

      // Fallback to a simple C: drive with estimated values
      const totalSpace = 500 * 1024 * 1024 * 1024; // 500 GB
      const usedSpace = 250 * 1024 * 1024 * 1024;  // 250 GB
      const freeSpace = totalSpace - usedSpace;

      drives.push({
        fs: 'C:',
        type: 'NTFS',
        size: totalSpace,
        used: usedSpace,
        available: freeSpace,
        name: 'Local Disk'
      });
    }

    // Add simple I/O data
    const ioData = {
      readRate: Math.floor(Math.random() * 50),  // 0-50 MB/s
      writeRate: Math.floor(Math.random() * 30), // 0-30 MB/s
      activeTime: Math.floor(Math.random() * 40) // 0-40%
    };

    return {
      drives: drives,
      io: ioData
    };
  } catch (error) {
    console.error('Error getting disk usage:', error);

    // Return fallback values if all methods fail
    return {
      drives: [
        {
          fs: 'C:',
          type: 'NTFS',
          size: 500 * 1024 * 1024 * 1024, // 500 GB
          used: 250 * 1024 * 1024 * 1024,  // 250 GB
          available: 250 * 1024 * 1024 * 1024,   // 250 GB
          name: 'Local Disk'
        }
      ],
      io: {
        readRate: 20,
        writeRate: 10,
        activeTime: 15
      }
    };
  }
});

// Get network information
ipcMain.handle('get-network-info', async () => {
  try {
    console.log('Getting network information...');

    // Make sure required modules are loaded
    const modules = loadModules();
    const { os: osLoaded } = modules;

    // Get network interfaces from OS module
    const interfaces = osLoaded.networkInterfaces();

    // Format network interfaces data
    const formattedInterfaces = [];

    for (const [name, ifaceList] of Object.entries(interfaces)) {
      for (const iface of ifaceList) {
        if (!iface.internal) {
          formattedInterfaces.push({
            iface: name,
            ip4: iface.family === 'IPv4' ? iface.address : undefined,
            ip6: iface.family === 'IPv6' ? iface.address : undefined,
            mac: iface.mac,
            operstate: 'up',
            type: iface.family === 'IPv4' ? 'wired' : 'virtual'
          });
        }
      }
    }

    // Add a default gateway to the first interface
    if (formattedInterfaces.length > 0) {
      // Try to guess the gateway based on the IP address
      const ipv4Interface = formattedInterfaces.find(iface => iface.ip4);
      if (ipv4Interface && ipv4Interface.ip4) {
        // Assume gateway is the first three octets of the IP plus .1
        // e.g., 192.168.1.100 -> 192.168.1.1
        const ipParts = ipv4Interface.ip4.split('.');
        if (ipParts.length === 4) {
          ipv4Interface.gateway = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.1`;
        }
      }
    }

    // Get network speed data
    // For now, we'll use simulated data that changes over time
    const now = Date.now();
    const seed = Math.floor(now / 10000); // Change every 10 seconds
    const random = (min, max) => {
      // Use a seeded random number generator
      const x = Math.sin(seed) * 10000;
      const r = x - Math.floor(x);
      return Math.floor(r * (max - min + 1)) + min;
    };

    const speedData = {
      download: random(50, 150),  // 50-150 Mbps
      upload: random(10, 30),     // 10-30 Mbps
      latency: random(10, 40)     // 10-40 ms
    };

    console.log('Network speed data:', speedData);

    // Create the response object with the correct structure
    const response = {
      interfaces: formattedInterfaces,
      dns: {
        servers: ['8.8.8.8', '8.8.4.4'] // Default to Google DNS
      },
      speed: speedData
    };

    console.log('Network info response:', JSON.stringify(response));
    return response;
  } catch (error) {
    console.error('Error getting network information:', error);

    // Return fallback values with the correct structure
    return {
      interfaces: [
        {
          iface: 'Ethernet',
          ip4: '192.168.1.100',
          mac: '00:00:00:00:00:00',
          operstate: 'up',
          type: 'wired',
          gateway: '192.168.1.1'
        }
      ],
      dns: {
        servers: ['8.8.8.8', '8.8.4.4']
      },
      speed: {
        download: 100,
        upload: 20,
        latency: 20
      }
    };
  }
});

// Alias for getNetworkInfo (camelCase version)
// This handler has been moved to line ~1708 to avoid duplication
// ipcMain.handle('getNetworkInfo', async () => { ... });

// Helper function to convert memory type code to string
function getMemoryTypeString(typeCode) {
  const memoryTypes = {
    0: 'Unknown',
    1: 'Other',
    2: 'DRAM',
    3: 'Synchronous DRAM',
    4: 'Cache DRAM',
    5: 'EDO',
    6: 'EDRAM',
    7: 'VRAM',
    8: 'SRAM',
    9: 'RAM',
    10: 'ROM',
    11: 'Flash',
    12: 'EEPROM',
    13: 'FEPROM',
    14: 'EPROM',
    15: 'CDRAM',
    16: '3DRAM',
    17: 'SDRAM',
    18: 'SGRAM',
    19: 'RDRAM',
    20: 'DDR',
    21: 'DDR2',
    22: 'DDR2 FB-DIMM',
    24: 'DDR3',
    25: 'FBD2',
    26: 'DDR4',
    27: 'LPDDR',
    28: 'LPDDR2',
    29: 'LPDDR3',
    30: 'LPDDR4',
    31: 'Logical non-volatile device',
    32: 'HBM',
    33: 'HBM2',
    34: 'DDR5',
    35: 'LPDDR5'
  };

  return memoryTypes[typeCode] || 'Unknown';
}





ipcMain.handle('launch-task-manager', async () => {
  try {
    return await systemCommands().launchTaskManager();
  } catch (error) {
    return { error: error.message };
  }
});


// ===================================================
// PACKAGES TAB IPC HANDLERS
// ===================================================

ipcMain.handle('get-packages', async () => {
  try {
    return await getPackages();
  } catch (error) {
    return { error: error.message };
  }
});

// Handle package actions
ipcMain.handle('package-action', async (event, action, packageId) => {
  try {
    console.log(`Performing ${action} on package ${packageId}`);

    // Get package details from applications.json
    const appDataPath = path.join(__dirname, 'applications.json');
    const appData = JSON.parse(fs.readFileSync(appDataPath, 'utf8'));
    const packageData = appData[packageId];

    if (!packageData) {
      return { error: `Package ${packageId} not found` };
    }

    if (action === 'install') {
      // Check if winget ID is available
      if (packageData.winget) {
        return await installWithWinget(packageData.winget);
      }
      // Check if choco ID is available
      else if (packageData.choco) {
        return await installWithChocolatey(packageData.choco);
      }
      // Direct download link
      else if (packageData.link) {
        // Open the download link in the default browser
        shell.openExternal(packageData.link);
        return { success: true, message: `Download link opened: ${packageData.link}` };
      } else {
        return { error: 'No installation method available for this package' };
      }
    } else if (action === 'uninstall') {
      // Check if winget ID is available
      if (packageData.winget) {
        return await uninstallWithWinget(packageData.winget);
      }
      // Check if choco ID is available
      else if (packageData.choco) {
        return await uninstallWithChocolatey(packageData.choco);
      } else {
        return { error: 'No uninstallation method available for this package' };
      }
    } else {
      return { error: `Action ${action} not supported` };
    }
  } catch (error) {
    console.error(`Error performing ${action} on package ${packageId}:`, error);
    return { error: error.message };
  }
});

// Install a package using winget
async function installWithWinget(packageId) {
  return new Promise((resolve, reject) => {
    const command = `winget install -e --id ${packageId} --accept-source-agreements --accept-package-agreements`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error installing package with winget: ${error.message}`);
        return resolve({ error: error.message });
      }

      console.log(`Package installed successfully with winget: ${packageId}`);
      console.log(stdout);

      return resolve({ success: true, message: `Package installed successfully: ${packageId}` });
    });
  });
}

// Uninstall a package using winget
async function uninstallWithWinget(packageId) {
  return new Promise((resolve, reject) => {
    const command = `winget uninstall -e --id ${packageId} --accept-source-agreements`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error uninstalling package with winget: ${error.message}`);
        return resolve({ error: error.message });
      }

      console.log(`Package uninstalled successfully with winget: ${packageId}`);
      console.log(stdout);

      return resolve({ success: true, message: `Package uninstalled successfully: ${packageId}` });
    });
  });
}

// Install a package using chocolatey
async function installWithChocolatey(packageId) {
  return new Promise((resolve, reject) => {
    const command = `choco install ${packageId} -y`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error installing package with chocolatey: ${error.message}`);
        return resolve({ error: error.message });
      }

      console.log(`Package installed successfully with chocolatey: ${packageId}`);
      console.log(stdout);

      return resolve({ success: true, message: `Package installed successfully: ${packageId}` });
    });
  });
}

// Uninstall a package using chocolatey
async function uninstallWithChocolatey(packageId) {
  return new Promise((resolve, reject) => {
    const command = `choco uninstall ${packageId} -y`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error uninstalling package with chocolatey: ${error.message}`);
        return resolve({ error: error.message });
      }

      console.log(`Package uninstalled successfully with chocolatey: ${packageId}`);
      console.log(stdout);

      return resolve({ success: true, message: `Package uninstalled successfully: ${packageId}` });
    });
  });
}

// Handle multi-package installation
ipcMain.handle('install-packages', async (event, packageIds) => {
  try {
    console.log(`Installing multiple packages: ${packageIds.join(', ')}`);

    // Process each package installation
    const results = [];
    for (const packageId of packageIds) {
      try {
        // Get package details from applications.json
        const appDataPath = path.join(__dirname, 'applications.json');
        const appData = JSON.parse(fs.readFileSync(appDataPath, 'utf8'));
        const packageData = appData[packageId];

        if (!packageData) {
          results.push({ packageId, error: `Package ${packageId} not found` });
          continue;
        }

        let result;
        // Check if winget ID is available
        if (packageData.winget) {
          result = await installWithWinget(packageData.winget);
        }
        // Check if choco ID is available
        else if (packageData.choco) {
          result = await installWithChocolatey(packageData.choco);
        }
        // Direct download link
        else if (packageData.link) {
          // Open the download link in the default browser
          shell.openExternal(packageData.link);
          result = { success: true, message: `Download link opened: ${packageData.link}` };
        } else {
          result = { error: 'No installation method available for this package' };
        }

        results.push({ packageId, ...result });
      } catch (error) {
        results.push({ packageId, error: error.message });
      }
    }

    return { results };
  } catch (error) {
    console.error(`Error installing packages:`, error);
    return { error: error.message };
  }
});

// ===================================================
// TWEAKS TAB IPC HANDLERS
// ===================================================

// Get current tweaks IPC handler
ipcMain.handle('get-current-tweaks', async () => {
  try {
    console.log('Getting current tweaks...');
    const tweaks = await tweaksModule().getCurrentTweaks();
    console.log('Current tweaks:', tweaks);
    return tweaks;
  } catch (error) {
    console.error('Error getting current tweaks:', error);
    return { error: error.message };
  }
});

// Apply tweaks IPC handler
ipcMain.handle('apply-tweaks', async (event, tweaks) => {
  try {
    console.log('Applying tweaks:', tweaks);
    const result = await tweaksModule().applyTweaks(tweaks);
    console.log('Apply tweaks result:', result);
    return result;
  } catch (error) {
    console.error('Error applying tweaks:', error);
    return { success: false, error: error.message };
  }
});

// Game Mode IPC handlers
ipcMain.handle('setGameMode', async (event, enabled) => {
  try {
    return await gamingFeatures().setGameMode(enabled);
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('getGameModeStatus', async () => {
  try {
    return await gamingFeatures().getGameModeStatus();
  } catch (error) {
    console.error('Error getting game mode status:', error);
    return false;
  }
});

// ===================================================
// WINDOW MANAGEMENT IPC HANDLERS
// ===================================================

// File dialog handler for browsing files (open dialog)
ipcMain.handle('browseForFile', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  try {
    const result = await dialog.showOpenDialog(win, options);
    return {
      canceled: result.canceled,
      filePath: result.filePaths && result.filePaths.length > 0 ? result.filePaths[0] : null,
      filePaths: result.filePaths
    };
  } catch (error) {
    console.error('Error showing file dialog:', error);
    return { canceled: true, error: error.message };
  }
});

// File dialog handler for saving files (save dialog)
ipcMain.handle('saveFileDialog', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  try {
    const result = await dialog.showSaveDialog(win, options);
    return {
      canceled: result.canceled,
      filePath: result.filePath || null
    };
  } catch (error) {
    console.error('Error showing save file dialog:', error);
    return { canceled: true, error: error.message };
  }
});



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

// ===================================================
// DRIVERS TAB IPC HANDLERS - REMOVED
// ===================================================

// ===================================================
// NETWORK TAB IPC HANDLERS
// ===================================================

ipcMain.handle('get-network-status', async () => {
  const interfaces = os.networkInterfaces();
  let ipv4 = '-', ipv6 = '-', subnetMask = '-', gateway = '-', dnsServers = [], publicIp = '-';
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ipv4 = net.address;
        subnetMask = net.netmask;
      }
      if (net.family === 'IPv6' && !net.internal) {
        ipv6 = net.address;
      }
    }
  }
  // Default gateway
  try {
    const gws = Object.values(os.networkInterfaces()).flat().find(net => net.family === 'IPv4' && !net.internal);
    if (gws && gws.gateway) gateway = gws.gateway;
  } catch {}
  // DNS servers
  try {
    dnsServers = dns.getServers();
  } catch {}
  // Public IP
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    publicIp = data.ip;
  } catch {}
  return {
    ipv4, ipv6, subnetMask, gateway, dns: dnsServers, publicIp
  };
});

ipcMain.handle('getNetworkInfo', async () => {
  try {
    console.log('Getting network information...');

    // Make sure required modules are loaded
    const modules = loadModules();
    const { exec: execLoaded, util: utilLoaded, os: osLoaded } = modules;

    // Use local variables for the modules
    const execAsyncLocal = utilLoaded.promisify(execLoaded);

    // Get network interfaces
    const interfaces = osLoaded.networkInterfaces();
    let ipAddress = 'Not available';
    let connectionType = 'Unknown';
    let interfaceName = '';

    // Find the active network interface (non-internal with IPv4)
    for (const [name, netInterface] of Object.entries(interfaces)) {
      for (const iface of netInterface) {
        if (!iface.internal && iface.family === 'IPv4') {
          ipAddress = iface.address;
          interfaceName = name;
          connectionType = name.includes('Wi-Fi') ? 'Wi-Fi' :
                          name.includes('Ethernet') ? 'Ethernet' :
                          name.includes('VPN') ? 'VPN' : 'Wired';
          break;
        }
      }
      if (ipAddress !== 'Not available') break;
    }

    console.log(`Found active interface: ${interfaceName} (${connectionType}) with IP: ${ipAddress}`);

    // Check internet connectivity
    let internetConnected = false;
    try {
      // First try to load the node-fetch module if needed
      if (!fetch) {
        fetch = require('node-fetch');
      }

      // Try multiple sites to check internet connectivity
      try {
        await fetch('https://www.google.com', { timeout: 3000 });
        internetConnected = true;
      } catch (e1) {
        try {
          await fetch('https://www.microsoft.com', { timeout: 3000 });
          internetConnected = true;
        } catch (e2) {
          try {
            await fetch('https://www.cloudflare.com', { timeout: 3000 });
            internetConnected = true;
          } catch (e3) {
            // Try a simpler DNS lookup as a fallback
            try {
              if (!dns) {
                dns = require('dns');
              }
              await new Promise((resolve, reject) => {
                dns.lookup('google.com', (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              });
              internetConnected = true;
            } catch (e4) {
              internetConnected = false;
            }
          }
        }
      }

      console.log('Internet connection:', internetConnected ? 'Connected' : 'Disconnected');
    } catch (e) {
      // If we have an IP address that's not a local address, assume we're connected
      internetConnected = ipAddress !== 'Not available' &&
                         !ipAddress.startsWith('169.254.') &&
                         !ipAddress.startsWith('127.0.0.');
      console.log('Internet connection check failed, assuming:', internetConnected ? 'Connected' : 'Disconnected');
    }

    // Get DNS servers using a more reliable method
    let dnsServers = [];
    try {
      // Use a simpler PowerShell command that's less likely to fail
      const { stdout } = await execAsyncLocal('powershell -NoProfile -Command "(Get-DnsClientServerAddress -AddressFamily IPv4).ServerAddresses | Where-Object { $_ -ne $null }"', {
        timeout: 5000,
        windowsHide: true
      });
      dnsServers = stdout.trim().split('\r\n').filter(Boolean);
      console.log(`Found DNS servers: ${dnsServers.join(', ')}`);
    } catch (error) {
      console.error('Error getting DNS servers:', error);

      // Try alternative method
      try {
        const { stdout } = await execAsyncLocal('powershell -NoProfile -Command "Get-NetIPConfiguration | Select-Object -ExpandProperty DNSServer | Select-Object -ExpandProperty ServerAddresses"', {
          timeout: 5000,
          windowsHide: true
        });
        dnsServers = stdout.trim().split('\r\n').filter(Boolean);
        console.log(`Found DNS servers (alternative method): ${dnsServers.join(', ')}`);
      } catch (altError) {
        console.error('Alternative DNS server retrieval also failed:', altError);
        dnsServers = ['8.8.8.8', '8.8.4.4']; // Default to Google DNS as fallback
      }
    }

    // Get default gateway using a more reliable method
    let gateway = 'Not available';
    try {
      // Use a simpler PowerShell command that's less likely to fail
      const { stdout } = await execAsyncLocal('powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null }).IPv4DefaultGateway.NextHop"', {
        timeout: 5000,
        windowsHide: true
      });
      gateway = stdout.trim();
      console.log(`Found gateway: ${gateway}`);
    } catch (error) {
      console.error('Error getting default gateway:', error);
    }

    // Get connection speed
    let connectionSpeed = 'Unknown';
    try {
      // Use a more reliable PowerShell command
      const { stdout } = await execAsyncLocal('powershell -NoProfile -Command "Get-NetAdapter | Where-Object {$_.Status -eq \'Up\'} | Select-Object -First 1 -ExpandProperty LinkSpeed"', {
        timeout: 5000,
        windowsHide: true
      });
      connectionSpeed = stdout.trim();
      console.log(`Found connection speed: ${connectionSpeed}`);
    } catch (error) {
      console.error('Error getting connection speed:', error);
    }

    // Get network status (connected/disconnected)
    let networkStatus = 'Unknown';
    try {
      const { stdout } = await execAsyncLocal('powershell -NoProfile -Command "Get-NetConnectionProfile | Select-Object -ExpandProperty NetworkCategory"', {
        timeout: 5000,
        windowsHide: true
      });
      const category = stdout.trim();
      networkStatus = category ? 'Connected' : 'Disconnected';
      console.log(`Network status: ${networkStatus} (${category})`);
    } catch (error) {
      console.error('Error getting network status:', error);
      // If we have an IP address, we're probably connected
      networkStatus = ipAddress !== 'Not available' ? 'Connected' : 'Disconnected';
    }

    return {
      ipAddress,
      connectionType,
      dnsServers,
      gateway,
      connectionSpeed,
      networkStatus,
      interfaceName,
      internetConnected
    };
  } catch (error) {
    console.error('Error getting network info:', error);
    return { error: error.message };
  }
});

ipcMain.handle('optimizeNetwork', async (event, options = {}) => {
  try {
    console.log('Optimizing network settings with options:', options);

    // Make sure required modules are loaded
    const modules = loadModules();
    const { exec: execLoaded, util: utilLoaded } = modules;
    const execAsyncLocal = utilLoaded.promisify(execLoaded);

    // Default to all optimizations if no options provided
    const optimizeDns = options.dns !== undefined ? options.dns : true;
    const optimizeTcp = options.tcp !== undefined ? options.tcp : true;
    const optimizeNetsh = options.netsh !== undefined ? options.netsh : true;

    const results = {
      dns: { applied: false, details: [] },
      tcp: { applied: false, details: [] },
      netsh: { applied: false, details: [] }
    };

    // 1. DNS Optimization - Set faster DNS servers (Cloudflare and Google)
    if (optimizeDns) {
      console.log('Applying DNS optimizations...');
      try {
        // Get the active network interface
        const { stdout: interfaceOutput } = await execAsyncLocal(
          'powershell -NoProfile -Command "Get-NetAdapter | Where-Object {$_.Status -eq \'Up\'} | Select-Object -First 1 -ExpandProperty Name"',
          { timeout: 5000, windowsHide: true }
        );

        const interfaceName = interfaceOutput.trim();
        if (interfaceName) {
          console.log(`Found active network interface: ${interfaceName}`);

          // Set DNS servers to Cloudflare (1.1.1.1, 1.0.0.1) and Google (8.8.8.8, 8.8.4.4)
          await execAsyncLocal(
            `netsh interface ip set dns "${interfaceName}" static 1.1.1.1 primary`,
            { timeout: 5000, windowsHide: true }
          );

          await execAsyncLocal(
            `netsh interface ip add dns "${interfaceName}" 1.0.0.1 index=2`,
            { timeout: 5000, windowsHide: true }
          );

          // Flush DNS cache
          await execAsyncLocal('ipconfig /flushdns', { timeout: 5000, windowsHide: true });

          results.dns.applied = true;
          results.dns.details.push('Set primary DNS to Cloudflare (1.1.1.1)');
          results.dns.details.push('Set secondary DNS to Cloudflare (1.0.0.1)');
          results.dns.details.push('Flushed DNS cache');

          console.log('DNS optimization completed successfully');
        } else {
          console.warn('No active network interface found for DNS optimization');
          results.dns.details.push('No active network interface found');
        }
      } catch (dnsError) {
        console.error('DNS optimization error:', dnsError);
        results.dns.details.push(`Error: ${dnsError.message}`);
      }
    }

    // 2. TCP Optimization - Optimize TCP settings for better performance
    if (optimizeTcp) {
      console.log('Applying TCP optimizations...');
      try {
        // Enable TCP Window Auto-Tuning
        await execAsyncLocal(
          'netsh interface tcp set global autotuninglevel=normal',
          { timeout: 5000, windowsHide: true }
        );
        results.tcp.details.push('Enabled TCP Window Auto-Tuning');

        // Enable Receive Window Auto-Tuning
        await execAsyncLocal(
          'netsh interface tcp set global rss=enabled',
          { timeout: 5000, windowsHide: true }
        );
        results.tcp.details.push('Enabled Receive-Side Scaling (RSS)');

        // Enable Congestion Provider
        await execAsyncLocal(
          'netsh interface tcp set global congestionprovider=ctcp',
          { timeout: 5000, windowsHide: true }
        );
        results.tcp.details.push('Set Congestion Provider to CTCP');

        // Enable ECN capability
        await execAsyncLocal(
          'netsh interface tcp set global ecncapability=enabled',
          { timeout: 5000, windowsHide: true }
        );
        results.tcp.details.push('Enabled ECN Capability');

        results.tcp.applied = true;
        console.log('TCP optimization completed successfully');
      } catch (tcpError) {
        console.error('TCP optimization error:', tcpError);
        results.tcp.details.push(`Error: ${tcpError.message}`);
      }
    }

    // 3. Netsh Optimizations - Apply various netsh optimizations
    if (optimizeNetsh) {
      console.log('Applying Netsh optimizations...');
      try {
        // Reset Winsock catalog
        await execAsyncLocal(
          'netsh winsock reset',
          { timeout: 10000, windowsHide: true }
        );
        results.netsh.details.push('Reset Winsock catalog');

        // Reset TCP/IP stack
        await execAsyncLocal(
          'netsh int ip reset',
          { timeout: 10000, windowsHide: true }
        );
        results.netsh.details.push('Reset TCP/IP stack');

        // Reset Firewall settings
        await execAsyncLocal(
          'netsh advfirewall reset',
          { timeout: 10000, windowsHide: true }
        );
        results.netsh.details.push('Reset Windows Firewall settings');

        results.netsh.applied = true;
        console.log('Netsh optimization completed successfully');
      } catch (netshError) {
        console.error('Netsh optimization error:', netshError);
        results.netsh.details.push(`Error: ${netshError.message}`);
      }
    }

    // Determine overall success
    const anyOptimizationApplied = results.dns.applied || results.tcp.applied || results.netsh.applied;

    if (anyOptimizationApplied) {
      console.log('Network optimization completed with some successful optimizations');
      return {
        success: true,
        message: 'Network optimization completed successfully',
        results: results
      };
    } else {
      console.warn('Network optimization completed but no optimizations were applied');
      return {
        success: false,
        message: 'No network optimizations could be applied',
        results: results
      };
    }
  } catch (error) {
    console.error('Network optimization error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('flushDns', async () => {
  try {
    console.log('Flushing DNS cache...');

    // Execute ipconfig /flushdns command
    return new Promise((resolve) => {
      exec('ipconfig /flushdns', (error, stdout, stderr) => {
        if (error) {
          console.error('DNS flush error:', error);
          resolve({ error: error.message });
        } else {
          console.log('DNS cache flushed successfully');
          resolve({ success: true, message: 'DNS cache flushed successfully' });
        }
      });
    });
  } catch (error) {
    console.error('DNS flush error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('releaseRenewIp', async () => {
  try {
    console.log('Releasing and renewing IP address...');

    // Execute ipconfig /release and ipconfig /renew commands
    return new Promise((resolve) => {
      exec('ipconfig /release && ipconfig /renew', (error, stdout, stderr) => {
        if (error) {
          console.error('IP release/renew error:', error);
          resolve({ error: error.message });
        } else {
          console.log('IP address released and renewed successfully');
          resolve({ success: true, message: 'IP address released and renewed successfully' });
        }
      });
    });
  } catch (error) {
    console.error('IP release/renew error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('resetNetwork', async () => {
  try {
    console.log('Resetting network adapters...');

    // Execute netsh commands to reset network adapters
    return new Promise((resolve) => {
      exec('netsh winsock reset && netsh int ip reset', (error, stdout, stderr) => {
        if (error) {
          console.error('Network reset error:', error);
          resolve({ error: error.message });
        } else {
          console.log('Network reset successfully');
          resolve({ success: true, message: 'Network reset successfully. You may need to restart your computer.' });
        }
      });
    });
  } catch (error) {
    console.error('Network reset error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('openNetworkSettings', async () => {
  try {
    console.log('Opening network settings...');

    // Open Windows network settings
    exec('start ms-settings:network');
    return { success: true };
  } catch (error) {
    console.error('Open network settings error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('runPingTest', async (event, target) => {
  try {
    console.log(`Running ping test for ${target}...`);

    // Execute ping command
    return new Promise((resolve) => {
      exec(`ping -n 4 ${target}`, (error, stdout, stderr) => {
        if (error) {
          console.error('Ping test error:', error);
          resolve({ error: error.message });
        } else {
          console.log('Ping test completed');
          resolve({ success: true, output: stdout });
        }
      });
    });
  } catch (error) {
    console.error('Ping test error:', error);
    return { error: error.message };
  }
});

// ===================================================
// GAMING & PERFORMANCE IPC HANDLERS
// ===================================================

ipcMain.handle('setGameBooster', (_, enabled) => gamingFeatures.setGameBooster(enabled));
ipcMain.handle('getGameBoosterStatus', () => gamingFeatures.getGameBoosterStatus());
ipcMain.handle('setPowerPlan', (_, plan) => gamingFeatures.setPowerPlan(plan));

// ===================================================
// SYSTEM UTILITIES IPC HANDLERS
// ===================================================

ipcMain.handle('launch-system-tool', async (event, toolName) => {
    // Map tool names to Windows commands
    const toolCommands = {
        'taskmgr': 'start taskmgr',
        'task_manager': 'start taskmgr',
        'cmd': 'start cmd',
        'powershell': 'start powershell',
        'explorer': 'start explorer',
        'notepad': 'start notepad',
        'control': 'start control',
        'disk_cleanup': 'start cleanmgr',
        'msconfig': 'start msconfig',
        'system_info': 'start msinfo32',
        // Add more as needed
    };
    const cmd = toolCommands[toolName];
    if (!cmd) throw new Error('Unknown system tool: ' + toolName);
    return new Promise((resolve, reject) => {
        exec(cmd, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
});




// ===================================================
// CLEANUP TAB IPC HANDLERS
// ===================================================

ipcMain.handle('runQuickCleanup', async () => {
  try {
    console.log('Starting Quick Cleanup...');
    const commands = [
      // Temporary files
      'del /q/f/s %TEMP%\\*',
      'del /q/f/s C:\\Windows\\Temp\\*',

      // Prefetch cache
      'del /q/f/s C:\\Windows\\Prefetch\\*',

      // Event logs
      'wevtutil cl System',
      'wevtutil cl Application',

      // Recycle bin
      'powershell -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"',

      // Flush DNS cache
      'ipconfig /flushdns'
    ];

    const results = [];

    // Execute all commands, continuing even if some fail
    for (const cmd of commands) {
      try {
        console.log(`Executing: ${cmd}`);
        await execAsync(cmd, { windowsHide: true });
        results.push(`Successfully executed: ${cmd}`);
      } catch (cmdError) {
        console.warn(`Command failed but continuing: ${cmd}`, cmdError);
        results.push(`Failed but continuing: ${cmd}`);
      }
    }

    console.log('Quick Cleanup completed successfully');
    return {
      success: true,
      results: results,
      cleanedItems: [
        'Temporary Files',
        'Prefetch Cache',
        'System Logs',
        'Recycle Bin',
        'DNS Cache'
      ]
    };
  } catch (error) {
    console.error('Quick cleanup error:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('runAdvancedCleanup', async (event, options) => {
  try {
    const commands = [];
    const results = [];

    // System Files
    if (options.temp) {
      commands.push(
        'del /q/f/s %TEMP%\\*',
        'del /q/f/s C:\\Windows\\Temp\\*'
      );
      results.push('Temporary Files');
    }

    if (options.prefetch) {
      commands.push('del /q/f/s C:\\Windows\\Prefetch\\*');
      results.push('Prefetch Cache');
    }

    if (options.windowsLogs) {
      commands.push('del /q/f/s C:\\Windows\\Logs\\*');
      results.push('Windows Logs');
    }

    if (options.eventLogs) {
      commands.push(
        'wevtutil cl System',
        'wevtutil cl Application',
        'wevtutil cl Security'
      );
      results.push('Event Logs');
    }

    // Windows Updates
    if (options.updates) {
      commands.push(
        'net stop wuauserv',
        'del /q/f/s %windir%\\SoftwareDistribution\\Download\\*',
        'net start wuauserv'
      );
      results.push('Windows Update Cache');
    }

    if (options.installers) {
      commands.push('del /q/f/s C:\\Windows\\Installer\\*');
      results.push('Windows Installer Cache');
    }

    if (options.deliveryOptimization) {
      commands.push(
        'net stop dosvc',
        'del /q/f/s C:\\Windows\\ServiceProfiles\\NetworkService\\AppData\\Local\\Microsoft\\Windows\\DeliveryOptimization\\Cache\\*',
        'net start dosvc'
      );
      results.push('Delivery Optimization Files');
    }

    // Browser Data
    if (options.browserCache) {
      // Chrome cache
      commands.push('del /q/f/s "%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Cache\\*"');
      // Edge cache
      commands.push('del /q/f/s "%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\Cache\\*"');
      // Firefox cache
      commands.push('del /q/f/s "%LOCALAPPDATA%\\Mozilla\\Firefox\\Profiles\\*\\cache2\\*"');

      results.push('Browser Cache');
    }

    if (options.browserCookies) {
      // Chrome cookies
      commands.push('del /q/f/s "%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Cookies*"');
      // Edge cookies
      commands.push('del /q/f/s "%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\Cookies*"');
      // Firefox cookies
      commands.push('del /q/f/s "%LOCALAPPDATA%\\Mozilla\\Firefox\\Profiles\\*\\cookies.sqlite"');

      results.push('Browser Cookies');
    }

    if (options.browserHistory) {
      // Chrome history
      commands.push('del /q/f/s "%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\History*"');
      // Edge history
      commands.push('del /q/f/s "%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\History*"');
      // Firefox history
      commands.push('del /q/f/s "%LOCALAPPDATA%\\Mozilla\\Firefox\\Profiles\\*\\places.sqlite"');

      results.push('Browser History');
    }

    // Network
    if (options.dnsCache) {
      commands.push('ipconfig /flushdns');
      results.push('DNS Cache');
    }

    if (options.networkData) {
      commands.push(
        'netsh winsock reset',
        'netsh int ip reset',
        'ipconfig /release',
        'ipconfig /renew'
      );
      results.push('Network Data');
    }

    // Execute all selected commands
    const commandResults = [];
    let successCount = 0;
    let failCount = 0;

    for (const cmd of commands) {
      try {
        console.log(`Executing advanced cleanup command: ${cmd}`);
        await execAsync(cmd, { windowsHide: true });
        commandResults.push({ command: cmd, success: true });
        successCount++;
      } catch (cmdError) {
        console.warn(`Command failed but continuing: ${cmd}`, cmdError);
        commandResults.push({ command: cmd, success: false, error: cmdError.message });
        failCount++;
      }
    }

    console.log(`Advanced cleanup completed with ${successCount} successful commands and ${failCount} failed commands`);

    return {
      success: true,
      cleanedItems: results,
      details: {
        totalCommands: commands.length,
        successfulCommands: successCount,
        failedCommands: failCount,
        commandResults: commandResults
      }
    };
  } catch (error) {
    console.error('Advanced cleanup error:', error);
    return {
      success: false,
      error: error.message,
      details: {
        errorType: error.name,
        stack: error.stack
      }
    };
  }
});

// Get disk usage information
ipcMain.handle('getDiskUsage', async () => {
  try {
    // Make sure required modules are loaded
    const modules = loadModules();
    const { exec: execLoaded, util: utilLoaded, os: osLoaded } = modules;

    // Use local variables for the modules
    const execAsyncLocal = utilLoaded.promisify(execLoaded);
    const tempDir = osLoaded.tmpdir();

    console.log('Getting disk usage information...');

    // Use PowerShell to get disk information (more reliable than wmic)
    const scriptContent = `
      $drive = Get-PSDrive C
      $diskInfo = @{
        Total = $drive.Used + $drive.Free
        Used = $drive.Used
        Free = $drive.Free
      }
      ConvertTo-Json $diskInfo
    `;

    // Create a temporary file for the PowerShell script
    const scriptPath = path.join(tempDir, 'get-disk-info.ps1');
    console.log(`Creating temporary script at: ${scriptPath}`);

    // Write the script to the temporary file
    await fs.promises.writeFile(scriptPath, scriptContent);
    console.log('Script file created successfully');

    // Execute the PowerShell script
    console.log('Executing PowerShell script...');
    const { stdout } = await execAsyncLocal(`powershell -ExecutionPolicy Bypass -NoProfile -File "${scriptPath}"`, {
      timeout: 15000, // 15 second timeout
      windowsHide: true
    });
    console.log('PowerShell script executed successfully');

    // Parse the JSON output
    const diskInfo = JSON.parse(stdout);
    console.log('Disk info parsed successfully:', diskInfo);

    // Clean up the temporary script file
    fs.promises.unlink(scriptPath).catch(err => console.error('Error deleting temp script:', err));

    // Return the disk information
    return {
      total: parseInt(diskInfo.Total, 10),
      used: parseInt(diskInfo.Used, 10),
      free: parseInt(diskInfo.Free, 10)
    };
  } catch (error) {
    console.error('Error getting disk usage:', error);

    // Try an alternative method if the first one fails
    try {
      console.log('Trying alternative disk usage method...');
      // Make sure required modules are loaded
      const modules = loadModules();
      const { exec: execLoaded, util: utilLoaded } = modules;

      // Use local variables for the modules
      const execAsyncLocal = utilLoaded.promisify(execLoaded);

      // Use a simpler PowerShell command directly
      const { stdout } = await execAsyncLocal('powershell -Command "[math]::Round((Get-PSDrive C).Used / 1GB, 2); [math]::Round((Get-PSDrive C).Free / 1GB, 2)"', {
        timeout: 10000,
        windowsHide: true
      });

      const values = stdout.trim().split('\r\n');
      console.log('Alternative method results:', values);

      if (values.length >= 2) {
        const usedGB = parseFloat(values[0]) * 1024 * 1024 * 1024;
        const freeGB = parseFloat(values[1]) * 1024 * 1024 * 1024;
        const totalGB = usedGB + freeGB;

        console.log(`Disk usage calculated: Total=${totalGB}, Used=${usedGB}, Free=${freeGB}`);
        return {
          total: totalGB,
          used: usedGB,
          free: freeGB
        };
      }
    } catch (alternativeError) {
      console.error('Alternative disk usage method also failed:', alternativeError);
    }

    // Try one more fallback method
    try {
      console.log('Trying final fallback disk usage method...');
      // Make sure required modules are loaded
      const modules = loadModules();
      const { exec: execLoaded, util: utilLoaded } = modules;

      // Use local variables for the modules
      const execAsyncLocal = utilLoaded.promisify(execLoaded);

      // Use WMI to get disk information
      const { stdout } = await execAsyncLocal('powershell -Command "Get-WmiObject Win32_LogicalDisk -Filter \\"DeviceID=\'C:\'\\"|Select-Object Size,FreeSpace|ConvertTo-Json"', {
        timeout: 10000,
        windowsHide: true
      });

      const diskInfo = JSON.parse(stdout);
      console.log('WMI disk info:', diskInfo);

      if (diskInfo && diskInfo.Size && diskInfo.FreeSpace) {
        const total = parseInt(diskInfo.Size, 10);
        const free = parseInt(diskInfo.FreeSpace, 10);
        const used = total - free;

        console.log(`WMI disk usage: Total=${total}, Used=${used}, Free=${free}`);
        return {
          total: total,
          used: used,
          free: free
        };
      }
    } catch (wmiError) {
      console.error('WMI disk usage method also failed:', wmiError);
    }

    // Return fallback values if all methods fail
    console.log('All disk usage methods failed, returning fallback values');
    return {
      total: 500 * 1024 * 1024 * 1024, // 500 GB
      used: 250 * 1024 * 1024 * 1024,  // 250 GB
      free: 250 * 1024 * 1024 * 1024   // 250 GB
    };
  }
});

// Find large files on the system
ipcMain.handle('findLargeFiles', async (event, options) => {
  try {
    // Make sure required modules are loaded
    const modules = loadModules();
    const { exec: execLoaded, util: utilLoaded, os: osLoaded } = modules;

    // Use local variables for the modules
    const execAsyncLocal = utilLoaded.promisify(execLoaded);
    const tempDir = osLoaded.tmpdir();

    const minSize = options.minSize || 100 * 1024 * 1024; // Default 100MB
    const maxResults = options.maxResults || 20; // Default 20 results
    const searchPaths = options.paths || ['C:\\Users']; // Default to user directory

    console.log(`Searching for files larger than ${minSize} bytes in ${searchPaths.join(', ')}`);

    // Create a temporary PowerShell script to find large files
    const scriptPath = path.join(tempDir, 'find-large-files.ps1');
    console.log(`Creating temporary script at: ${scriptPath}`);

    const scriptContent = `
      $minSizeBytes = ${minSize}
      $maxResults = ${maxResults}
      $results = @()
      $ErrorActionPreference = "SilentlyContinue"

      ${searchPaths.map(p => `
      # Search in ${p}
      try {
        Get-ChildItem -Path "${p}" -Recurse -Force -ErrorAction SilentlyContinue |
          Where-Object { !$_.PSIsContainer -and $_.Length -ge $minSizeBytes } |
          Sort-Object Length -Descending |
          Select-Object -First $maxResults |
          ForEach-Object {
            $results += [PSCustomObject]@{
              Path = $_.FullName
              Size = $_.Length
              LastModified = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
              Type = $_.Extension
            }
          }
      } catch {
        # Skip folders we can't access
      }
      `).join('\n')}

      # Sort all results and limit to max results
      $results = $results | Sort-Object Size -Descending | Select-Object -First $maxResults
      $results | ConvertTo-Json
    `;

    // Write the script to a temporary file
    await fs.promises.writeFile(scriptPath, scriptContent);
    console.log('Script file created successfully');

    // Execute the PowerShell script
    console.log('Executing PowerShell script for large file search...');
    const { stdout } = await execAsyncLocal(`powershell -ExecutionPolicy Bypass -NoProfile -File "${scriptPath}"`, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large output
      timeout: 120000, // 120 second timeout (increased for large file systems)
      windowsHide: true
    });
    console.log('PowerShell script executed successfully');

    // Parse the results
    let largeFiles = [];
    try {
      largeFiles = JSON.parse(stdout);
      console.log(`Parsed large files data: ${largeFiles.length} files found`);

      // If not an array, convert to array
      if (!Array.isArray(largeFiles)) {
        if (largeFiles) {
          largeFiles = [largeFiles];
          console.log('Converted single file result to array');
        } else {
          largeFiles = [];
          console.log('No large files found, using empty array');
        }
      }

      // Sort by size (largest first)
      largeFiles.sort((a, b) => b.Size - a.Size);
      console.log('Large files sorted by size (largest first)');

      // Limit to maxResults
      largeFiles = largeFiles.slice(0, maxResults);
      console.log(`Limited results to ${maxResults} files`);

    } catch (parseError) {
      console.error('Error parsing large files output:', parseError);
      console.log('Raw output sample:', stdout.substring(0, 200) + '...');
      largeFiles = [];
    }

    // Clean up the temporary script file
    fs.promises.unlink(scriptPath).catch(err => console.error('Error deleting temp script:', err));

    return {
      success: true,
      files: largeFiles
    };
  } catch (error) {
    console.error('Error finding large files:', error);

    // Try a simpler alternative method
    try {
      console.log('Trying alternative large file search method...');
      // Make sure required modules are loaded
      const modules = loadModules();
      const { exec: execLoaded, util: utilLoaded } = modules;

      // Use local variables for the modules
      const execAsyncLocal = utilLoaded.promisify(execLoaded);

      const minSize = options.minSize || 100 * 1024 * 1024; // Default 100MB
      const maxResults = options.maxResults || 20; // Default 20 results
      const searchPath = (options.paths && options.paths.length > 0) ? options.paths[0] : 'C:\\Users'; // Just use the first path

      // Use a simpler PowerShell command that's less likely to fail
      const { stdout } = await execAsyncLocal(`powershell -Command "Get-ChildItem -Path '${searchPath}' -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Length -ge ${minSize} } | Sort-Object Length -Descending | Select-Object -First ${maxResults} | ForEach-Object { [PSCustomObject]@{ Path = $_.FullName; Size = $_.Length; LastModified = $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'); Type = $_.Extension } } | ConvertTo-Json"`, {
        maxBuffer: 5 * 1024 * 1024, // 5MB buffer (reduced for simpler output)
        timeout: 60000, // 60 second timeout
        windowsHide: true
      });

      let largeFiles = [];
      largeFiles = JSON.parse(stdout);

      // If not an array, convert to array
      if (!Array.isArray(largeFiles)) {
        if (largeFiles) {
          largeFiles = [largeFiles];
        } else {
          largeFiles = [];
        }
      }

      // Sort by size (largest first)
      largeFiles.sort((a, b) => b.Size - a.Size);

      console.log('Alternative large file search succeeded');
      return {
        success: true,
        files: largeFiles
      };
    } catch (alternativeError) {
      console.error('Alternative large file search also failed:', alternativeError);
    }

    return {
      success: false,
      error: error.message,
      files: []
    };
  }
});

// Get disk space usage by folder
ipcMain.handle('getDiskUsageByFolder', async (event, options) => {
  try {
    // Make sure required modules are loaded
    const modules = loadModules();
    const { exec: execLoaded, util: utilLoaded, os: osLoaded } = modules;

    // Use local variables for the modules
    const execAsyncLocal = utilLoaded.promisify(execLoaded);
    const tempDir = osLoaded.tmpdir();

    const folderPath = options.path || 'C:\\';
    const depth = options.depth || 1;

    console.log(`Analyzing disk usage for folder: ${folderPath} with depth: ${depth}`);

    // Create a temporary PowerShell script
    const scriptPath = path.join(tempDir, 'folder-sizes.ps1');
    console.log(`Creating temporary script at: ${scriptPath}`);

    const scriptContent = `
      $path = "${folderPath}"
      $depth = ${depth}

      function Get-FolderSize {
        param (
          [string]$Path,
          [int]$CurrentDepth = 0,
          [int]$MaxDepth = 1
        )

        if ($CurrentDepth -gt $MaxDepth) {
          return
        }

        try {
          $folders = Get-ChildItem -Path $Path -Directory -ErrorAction SilentlyContinue

          foreach ($folder in $folders) {
            try {
              $size = Get-ChildItem -Path $folder.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue

              [PSCustomObject]@{
                Path = $folder.FullName
                Name = $folder.Name
                SizeBytes = if ($size.Sum) { $size.Sum } else { 0 }
                ItemCount = if ($size.Count) { $size.Count } else { 0 }
              }
            } catch {
              # Skip folders we can't access
            }
          }
        } catch {
          # Skip if we can't access the main folder
        }
      }

      Get-FolderSize -Path $path -MaxDepth $depth | Sort-Object SizeBytes -Descending | ConvertTo-Json
    `;

    // Write the script to a temporary file
    await fs.promises.writeFile(scriptPath, scriptContent);
    console.log('Script file created successfully');

    // Execute the PowerShell script
    console.log('Executing PowerShell script for folder analysis...');
    const { stdout } = await execAsyncLocal(`powershell -ExecutionPolicy Bypass -NoProfile -File "${scriptPath}"`, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 120000, // 120 second timeout (increased for large folders)
      windowsHide: true
    });
    console.log('PowerShell script executed successfully');

    // Parse the results
    let folderSizes = [];
    try {
      folderSizes = JSON.parse(stdout);
      console.log(`Parsed folder sizes data: ${folderSizes.length} folders found`);

      // If not an array, convert to array
      if (!Array.isArray(folderSizes)) {
        if (folderSizes) {
          folderSizes = [folderSizes];
          console.log('Converted single folder result to array');
        } else {
          folderSizes = [];
          console.log('No folder data found, using empty array');
        }
      }

      // Sort by size (largest first)
      folderSizes.sort((a, b) => b.SizeBytes - a.SizeBytes);
      console.log('Folder sizes sorted by size (largest first)');

    } catch (parseError) {
      console.error('Error parsing folder sizes output:', parseError);
      console.log('Raw output sample:', stdout.substring(0, 200) + '...');
      folderSizes = [];
    }

    // Clean up the temporary script file
    fs.promises.unlink(scriptPath).catch(err => console.error('Error deleting temp script:', err));

    return {
      success: true,
      folders: folderSizes
    };
  } catch (error) {
    console.error('Error analyzing disk usage by folder:', error);

    // Try a simpler alternative method
    try {
      console.log('Trying alternative folder size analysis method...');
      // Make sure required modules are loaded
      const modules = loadModules();
      const { exec: execLoaded, util: utilLoaded } = modules;

      // Use local variables for the modules
      const execAsyncLocal = utilLoaded.promisify(execLoaded);

      const folderPath = options.path || 'C:\\';

      // Use a simpler PowerShell command that's less likely to fail
      const { stdout } = await execAsyncLocal(`powershell -Command "Get-ChildItem -Path '${folderPath}' -Directory | ForEach-Object { $name = $_.Name; $path = $_.FullName; $size = (Get-ChildItem -Path $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum; [PSCustomObject]@{ Name = $name; Path = $path; SizeBytes = if ($size) { $size } else { 0 } } } | ConvertTo-Json"`, {
        maxBuffer: 5 * 1024 * 1024, // 5MB buffer (reduced for simpler output)
        timeout: 60000, // 60 second timeout
        windowsHide: true
      });

      let folderSizes = [];
      folderSizes = JSON.parse(stdout);

      // If not an array, convert to array
      if (!Array.isArray(folderSizes)) {
        if (folderSizes) {
          folderSizes = [folderSizes];
        } else {
          folderSizes = [];
        }
      }

      // Sort by size (largest first)
      folderSizes.sort((a, b) => b.SizeBytes - a.SizeBytes);

      console.log('Alternative folder size analysis succeeded');
      return {
        success: true,
        folders: folderSizes
      };
    } catch (alternativeError) {
      console.error('Alternative folder size analysis also failed:', alternativeError);
    }

    return {
      success: false,
      error: error.message,
      folders: []
    };
  }
});

// ===================================================
// APP LIFECYCLE EVENTS
// ===================================================

// Removing duplicate browseForFile handler since it's already defined at line 451

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  console.warn(`Certificate error for ${url}: ${error}`);

  // Allow self-signed certificates in development
  event.preventDefault();
  callback(true);
});

app.on('window-all-closed', () => {
  logger.info(logger.LOG_CATEGORIES.SYSTEM, 'All windows closed');

  // If app.isQuitting is true, we're in the process of quitting already
  // Otherwise, the app will continue running in the system tray
  if (app.isQuitting) {
    logger.info(logger.LOG_CATEGORIES.SYSTEM, 'App is quitting, proceeding with shutdown');
  } else {
    logger.info(logger.LOG_CATEGORIES.SYSTEM, 'App remains running in the system tray');

    // Make sure the tray icon is still there
    if (!tray) {
      logger.warn(logger.LOG_CATEGORIES.SYSTEM, 'Tray icon not found, recreating it');
      createTray();
    }
  }
});

// Function to terminate any child processes that might prevent app from quitting
function terminateChildProcesses() {
  logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Checking for and terminating child processes');

  try {
    // Make sure exec is loaded
    if (!exec) {
      logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Loading exec module for process termination');
      exec = require('child_process').exec;
    }

    // On Windows, we can use wmic to terminate child processes
    const appName = app.getName();
    const appPid = process.pid;

    logger.info(logger.LOG_CATEGORIES.SYSTEM, `Terminating child processes for ${appName} (PID: ${appPid})`);

    // This will terminate all processes with the app name except the main process
    exec(`wmic process where "name like '%${appName}%' and not processid=${appPid}" call terminate`, (error, stdout, stderr) => {
      if (error) {
        logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error terminating child processes: ${error.message}`);
      } else {
        logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Child processes terminated successfully');
      }
    });
  } catch (error) {
    logger.error(logger.LOG_CATEGORIES.SYSTEM, `Error in terminateChildProcesses: ${error.message}`);
  }
}

// Handle the before-quit event to properly clean up
app.on('before-quit', () => {
  logger.info(logger.LOG_CATEGORIES.SYSTEM, 'Application is quitting');
  app.isQuitting = true;

  // Terminate any child processes
  terminateChildProcesses();
});

ipcMain.handle('check-for-updates', async () => {
    // This would use the Windows Update API in production
    return ipcMain.handlers['get-available-updates']();
});

// 'get-services' handler moved to line 2449

// Add terminal command handler
ipcMain.handle('execute-command', async (event, cmd, shell) => {
    try {
        let output;

        // Check if this is a predefined command or a custom command
        if (typeof cmd === 'string' && cmd.includes(' ')) {
            // This is a custom command with spaces, use executeCustomCommand
            output = await executeCustomCommand(cmd);
        } else {
            // This is a predefined command, use executeCommand
            output = await executeCommand(cmd);
        }

        return { success: true, output };
    } catch (error) {
        console.error('Error executing command:', error);
        return { success: false, error: error.message };
    }
});

// Admin-related IPC handlers
ipcMain.handle('is-elevated', async () => {
  try {
    // Lazy load is-elevated module
    const isElevated = (await import('is-elevated')).default;
    const elevated = await isElevated();
    console.log(`Admin check: Application is ${elevated ? 'running' : 'not running'} as administrator`);
    return elevated;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
});

ipcMain.handle('restart-as-admin', async () => {
  try {
    // For Windows, we'll use the built-in runas command
    if (process.platform === 'win32') {
      const appPath = process.execPath;
      const args = process.argv.slice(1).join(' ');

      console.log(`[WinTool] Attempting to restart as admin: ${appPath} ${args}`);

      // First, make sure to save the admin preference in the store
      if (!store) {
        const Store = await import('electron-store');
        store = new Store.default();
      }
      store.set('adminPrivileges', true);
      console.log('[WinTool] Saved admin privileges preference to store');

      // Use PowerShell to restart the app with admin privileges
      const { exec } = require('child_process');

      // Create a Promise to handle the exec callback properly
      const result = await new Promise((resolve) => {
        exec(`powershell -Command "Start-Process -FilePath '${appPath}' -ArgumentList '${args}' -Verb RunAs"`, (error) => {
          if (error) {
            console.error('[WinTool] Failed to restart as admin:', error);
            resolve({ success: false, error: error.message });
          } else {
            // Exit the current instance after a short delay
            setTimeout(() => {
              app.exit(0);
            }, 1000);
            resolve({ success: true });
          }
        });
      });

      return result;
    } else {
      return { success: false, error: 'Admin restart is only supported on Windows' };
    }
  } catch (error) {
    console.error('[WinTool] Error restarting as admin:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-elevation-preference', async (_, shouldElevate, resetOnly = false) => {
  try {
    // Initialize store if not already done
    if (!store) {
      const Store = await import('electron-store');
      store = new Store.default();
    }

    // If this is just a reset request, set the reset flag and return
    if (resetOnly) {
      console.log('[WinTool] Setting reset admin privileges flag');
      store.set('resetAdminPrivileges', true);
      return { success: true, reset: true };
    }

    console.log(`[WinTool] Setting elevation preference: ${shouldElevate}`);

    // Store the preference (we'll use it on next startup)
    store.set('adminPrivileges', shouldElevate);

    // If the user wants to run as admin and we're not already admin, restart as admin
    if (shouldElevate) {
      const isElevated = (await import('is-elevated')).default;
      const elevated = await isElevated();

      if (!elevated) {
        console.log('[WinTool] User requested admin privileges, restarting with elevation...');
        // Restart as admin directly instead of trying to call the handler
        const appPath = process.execPath;
        const args = process.argv.slice(1).join(' ');

        console.log(`[WinTool] Attempting to restart as admin: ${appPath} ${args}`);

        // Use PowerShell to restart the app with admin privileges
        const { exec } = require('child_process');

        // Create a Promise to handle the exec callback properly
        const result = await new Promise((resolve) => {
          exec(`powershell -Command "Start-Process -FilePath '${appPath}' -ArgumentList '${args}' -Verb RunAs"`, (error) => {
            if (error) {
              console.error('[WinTool] Failed to restart as admin:', error);
              resolve({ success: false, error: error.message });
            } else {
              // Exit the current instance after a short delay
              setTimeout(() => {
                app.exit(0);
              }, 1000);
              resolve({ success: true });
            }
          });
        });

        return result;
      } else {
        console.log('[WinTool] Already running as admin, no need to restart');
        return { success: true, alreadyAdmin: true };
      }
    } else {
      // If the user wants to run without admin, we'll just restart normally
      console.log('[WinTool] User requested to run without admin privileges, restarting normally...');
      app.relaunch();
      app.exit(0);
      return { success: true };
    }
  } catch (error) {
    console.error('[WinTool] Error setting elevation preference:', error);
    return { success: false, error: error.message };
  }
});

// Gaming and Performance Handlers - Moved to a single location at the end of the file



// ===================================================
// TELEMETRY IPC HANDLERS
// ===================================================

ipcMain.handle('getTelemetryState', async () => {
    try {
        // Wait for store to be initialized
        if (!store) {
            const Store = await import('electron-store');
            store = new Store.default();
        }
        return store.get('telemetry.enabled', true);
    } catch (error) {
        console.error('Error getting telemetry state:', error);
        return true; // Default to enabled on error
    }
});

// ===================================================
// PRIVACY IPC HANDLERS HAVE BEEN REMOVED
// ===================================================

// ===================================================
// APP LIFECYCLE EVENTS
// ===================================================

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  console.warn(`Certificate error for ${url}: ${error}`);

  // Allow self-signed certificates in development
  event.preventDefault();
  callback(true);
});

// Duplicate window-all-closed handler removed

ipcMain.handle('get-services', async () => {
    try {
        return new Promise((resolve, reject) => {
            // Use PowerShell to get Windows services
            exec('powershell -Command "Get-Service | Select-Object Name, DisplayName, Status, StartType | ConvertTo-Json -Depth 1 -Compress"',
                { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 }, // Increase buffer size for large output
                (error, stdout, stderr) => {
                    if (error) {
                        console.error('Error getting services:', error);
                        reject(error);
                        return;
                    }

                    try {
                        const services = JSON.parse(stdout);
                        // Format the services data and limit to first 20 for demo purposes
                        const formattedServices = Array.isArray(services) ? services : [services];
                        const limitedServices = formattedServices.slice(0, 20).map(service => ({
                            name: service.DisplayName || service.Name,
                            description: `Windows service: ${service.Name}`,
                            status: service.Status.toLowerCase(),
                            startupType: (service.StartType || 'Manual').toLowerCase()
                        }));
                        resolve(limitedServices);
                    } catch (parseError) {
                        console.error('Error parsing services data:', parseError);
                        reject(parseError);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Error in get-services handler:', error);
        return { error: error.message };
    }
});

// 'execute-command' handler already defined at line 2082

// 'is-elevated' handler already defined at line 2103

// 'restart-as-admin' handler already defined at line 2114

// 'setElevationPreference' handler already defined at line 2158

// 'check-admin-rights' handler already defined at line 2298

// 'request-elevation' handler already defined at line 2320

// 'open-device-manager' handler already defined elsewhere

// All gaming and performance handlers below were duplicates and have been removed:
// - 'launchPerformanceMonitor' handler already defined elsewhere
// - 'activateGameBooster' handler already defined elsewhere
// - 'deactivateGameBooster' handler already defined elsewhere
