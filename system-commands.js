const { execFile, spawn } = require('child_process');

function launchTaskManager() {
  return new Promise((resolve, reject) => {
    execFile('taskmgr.exe', (error) => {
      if (error) return reject(new Error('Failed to launch Task Manager.'));
      resolve('Task Manager launched.');
    });
  });
}

function launchDiskCleanup() {
  return new Promise((resolve, reject) => {
    execFile('cleanmgr.exe', (error) => {
      if (error) return reject(new Error('Failed to launch Disk Cleanup.'));
      resolve('Disk Cleanup launched.');
    });
  });
}

// Add additional quick actions as needed

module.exports = { launchTaskManager, launchDiskCleanup };
