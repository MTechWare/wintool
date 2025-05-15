/**
 * WinTool - Logger Utility
 * Provides standardized logging functionality with categories, levels, and file output
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const os = require('os');

// Log levels
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4
};

// Log categories
const LOG_CATEGORIES = {
    SYSTEM: 'SYSTEM',
    NETWORK: 'NETWORK',
    ADMIN: 'ADMIN',
    TWEAKS: 'TWEAKS',
    DRIVERS: 'DRIVERS',
    PACKAGES: 'PACKAGES',
    UI: 'UI',
    HARDWARE: 'HARDWARE',
    SECURITY: 'SECURITY',
    GENERAL: 'GENERAL',
    PERFORMANCE: 'PERFORMANCE',
    USER: 'USER',
    DEPENDENCY: 'DEPENDENCY',
    BACKUP: 'BACKUP',
    RESTORE: 'RESTORE'
};

// Default configuration
const DEFAULT_CONFIG = {
    consoleLevel: LOG_LEVELS.INFO,
    fileLevel: LOG_LEVELS.DEBUG,
    enableConsole: true,
    enableFile: true,
    maxLogSize: 10 * 1024 * 1024, // 10MB
    maxLogFiles: 5,
    logDirectory: null, // Will be set during initialization
    logFilename: 'wintool.log'
};

// Current configuration
let config = { ...DEFAULT_CONFIG };

// Log file stream
let logStream = null;

/**
 * Initialize the logger
 * @param {Object} options - Configuration options
 */
function initialize(options = {}) {
    // Merge options with defaults
    config = { ...DEFAULT_CONFIG, ...options };

    // Set log directory if not specified
    if (!config.logDirectory) {
        const userDataPath = app ? app.getPath('userData') : path.join(os.homedir(), 'AppData', 'Roaming', 'WinTool');
        config.logDirectory = path.join(userDataPath, 'logs');
    }

    // Create log directory if it doesn't exist
    if (config.enableFile) {
        try {
            if (!fs.existsSync(config.logDirectory)) {
                fs.mkdirSync(config.logDirectory, { recursive: true });
            }

            // Rotate logs if needed
            rotateLogFiles();

            // Open log file stream
            const logFilePath = path.join(config.logDirectory, config.logFilename);
            logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

            // Log initialization
            log(LOG_LEVELS.INFO, LOG_CATEGORIES.SYSTEM, 'Logger initialized');
        } catch (error) {
            console.error('Failed to initialize logger:', error);
        }
    }
}

/**
 * Rotate log files if the current log file exceeds the maximum size
 */
function rotateLogFiles() {
    const logFilePath = path.join(config.logDirectory, config.logFilename);

    // Check if log file exists and exceeds max size
    if (fs.existsSync(logFilePath)) {
        const stats = fs.statSync(logFilePath);
        if (stats.size >= config.maxLogSize) {
            // Rotate existing log files
            for (let i = config.maxLogFiles - 1; i > 0; i--) {
                const oldFile = path.join(config.logDirectory, `wintool.${i}.log`);
                const newFile = path.join(config.logDirectory, `wintool.${i + 1}.log`);

                if (fs.existsSync(oldFile)) {
                    try {
                        if (fs.existsSync(newFile)) {
                            fs.unlinkSync(newFile);
                        }
                        fs.renameSync(oldFile, newFile);
                    } catch (error) {
                        console.error(`Error rotating log file ${oldFile}:`, error);
                    }
                }
            }

            // Rename current log file
            try {
                const newFile = path.join(config.logDirectory, 'wintool.1.log');
                if (fs.existsSync(newFile)) {
                    fs.unlinkSync(newFile);
                }
                fs.renameSync(logFilePath, newFile);
            } catch (error) {
                console.error('Error rotating current log file:', error);
            }
        }
    }
}

/**
 * Format a log message
 * @param {number} level - Log level
 * @param {string} category - Log category
 * @param {string} message - Log message
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, category, message) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'UNKNOWN';
    return `[${timestamp}] [${levelName}] [${category}] ${message}`;
}

/**
 * Log a message
 * @param {number} level - Log level
 * @param {string} category - Log category
 * @param {string} message - Log message
 */
function log(level, category, message) {
    const formattedMessage = formatLogMessage(level, category, message);

    // Log to console if enabled and level is sufficient
    if (config.enableConsole && level >= config.consoleLevel) {
        switch (level) {
            case LOG_LEVELS.DEBUG:
                console.debug(formattedMessage);
                break;
            case LOG_LEVELS.INFO:
                console.log(formattedMessage);
                break;
            case LOG_LEVELS.WARN:
                console.warn(formattedMessage);
                break;
            case LOG_LEVELS.ERROR:
            case LOG_LEVELS.FATAL:
                console.error(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }
    }

    // Log to file if enabled and level is sufficient
    if (config.enableFile && logStream && level >= config.fileLevel) {
        logStream.write(formattedMessage + '\n');
    }
}

/**
 * Close the logger
 */
function close() {
    if (logStream) {
        logStream.end();
        logStream = null;
    }
}

// Convenience methods for different log levels
const debug = (category, message) => log(LOG_LEVELS.DEBUG, category, message);
const info = (category, message) => log(LOG_LEVELS.INFO, category, message);
const warn = (category, message) => log(LOG_LEVELS.WARN, category, message);
const error = (category, message) => log(LOG_LEVELS.ERROR, category, message);
const fatal = (category, message) => log(LOG_LEVELS.FATAL, category, message);

/**
 * Log system information
 */
function logSystemInfo() {
    try {
        info(LOG_CATEGORIES.SYSTEM, `OS: ${os.platform()} ${os.release()}`);
        info(LOG_CATEGORIES.SYSTEM, `Architecture: ${os.arch()}`);
        info(LOG_CATEGORIES.SYSTEM, `CPU: ${os.cpus()[0].model} (${os.cpus().length} cores)`);
        info(LOG_CATEGORIES.SYSTEM, `Memory: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`);
        info(LOG_CATEGORIES.SYSTEM, `Free Memory: ${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB`);
        info(LOG_CATEGORIES.SYSTEM, `Node.js: ${process.version}`);
        info(LOG_CATEGORIES.SYSTEM, `Electron: ${process.versions.electron}`);

        // Log screen information if available
        if (process.type === 'renderer') {
            const { screen } = require('electron').remote;
            const primaryDisplay = screen.getPrimaryDisplay();
            info(LOG_CATEGORIES.SYSTEM, `Screen: ${primaryDisplay.size.width}x${primaryDisplay.size.height} (${primaryDisplay.scaleFactor}x)`);
        }
    } catch (error) {
        warn(LOG_CATEGORIES.SYSTEM, `Error logging system info: ${error.message}`);
    }
}

/**
 * Measure performance of an operation
 * @param {string} operation - Name of the operation
 * @param {Function} callback - Function to measure
 * @returns {*} - Result of the callback
 */
function measurePerformance(operation, callback) {
    const startTime = performance.now();
    const result = callback();
    const endTime = performance.now();
    debug(LOG_CATEGORIES.PERFORMANCE, `${operation} took ${(endTime - startTime).toFixed(2)}ms`);
    return result;
}

/**
 * Log a user action
 * @param {string} action - The action performed
 * @param {Object} details - Additional details about the action
 */
function logUserAction(action, details = {}) {
    info(LOG_CATEGORIES.USER, `User performed ${action}: ${JSON.stringify(details)}`);
}

/**
 * Get all logs from the current session
 * @returns {Array} - Array of log entries
 */
const inMemoryLogs = [];
function getAllLogs() {
    return inMemoryLogs;
}

/**
 * Get filtered logs
 * @param {Object} filters - Filters to apply
 * @returns {Array} - Filtered log entries
 */
function getFilteredLogs(filters = {}) {
    let filteredLogs = [...inMemoryLogs];

    if (filters.level !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.level >= filters.level);
    }

    if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category);
    }

    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredLogs = filteredLogs.filter(log =>
            log.message.toLowerCase().includes(searchLower) ||
            log.category.toLowerCase().includes(searchLower)
        );
    }

    return filteredLogs;
}

/**
 * Export logs to a file
 * @param {string} filePath - Path to save the logs
 * @param {Object} filters - Filters to apply before exporting
 * @returns {Promise} - Promise that resolves when the export is complete
 */
function exportLogs(filePath, filters = {}) {
    return new Promise((resolve, reject) => {
        try {
            const logs = getFilteredLogs(filters);
            const logText = logs.map(log =>
                `[${log.timestamp}] [${log.levelName}] [${log.category}] ${log.message}`
            ).join('\n');

            fs.writeFile(filePath, logText, 'utf8', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(filePath);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Modify the log function to store logs in memory
const originalLog = log;
log = function(level, category, message) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'UNKNOWN';

    // Store log in memory
    inMemoryLogs.push({
        timestamp,
        level,
        levelName,
        category,
        message
    });

    // Limit in-memory logs to prevent memory issues
    if (inMemoryLogs.length > 1000) {
        inMemoryLogs.shift();
    }

    // Call the original log function
    return originalLog(level, category, message);
};

// Export the logger
module.exports = {
    initialize,
    close,
    log,
    debug,
    info,
    warn,
    error,
    fatal,
    LOG_LEVELS,
    LOG_CATEGORIES,
    logSystemInfo,
    measurePerformance,
    logUserAction,
    getAllLogs,
    getFilteredLogs,
    exportLogs
};
