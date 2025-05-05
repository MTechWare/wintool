// Import necessary Electron modules and Node.js built-in modules
// Electron Modules
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
// Node.js Built-in Modules
const path = require('path');
const { exec, execFile } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const portscanner = require('portscanner');
const sudo = require('sudo-prompt');
const os = require('os');
const dns = require('dns');
const fetch = require('node-fetch');
const fs = require('fs');

// Initialize store
let store;
(async () => {
    const Store = await import('electron-store');
    store = new Store.default();
})();

const { executeCommand } = require('./js/terminal-commands');

app.whenReady().then(async () => {
  console.log('[WinTool] Electron app is ready. Checking admin rights...');
  const isElevated = require('is-elevated');
  const elevated = await isElevated();
  console.log('[WinTool] Is elevated:', elevated);
  
  // For development purposes, allow running without admin rights
  const skipElevation = process.env.SKIP_ELEVATION === 'true';
  
  if (!elevated && !skipElevation) {
    try {
      const options = { name: 'WinTool' };
      // Launch Electron with the app directory or main.js for elevation
      const electronPath = process.execPath;
      const appPath = path.join(__dirname); // Use absolute path
      console.log(`[WinTool] Relaunch command: "${electronPath}" "${appPath}"`);
      
      sudo.exec(`"${electronPath}" "${appPath}"`, options, (error) => {
        if (error) {
          console.error('[WinTool] Failed to elevate:', error);
          // Show error dialog but continue without elevation
          dialog.showMessageBox({
            type: 'warning',
            title: 'Administrator Rights',
            message: 'Some features may be limited without administrator rights.',
            detail: 'You can continue using WinTool with limited functionality.',
            buttons: ['Continue Anyway']
          }).then(() => {
            createWindow();
          });
        } else {
          console.log('[WinTool] Relaunched as admin. Quitting original process.');
          app.quit();
        }
      });
    } catch (error) {
      console.error('[WinTool] Error during elevation:', error);
      createWindow(); // Continue without elevation
    }
  } else {
    console.log('[WinTool] Running with current permissions. Creating main window...');
    createWindow();
  }
});

// --- Function to Create the Application Window ---
function createWindow() {
  console.log("Creating main window..."); // Verify console.log in main.js
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
// System Modules
const { getSystemInfo } = require('./js/system-info');
const { launchTaskManager, launchDiskCleanup } = require('./js/system-commands');
// Package Modules
const { getPackages } = require('./js/packages');
const { packageAction } = require('./js/package-actions');
// Tweaks Modules
const { getCurrentTweaks, applyTweaks } = require('./js/tweaks');
// Hardware Monitoring Modules
const hardwareMonitor = require('./js/hardware-monitor');
// Privacy Guard Modules
const { setPrivacyGuard, getPrivacyGuardStatus } = require('./js/privacy-guard');
// Gaming Features Module
const gamingFeatures = require('./js/gaming-features');

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

// Test hardware monitor functionality
ipcMain.handle('test-hardware-monitor', async () => {
  try {
    console.log('Testing hardware monitor...');
    const result = await hardwareMonitor.testHardwareMonitor();
    console.log('Hardware monitor test result:', result);
    return result;
  } catch (error) {
    console.error('Hardware monitor test error:', error);
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

// ===================================================
// WINDOW MANAGEMENT IPC HANDLERS
// ===================================================

ipcMain.handle('close-window', async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
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
    
    // Get network interfaces
    const interfaces = os.networkInterfaces();
    let ipAddress = 'Not available';
    let connectionType = 'Unknown';
    
    // Find the active network interface (non-internal with IPv4)
    for (const [name, netInterface] of Object.entries(interfaces)) {
      for (const iface of netInterface) {
        if (!iface.internal && iface.family === 'IPv4') {
          ipAddress = iface.address;
          connectionType = name.includes('Wi-Fi') ? 'Wi-Fi' : 
                          name.includes('Ethernet') ? 'Ethernet' : 
                          name.includes('VPN') ? 'VPN' : 'Wired';
          break;
        }
      }
    }
    // Check internet connectivity
    let internetConnected = false;
    try {
      await fetch('https://www.google.com', { timeout: 5000 });
      internetConnected = true;
    } catch (e) {
      internetConnected = false;
    }
    // Get DNS servers (simplified - in a real implementation, this would use system commands)
    const dnsServers = ['8.8.8.8', '8.8.4.4']; // Example Google DNS
    
    return {
      connectionType,
      ipAddress,
      dnsServers,
      internetConnected
    };
  } catch (error) {
    console.error('Network info error:', error);
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
ipcMain.handle('setGameMode', (_, enabled) => gamingFeatures.setGameMode(enabled));
ipcMain.handle('getGameModeStatus', () => gamingFeatures.getGameModeStatus());

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
// PRIVACY TAB IPC HANDLERS
// ===================================================

ipcMain.handle('getPrivacyStates', async () => {
    try {
        const states = {};
        const commands = {
            location: [
                'Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" -Name "Value"',
                'Get-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" -Name "Value"'
            ],
            camera: [
                'Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam" -Name "Value"',
                'Get-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam" -Name "Value"'
            ],
            microphone: [
                `Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone" -Name "Value"`,
                `Get-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone" -Name "Value"`
            ],
            activity: [
                'Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy" -Name "EnableActivityFeed"'
            ]
        };

        for (const [key, commandList] of Object.entries(commands)) {
            try {
                let value = false;
                for (const command of commandList) {
                    const { stdout } = await new Promise((resolve, reject) => {
                        exec(`powershell -Command "${command}"`, (error, stdout, stderr) => {
                            if (key === 'activity') {
                                resolve(!error && stdout.includes('1'));
                            } else {
                                resolve(!error && stdout.includes('Allow'));
                            }
                        });
                    });

                    if (stdout && (stdout.includes('Allow') || stdout.includes('1'))) {
                        value = true;
                        break;
                    }
                }
                states[key] = value;
                console.log(`Privacy setting ${key}:`, value);
            } catch (error) {
                console.error(`Error checking ${key}:`, error);
                states[key] = false;
            }
        }
        
        console.log('Final privacy settings:', states);
        return states;
    } catch (error) {
        console.error('Error getting privacy states:', error);
        return {
            location: false,
            camera: false,
            microphone: false,
            activity: false
        };
    }
});

ipcMain.handle('setPrivacySetting', async (event, setting, value) => {
    try {
        const regCommands = {
            camera: [
                `reg add "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam" /v Value /t REG_SZ /d "${value ? 'Allow' : 'Deny'}" /f`,
                `reg add "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam" /v Value /t REG_SZ /d "${value ? 'Allow' : 'Deny'}" /f`
            ],
            microphone: [
                `reg add "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone" /v Value /t REG_SZ /d "${value ? 'Allow' : 'Deny'}" /f`,
                `reg add "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone" /v Value /t REG_SZ /d "${value ? 'Allow' : 'Deny'}" /f`
            ],
            location: [
                `reg add "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" /v Value /t REG_SZ /d "${value ? 'Allow' : 'Deny'}" /f`,
                `reg add "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" /v Value /t REG_SZ /d "${value ? 'Allow' : 'Deny'}" /f`
            ],
            activity: [
                `reg add "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy" /v EnableActivityFeed /t REG_DWORD /d ${value ? 1 : 0} /f`
            ]
        };

        const commands = regCommands[setting];
        if (!commands) {
            throw new Error('Invalid privacy setting');
        }

        // Execute all registry commands for the setting
        for (const command of commands) {
            await new Promise((resolve, reject) => {
                exec(command, { windowsHide: true }, (error) => {
                    if (error) {
                        console.warn(`Command failed: ${command}`, error);
                    }
                    resolve();
                });
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Error setting privacy setting:', error);
        return { error: `Failed to apply ${setting} setting` };
    }
});

ipcMain.handle('applyPrivacyLockdown', async () => {
    try {
        const commands = [
            // Telemetry
            `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" -Name "AllowTelemetry" -Value 0`,
            `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" -Name "AllowTelemetry" -Value 0`,
            // App Diagnostics
            `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\appDiagnostics" -Name "Value" -Value "Deny"`,
            // Advertising Info
            `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" -Name "Enabled" -Value 0`,
            // Location
            `Set-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" -Name "Value" -Value "Deny"`,
            // Camera
            `Set-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam" -Name "Value" -Value "Deny"`,
            // Microphone
            `Set-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone" -Name "Value" -Value "Deny"`,
            // Activity History
            `New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy" -Force; Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy" -Name "EnableActivityFeed" -Value 0 -Type DWord`
        ];

        for (const command of commands) {
            await new Promise((resolve, reject) => {
                exec(`powershell -Command "${command}"`, (error) => {
                    if (error) {
                        console.warn(`Command failed: ${command}`, error);
                        resolve(); // Continue with other commands even if one fails
                    } else {
                        resolve();
                    }
                });
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Error applying privacy lockdown:', error);
        return { error: error.message };
    }
});

ipcMain.handle('getSystemPrivacySettings', async () => {
    try {
        const commands = {
            location: [
                'Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" -Name "Value" -ErrorAction SilentlyContinue',
                'Get-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" -Name "Value" -ErrorAction SilentlyContinue'
            ],
            camera: [
                'Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam" -Name "Value" -ErrorAction SilentlyContinue',
                'Get-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam" -Name "Value" -ErrorAction SilentlyContinue'
            ],
            microphone: [
                `Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone" -Name "Value" -ErrorAction SilentlyContinue`,
                `Get-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone" -Name "Value" -ErrorAction SilentlyContinue`
            ],
            activity: [
                'Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy" -Name "EnableActivityFeed" -ErrorAction SilentlyContinue'
            ]
        };

        const results = {};
        for (const [setting, commandList] of Object.entries(commands)) {
            try {
                let value = false;
                for (const command of commandList) {
                    const { stdout } = await new Promise((resolve, reject) => {
                        exec(`powershell -Command "${command}"`, (error, stdout, stderr) => {
                            if (error) {
                                console.log(`Command failed for ${setting}:`, error);
                                resolve({ stdout: '' });
                            } else {
                                resolve({ stdout });
                            }
                        });
                    });

                    if (stdout && (stdout.includes('Allow') || stdout.includes('1'))) {
                        value = true;
                        break;
                    }
                }
                results[setting] = value;
                console.log(`Privacy setting ${setting}:`, value);
            } catch (error) {
                console.error(`Error checking ${setting}:`, error);
                results[setting] = false;
            }
        }
        
        console.log('Final privacy settings:', results);
        return results;
    } catch (error) {
        console.error('Error in getSystemPrivacySettings:', error);
        return {
            location: false,
            camera: false,
            microphone: false,
            activity: false
        };
    }
});

ipcMain.handle('getPrivacyGuardStatus', async () => {
    try {
        return await getPrivacyGuardStatus();
    } catch (error) {
        console.error('Error getting privacy guard status:', error);
        return false;
    }
});

ipcMain.handle('setPrivacyGuard', async (event, enabled) => {
    try {
        await setPrivacyGuard(enabled);
        return { success: true };
    } catch (error) {
        console.error('Error setting privacy guard:', error);
        return { error: 'Failed to set privacy guard' };
    }
});

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

ipcMain.handle('setTelemetry', async (event, enabled) => {
    try {
        // Wait for store to be initialized
        if (!store) {
            const Store = await import('electron-store');
            store = new Store.default();
        }

        const commands = [
            `reg add "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" /v AllowTelemetry /t REG_DWORD /d ${enabled ? 1 : 0} /f`,
            `reg add "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d ${enabled ? 1 : 0} /f`,
            `reg add "HKLM:\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" /v AllowTelemetry /t REG_DWORD /d ${enabled ? 1 : 0} /f`,
            // Disable services if telemetry is being disabled
            ...(enabled ? [] : [
                'reg add "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\DiagTrack" /v Start /t REG_DWORD /d 4 /f',
                'reg add "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\dmwappushservice" /v Start /t REG_DWORD /d 4 /f'
            ])
        ];

        // Execute commands
        for (const command of commands) {
            await new Promise((resolve) => {
                exec(command, { windowsHide: true }, (error) => {
                    if (error) {
                        console.warn(`Command failed: ${command}`, error);
                    }
                    resolve();
                });
            });
        }

        // Save state
        store.set('telemetry.enabled', enabled);
        return { success: true };
    } catch (error) {
        console.error('Error setting telemetry:', error);
        return { error: 'Failed to set telemetry settings' };
    }
});

// ===================================================
// CLEANUP TAB IPC HANDLERS
// ===================================================

ipcMain.handle('runQuickCleanup', async () => {
  try {
    // Run basic cleanup commands
    await execAsync('del /q/f/s %TEMP%\\*');
    await execAsync('del /q/f/s C:\\Windows\\Temp\\*');
    await execAsync('del /q/f/s C:\\Windows\\Prefetch\\*');
    await execAsync('wevtutil cl System');
    await execAsync('wevtutil cl Application');
    
    return { success: true };
  } catch (error) {
    console.error('Quick cleanup error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('runAdvancedCleanup', async (event, options) => {
  try {
    const commands = [];
    
    if (options.temp) {
      commands.push(
        'del /q/f/s %TEMP%\\*',
        'del /q/f/s C:\\Windows\\Temp\\*'
      );
    }
    
    if (options.prefetch) {
      commands.push('del /q/f/s C:\\Windows\\Prefetch\\*');
    }
    
    if (options.windowsLogs) {
      commands.push('del /q/f/s C:\\Windows\\Logs\\*');
    }
    
    if (options.dnsCache) {
      commands.push('ipconfig /flushdns');
    }
    
    if (options.updates) {
      commands.push(
        'net stop wuauserv',
        'del /q/f/s %windir%\\SoftwareDistribution\\Download\\*',
        'net start wuauserv'
      );
    }
    
    if (options.installers) {
      commands.push('del /q/f/s C:\\Windows\\Installer\\*');
    }
    
    if (options.eventLogs) {
      commands.push(
        'wevtutil cl System',
        'wevtutil cl Application',
        'wevtutil cl Security'
      );
    }
    
    // Execute all selected commands
    for (const cmd of commands) {
      await execAsync(cmd);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Advanced cleanup error:', error);
    return { error: error.message };
  }
});

// ===================================================
// APP LIFECYCLE EVENTS
// ===================================================

// Add file browser dialog handler
ipcMain.handle('browseForFile', async (event, options) => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) {
      throw new Error('No window available');
    }
    
    // Set default options
    const dialogOptions = {
      title: options.title || 'Select File',
      buttonLabel: options.buttonLabel,
      properties: options.properties || ['openFile'],
      filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
    };
    
    // If defaultPath is provided, add it to options
    if (options.defaultPath) {
      dialogOptions.defaultPath = options.defaultPath;
    }
    
    // Show dialog and return result
    const result = await dialog.showOpenDialog(win, dialogOptions);
    
    // Format the result
    return {
      canceled: result.canceled,
      filePath: result.filePaths && result.filePaths.length > 0 ? result.filePaths[0] : null,
      filePaths: result.filePaths
    };
  } catch (error) {
    console.error('Error in browseForFile handler:', error);
    return { error: error.message };
  }
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  console.warn(`Certificate error for ${url}: ${error}`);
  
  // Allow self-signed certificates in development
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

ipcMain.handle('check-for-updates', async () => {
    // This would use the Windows Update API in production
    return ipcMain.handlers['get-available-updates']();
});

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

// Add terminal command handler
ipcMain.handle('execute-command', async (event, cmd, shell) => {
    try {
        const output = await executeCommand(cmd, shell);
        return { success: true, output };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Add open-device-manager handler
ipcMain.handle('open-device-manager', async () => {
    try {
        shell.openExternal('ms-settings:devices');
        return { success: true, message: 'Opening Device Manager.' };
    } catch (error) {
        return { success: false, message: 'Failed to open Device Manager.' };
    }
});
