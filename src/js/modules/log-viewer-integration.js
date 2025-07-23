/**
 * WinTool - Log Viewer Integration Module
 *
 * This module handles the integration of the log viewer with the main application
 */

const { BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

// Log viewer window reference
let logViewerWindow = null;

/**
 * Create the log viewer window
 */
function createLogViewerWindow() {
  if (logViewerWindow) {
    logViewerWindow.focus();
    return;
  }

  logViewerWindow = new BrowserWindow({
    width: 900,
    height: 700,
    title: 'WinTool Log Viewer',
    webPreferences: {
      preload: path.join(__dirname, '../../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../../assets/images/icon.ico'),
    show: false,
  });

  logViewerWindow.loadFile(path.join(__dirname, '../../log-viewer.html'));

  // Set the log viewer window reference in the logger module
  logger.setLogViewerWindow(logViewerWindow);

  logViewerWindow.once('ready-to-show', () => {
    logViewerWindow.show();

    // Send current theme data to log viewer
    const store = global.store;
    if (store) {
      const theme = store.get('theme', 'classic-dark');
      const primaryColor = store.get('primaryColor', '#007bff');
      const customTheme = store.get('customTheme', null);

      logViewerWindow.webContents.send('theme-data', { theme, primaryColor, customTheme });
    }
  });

  logViewerWindow.on('closed', () => {
    logViewerWindow = null;
    logger.setLogViewerWindow(null);
  });

  return logViewerWindow;
}

/**
 * Initialize log viewer IPC handlers
 */
function initLogViewerHandlers() {
  // Open log viewer window
  ipcMain.handle('open-log-viewer', () => {
    createLogViewerWindow();
  });

  // Export logs to file
  ipcMain.handle('export-logs', async (event, content) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Logs',
        defaultPath: `wintool-logs-${new Date().toISOString().replace(/:/g, '-')}.log`,
        filters: [
          { name: 'Log Files', extensions: ['log'] },
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (!canceled && filePath) {
        await fs.writeFile(filePath, content, 'utf8');
        return { success: true, path: filePath };
      }

      return { success: false, reason: 'Operation canceled' };
    } catch (error) {
      console.error('Failed to export logs:', error);
      return { success: false, reason: error.message };
    }
  });

  // Open log file in default text editor
  ipcMain.handle('open-log-file', async () => {
    try {
      const logFilePath = logger.getLogFilePath();
      await shell.openPath(logFilePath);
      return { success: true };
    } catch (error) {
      console.error('Failed to open log file:', error);
      return { success: false, reason: error.message };
    }
  });

  // Get log file path
  ipcMain.handle('get-log-file-path', () => {
    return logger.getLogFilePath();
  });

  // Get error log file path
  ipcMain.handle('get-error-log-file-path', () => {
    return logger.getErrorLogFilePath();
  });
}

module.exports = {
  createLogViewerWindow,
  initLogViewerHandlers,
};
