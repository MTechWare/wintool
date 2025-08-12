const path = require('path');

// Returns the user-writable path for storing app data.
// Prefers LOCALAPPDATA on Windows, falls back to Electron's userData path.
function getAppDataPath(app) {
  let basePath;

  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    basePath = process.env.LOCALAPPDATA;
  } else {
    basePath = app.getPath('userData');
  }

  return path.join(basePath, 'MTechWare', 'WinTool');
}

module.exports = { getAppDataPath };
