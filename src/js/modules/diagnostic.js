/**
 * WinTool Diagnostic Script
 * Run this to identify startup issues on fresh systems
 */

const { app, BrowserWindow, nativeImage, Tray } = require('electron');
const path = require('path');
const fs = require('fs');

console.log('=== WinTool Diagnostic Starting ===');
console.log(`Platform: ${process.platform}`);
console.log(`Electron version: ${process.versions.electron}`);
console.log(`Node version: ${process.versions.node}`);
console.log(`App path: ${app.getAppPath()}`);

app.whenReady().then(() => {
    console.log('Electron app ready');
    
    // Test 1: Check icon file
    const iconPath = path.join(__dirname, '../../../src/assets/images/icon.ico');
    console.log(`\n=== Test 1: Icon File ===`);
    console.log(`Icon path: ${iconPath}`);
    
    try {
        const iconExists = fs.existsSync(iconPath);
        console.log(`Icon exists: ${iconExists}`);
        
        if (iconExists) {
            const iconStats = fs.statSync(iconPath);
            console.log(`Icon size: ${iconStats.size} bytes`);
            
            // Test loading icon
            const nativeIcon = nativeImage.createFromPath(iconPath);
            console.log(`Icon loaded: ${!nativeIcon.isEmpty()}`);
            console.log(`Icon size: ${nativeIcon.getSize().width}x${nativeIcon.getSize().height}`);
        }
    } catch (error) {
        console.error(`Icon test failed: ${error.message}`);
    }
    
    // Test 2: Basic window creation
    console.log(`\n=== Test 2: Basic Window ===`);
    try {
        const testWindow = new BrowserWindow({
            width: 400,
            height: 300,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });
        console.log('Basic window created successfully');
        testWindow.close();
    } catch (error) {
        console.error(`Basic window creation failed: ${error.message}`);
    }
    
    // Test 3: Transparent window creation
    console.log(`\n=== Test 3: Transparent Window ===`);
    try {
        const transparentWindow = new BrowserWindow({
            width: 400,
            height: 300,
            show: false,
            transparent: true,
            frame: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });
        console.log('Transparent window created successfully');
        transparentWindow.close();
    } catch (error) {
        console.error(`Transparent window creation failed: ${error.message}`);
    }
    
    // Test 4: System Tray
    console.log(`\n=== Test 4: System Tray ===`);
    try {
        const iconPath = path.join(__dirname, '../../../src/assets/images/icon.ico');
        const trayIcon = nativeImage.createFromPath(iconPath);
        const testTray = new Tray(trayIcon);
        testTray.setToolTip('Test Tray');
        console.log('System tray created successfully');
        testTray.destroy();
    } catch (error) {
        console.error(`System tray creation failed: ${error.message}`);
    }
    
    // Test 5: Settings directory
    console.log(`\n=== Test 5: Settings Directory ===`);
    try {
        const userDataPath = app.getPath('userData');
        console.log(`User data path: ${userDataPath}`);
        
        const settingsPath = path.join(userDataPath, 'config.json');
        console.log(`Settings path: ${settingsPath}`);
        console.log(`Settings exists: ${fs.existsSync(settingsPath)}`);
        
        // Test plugins directory
        const pluginsPath = path.join(process.env.LOCALAPPDATA || userDataPath, 'MTechTool', 'Plugins');
        console.log(`Plugins path: ${pluginsPath}`);
        console.log(`Plugins dir exists: ${fs.existsSync(pluginsPath)}`);
        
    } catch (error) {
        console.error(`Settings directory test failed: ${error.message}`);
    }
    
    console.log('\n=== Diagnostic Complete ===');
    console.log('If any tests failed, those are likely causing the red flashing icon.');
    console.log('Check the console output above for specific error messages.');
    
    setTimeout(() => {
        app.quit();
    }, 2000);
});

app.on('window-all-closed', () => {
    app.quit();
});
