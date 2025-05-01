/**
 * WinTool - System Commands Module
 * Provides functions to launch various system tools and utilities
 */

const { exec } = require('child_process');

/**
 * Launch Windows Task Manager
 */
function launchTaskManager() {
    return new Promise((resolve, reject) => {
        exec('taskmgr', (error) => {
            if (error) {
                reject(new Error(`Failed to launch Task Manager: ${error.message}`));
            } else {
                resolve({ success: true });
            }
        });
    });
}

/**
 * Launch Windows Disk Cleanup utility
 */
function launchDiskCleanup() {
    return new Promise((resolve, reject) => {
        exec('cleanmgr', (error) => {
            if (error) {
                reject(new Error(`Failed to launch Disk Cleanup: ${error.message}`));
            } else {
                resolve({ success: true });
            }
        });
    });
}

/**
 * Launch a system tool by name
 * @param {string} toolName - Name of the tool to launch
 */
function launchSystemTool(toolName) {
    const tools = {
        'disk_cleanup': 'cleanmgr',
        'task_manager': 'taskmgr',
        'msconfig': 'msconfig',
        'system_info': 'msinfo32',
        'cmd': 'cmd /c start cmd.exe /k cd /d %USERPROFILE%',
        'power_options': 'control powercfg.cpl',
        'security_center': 'wscui.cpl'
    };
    
    const cmd = tools[toolName];
    if (!cmd) {
        return Promise.reject(new Error('Unknown system tool: ' + toolName));
    }
    
    return new Promise((resolve, reject) => {
        exec(cmd, (err) => {
            if (err) reject(err);
            else resolve({ success: true });
        });
    });
}

module.exports = {
    launchTaskManager,
    launchDiskCleanup,
    launchSystemTool
};
