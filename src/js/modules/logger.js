/**
 * WinTool - Logger Module
 *
 * Enhanced logging system using Winston for better log management
 * Integrates with the existing log viewer window
 */

const winston = require('winston');
const { format } = winston;
const path = require('path');
const { app } = require('electron');

// Create logs directory in user data folder
const logsDir = path.join(app.getPath('userData'), 'logs');
const fs = require('fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log file paths
const logFile = path.join(logsDir, 'wintool.log');
const errorLogFile = path.join(logsDir, 'wintool-error.log');

// Custom format for console and file outputs
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
  })
);

// Create Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: customFormat,
  transports: [
    // Write all logs to console
    new winston.transports.Console(),
    // Write all logs to the combined log file
    new winston.transports.File({
      filename: logFile,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
    // Write error logs to a separate file
    new winston.transports.File({
      filename: errorLogFile,
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

// Variable to store reference to log viewer window
let logViewerWindow = null;

// Set log viewer window reference
function setLogViewerWindow(window) {
  logViewerWindow = window;
}

// Override console methods to use Winston and send to log viewer
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

// Send log to log viewer window if available
function sendToLogViewer(level, message) {
  if (logViewerWindow && !logViewerWindow.isDestroyed()) {
    try {
      logViewerWindow.webContents.send('log-message', level, message);
    } catch (error) {
      // Fallback to original console if sending to log viewer fails
      originalConsole.error('Failed to send log to viewer:', error);
    }
  }
}

// Override console methods
console.log = function (...args) {
  const message = args.join(' ');
  logger.info(message);
  sendToLogViewer('info', message);
  originalConsole.log.apply(console, args);
};

console.warn = function (...args) {
  const message = args.join(' ');
  logger.warn(message);
  sendToLogViewer('warn', message);
  originalConsole.warn.apply(console, args);
};

console.error = function (...args) {
  const message = args.join(' ');
  logger.error(message);
  sendToLogViewer('error', message);
  originalConsole.error.apply(console, args);
};

console.info = function (...args) {
  const message = args.join(' ');
  logger.info(message);
  sendToLogViewer('info', message);
  originalConsole.info.apply(console, args);
};

console.debug = function (...args) {
  const message = args.join(' ');
  logger.debug(message);
  sendToLogViewer('debug', message);
  originalConsole.debug.apply(console, args);
};

// Export logger functions
module.exports = {
  logger,
  setLogViewerWindow,

  // Direct access to logger methods
  log: message => {
    logger.info(message);
    sendToLogViewer('info', message);
  },
  info: message => {
    logger.info(message);
    sendToLogViewer('info', message);
  },
  warn: message => {
    logger.warn(message);
    sendToLogViewer('warn', message);
  },
  error: message => {
    logger.error(message);
    sendToLogViewer('error', message);
  },
  debug: message => {
    logger.debug(message);
    sendToLogViewer('debug', message);
  },

  // Get log file paths
  getLogFilePath: () => logFile,
  getErrorLogFilePath: () => errorLogFile,
};
