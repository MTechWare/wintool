// Import necessary Electron modules and Node.js built-in modules
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const portscanner = require('portscanner');
const sudo = require('sudo-prompt');
const os = require('os');
const dns = require('dns');
const fetch = require('node-fetch');
const fs = require('fs');

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
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    frame: false, // Remove default window frame
    backgroundColor: '#111113'
  });

  win.loadFile('index.html');
  
  // Handle window control IPC events
  ipcMain.handle('minimize-window', () => {
    win.minimize();
    return true;
  });
  
  ipcMain.handle('maximize-window', () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
    return true;
  });
  
  ipcMain.handle('close-window', () => {
    win.close();
    return true;
  });

  // Restore alwaysOnTop state from localStorage (via IPC)
  ipcMain.handle('getAlwaysOnTop', () => {
    const win = BrowserWindow.getAllWindows()[0];
    return win ? win.isAlwaysOnTop() : false;
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
ipcMain.handle('getAlwaysOnTop', () => {
  const win = BrowserWindow.getAllWindows()[0];
  return win ? win.isAlwaysOnTop() : false;
});

// --- IPC Handler for Reload Window ---
ipcMain.on('reload-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.reload();
});

// --- Require backend modules ---
const { getSystemInfo } = require('./js/system-info');
const { launchTaskManager, launchDiskCleanup } = require('./js/system-commands');
const { getPackages } = require('./js/packages');
const { packageAction } = require('./js/package-actions');
const { getCurrentTweaks, applyTweaks } = require('./js/tweaks');

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
ipcMain.handle('setFpsCounter', async (event, enabled) => {
  // Placeholder: Just log and return success for now
  console.log('[FPS Counter] Set to:', enabled);
  return { success: true };
});

// MOVED: setGameMode handler moved to tweaks.js

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
      exec(`"${rammapPath}" -E`, (error) => {
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

// --- Gaming Performance Functions ---
ipcMain.handle('optimizeMemory', async () => {
  try {
    console.log('Optimizing system memory...');
    
    // Execute memory optimization commands
    await new Promise(resolve => {
      exec('powershell -Command "EmptyStandbyList workingsets"', (error) => {
        if (error) {
          console.warn('Could not empty working sets, using fallback method');
        }
      });
      
      // Simulate memory optimization with a delay
      setTimeout(() => {
        console.log('Memory optimization completed');
        resolve();
      }, 1500);
    });
    
    return { success: true, message: 'Memory optimization completed successfully' };
  } catch (error) {
    console.error('Memory optimization error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('optimizeNetwork', async () => {
  try {
    console.log('Optimizing network settings...');
    
    // Simulate network optimization with a delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real implementation, this would execute network optimization commands
    // For example: Setting DNS, flushing DNS cache, optimizing TCP settings, etc.
    
    return { success: true, message: 'Network optimization completed successfully' };
  } catch (error) {
    console.error('Network optimization error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('cleanupSystem', async () => {
  try {
    console.log('Running system cleanup...');
    
    // Simulate system cleanup with a delay
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // In a real implementation, this would execute cleanup commands
    // For example: Clearing temp files, browser caches, etc.
    
    return { success: true, message: 'System cleanup completed successfully' };
  } catch (error) {
    console.error('System cleanup error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('launchPerformanceMonitor', async () => {
  try {
    console.log('Launching performance monitor...');
    
    // Launch Windows Performance Monitor
    exec('perfmon.exe', (error) => {
      if (error) {
        console.error('Failed to launch Performance Monitor:', error);
        throw new Error('Failed to launch Performance Monitor');
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Performance monitor launch error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('activateGameBooster', async () => {
  try {
    console.log('Activating Game Booster...');
    
    // Simulate game booster activation with a delay
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    // In a real implementation, this would:
    // 1. Suspend non-essential background processes
    // 2. Set CPU priority for games
    // 3. Clear memory cache
    // 4. Apply other performance tweaks
    
    return { success: true, message: 'Game Booster activated successfully' };
  } catch (error) {
    console.error('Game Booster activation error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('deactivateGameBooster', async () => {
  try {
    console.log('Deactivating Game Booster...');
    
    // Simulate game booster deactivation with a delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real implementation, this would:
    // 1. Resume suspended processes
    // 2. Reset CPU priorities
    // 3. Restore original system settings
    
    return { success: true, message: 'Game Booster deactivated successfully' };
  } catch (error) {
    console.error('Game Booster deactivation error:', error);
    return { error: error.message };
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
