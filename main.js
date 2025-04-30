// Import necessary Electron modules and Node.js built-in modules
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const portscanner = require('portscanner');
const sudo = require('sudo-prompt');
const os = require('os');
const dns = require('dns');
const fetch = require('node-fetch');

app.whenReady().then(async () => {
  console.log('[WinTool] Electron app is ready. Checking admin rights...');
  const isElevated = require('is-elevated');
  const elevated = await isElevated();
  console.log('[WinTool] Is elevated:', elevated);
  if (!elevated) {
    const options = { name: 'WinTool' };
    // Launch Electron with the app directory or main.js for elevation
    const electronPath = process.execPath;
    const appPath = process.argv[1] || __dirname;
    console.log(`[WinTool] Relaunch command: "${electronPath}" "${appPath}"`);
    sudo.exec(`"${electronPath}" "${appPath}"`, options, (error) => {
      if (error) {
        console.error('[WinTool] Failed to elevate:', error);
        const { dialog } = require('electron');
        dialog.showErrorBox('Administrator Rights Required',
          'This app must be run as administrator. Please restart with elevated permissions.');
        app.quit();
      } else {
        console.log('[WinTool] Relaunched as admin. Quitting original process.');
        app.quit();
      }
    });
  } else {
    console.log('[WinTool] Running as admin. Creating main window...');
    createWindow();
  }
});

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
    alwaysOnTop: false, // Default to not always on top
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  win.loadFile('index.html').catch(err => {
    if (app.isReady()) {
      dialog.showErrorBox('UI Load Error', `Could not load the application interface (index.html):\n${err.message}`);
    }
  });

  // Restore alwaysOnTop state from localStorage (via IPC)
  ipcMain.handleOnce('getAlwaysOnTop', () => {
    return win.isAlwaysOnTop();
  });

  // Show the window gracefully when content is ready
  win.once('ready-to-show', () => {
    win.show();
    console.log('Window ready and shown.');
  });

  win.on('closed', () => {
    console.log('Main window closed.');
  });
}

// --- IPC Handler for Always on Top ---
ipcMain.handle('setAlwaysOnTop', (event, value) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.setAlwaysOnTop(!!value);
  }
});

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
ipcMain.handle('launch-system-tool', async (event, toolId) => {
  let cmd;
  switch (toolId) {
    case 'disk_cleanup': cmd = 'cleanmgr'; break;
    case 'task_manager': cmd = 'taskmgr'; break;
    case 'cmd': cmd = 'start cmd'; break;
    default: throw new Error('Unknown tool');
  }
  exec(cmd, { shell: true });
  return { status: 'launched' };
});
ipcMain.handle('setFpsCounter', async (event, enabled) => {
  // Placeholder: Just log and return success for now
  console.log('[FPS Counter] Set to:', enabled);
  return { success: true };
});

// --- Gaming & Performance IPC handlers ---
ipcMain.handle('setGameMode', async (event, enabled) => {
  return new Promise((resolve, reject) => {
    // PowerShell command to set Game Mode
    const psCmd = `reg add "HKLM\\SOFTWARE\\Microsoft\\GameBar" /v AllowAutoGameMode /t REG_DWORD /d ${enabled ? 1 : 0} /f`;
    exec(psCmd, { shell: 'powershell.exe' }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      resolve({ success: true });
    });
  });
});
ipcMain.handle('setPowerPlan', async (event, plan) => {
  // GUIDs for built-in power plans
  const plans = {
    balanced: '381b4222-f694-41f0-9685-ff5bb260df2e',
    high: '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c',
    ultimate: 'e9a42b02-d5df-448d-aa00-03f14749eb61',
  };
  const guid = plans[plan];
  if (!guid) throw new Error('Unknown power plan');
  // First, check if plan exists; if not, add/duplicate it (for ultimate)
  function planExists(guid) {
    return new Promise((resolve) => {
      exec(`powercfg /list`, { shell: true }, (err, stdout) => {
        resolve(stdout && stdout.toLowerCase().includes(guid));
      });
    });
  }
  if (plan === 'ultimate') {
    const exists = await planExists(guid);
    if (!exists) {
      await new Promise((resolve, reject) => {
        exec(`powercfg -duplicatescheme ${guid}`, { shell: true }, (error, stdout, stderr) => {
          if (error) return reject(new Error(stderr || error.message));
          resolve();
        });
      });
    }
  }
  // Now set active
  return new Promise((resolve, reject) => {
    exec(`powercfg /setactive ${guid}`, { shell: true }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      resolve({ success: true });
    });
  });
});
ipcMain.handle('optimizeRam', async () => {
  // Use RAMMap.exe to clear standby memory if available
  const rammapPath = path.join(__dirname, 'rammap.exe');
  return new Promise((resolve, reject) => {
    const fs = require('fs');
    if (fs.existsSync(rammapPath)) {
      exec(`"${rammapPath}" -E`, (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr || error.message));
        resolve({ success: true });
      });
    } else {
      reject(new Error('rammap.exe not found in app directory. Please download RAMMap from Microsoft Sysinternals and place rammap.exe in the app folder.'));
    }
  });
});

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
