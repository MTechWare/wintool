/**
 * Logging Management Module
 * Handles enhanced logging, console overrides, security logging, and log viewer integration
 */

const { ipcMain } = require('electron');

class LoggingManager {
    /**
     * Creates a new LoggingManager instance.
     * Initializes console overrides, IPC handlers, and preserves original console methods.
     *
     * @constructor
     */
    constructor() {
        this.originalLog = console.log;
        this.originalWarn = console.warn;
        this.originalError = console.error;
        this.originalDebug = console.debug;
        this.originalTrace = console.trace;

        // Bind methods to preserve context
        this.setupConsoleOverrides = this.setupConsoleOverrides.bind(this);
        this.sendToLogViewer = this.sendToLogViewer.bind(this);
        this.logSecurity = this.logSecurity.bind(this);

        this.setupIpcHandlers();
        this.setupConsoleOverrides();
    }

    /**
     * Set up IPC handlers for custom log messages from renderer processes.
     * Handles log-custom-message IPC calls and routes them to appropriate logging methods.
     *
     * @returns {void}
     */
    setupIpcHandlers() {
        // Handle custom log messages from renderer processes
        ipcMain.handle('log-custom-message', (event, level, message, source) => {
            if (this) {
                switch (level) {
                    case 'info':
                        this.logInfo(message, source);
                        break;
                    case 'warn':
                        this.logWarn(message, source);
                        break;
                    case 'error':
                        this.logError(message, source);
                        break;
                    case 'debug':
                        this.logDebug(message, source);
                        break;
                    case 'success':
                        this.logSuccess(message, source);
                        break;
                    case 'trace':
                        this.logTrace(message, source);
                        break;
                    default:
                        this.logInfo(message, source);
                }
            }
            return { success: true };
        });
    }

    /**
     * Set dependencies for the logging manager using dependency injection.
     * Allows injection of window manager for log viewer integration.
     *
     * @param {Object} dependencies - Object containing dependency instances
     * @param {Object} dependencies.windowManager - Window manager instance for log viewer access
     * @returns {void}
     */
    setDependencies(dependencies) {
        this.windowManager = dependencies.windowManager;
    }

    /**
     * Set up console method overrides to intercept and forward console output.
     * Overrides console.log, console.warn, console.error, console.debug, and console.trace.
     *
     * @returns {void}
     */
    setupConsoleOverrides() {
        // Override console.log
        console.log = (...args) => {
            this.originalLog.apply(console, args);
            this.sendToLogViewer('info', args.join(' '), 'System');
        };

        // Override console.warn
        console.warn = (...args) => {
            this.originalWarn.apply(console, args);
            this.sendToLogViewer('warn', args.join(' '), 'System');
        };

        // Override console.error
        console.error = (...args) => {
            this.originalError.apply(console, args);
            this.sendToLogViewer('error', args.join(' '), 'System');
        };

        // Override console.debug
        console.debug = (...args) => {
            this.originalDebug.apply(console, args);
            this.sendToLogViewer('debug', args.join(' '), 'System');
        };

        // Override console.trace
        console.trace = (...args) => {
            this.originalTrace.apply(console, args);
            this.sendToLogViewer('trace', args.join(' '), 'System');
        };
    }

    /**
     * Send log message to the log viewer window if available.
     * Forwards log messages to the log viewer window via IPC for real-time display.
     *
     * @param {string} level - Log level (info, warn, error, debug, success, trace)
     * @param {string} message - Log message content
     * @param {string} [source='System'] - Source of the log message
     * @returns {void}
     */
    sendToLogViewer(level, message, source = 'System') {
        if (this.windowManager) {
            const logViewerWindow = this.windowManager.getLogViewerWindow();
            if (logViewerWindow && !logViewerWindow.isDestroyed()) {
                logViewerWindow.webContents.send('log-message', level, message, source);
            }
        }
    }

    /**
     * Log an informational message with source tracking.
     *
     * @param {string} message - The message to log
     * @param {string} [source='System'] - Source of the log message
     * @returns {void}
     */
    logInfo(message, source = 'System') {
        this.originalLog(`[INFO] ${source}: ${message}`);
        this.sendToLogViewer('info', message, source);
    }

    /**
     * Log a warning message with source tracking.
     *
     * @param {string} message - The warning message to log
     * @param {string} [source='System'] - Source of the log message
     * @returns {void}
     */
    logWarn(message, source = 'System') {
        this.originalWarn(`[WARN] ${source}: ${message}`);
        this.sendToLogViewer('warn', message, source);
    }

    /**
     * Log an error message with source tracking.
     *
     * @param {string} message - The error message to log
     * @param {string} [source='System'] - Source of the log message
     * @returns {void}
     */
    logError(message, source = 'System') {
        this.originalError(`[ERROR] ${source}: ${message}`);
        this.sendToLogViewer('error', message, source);
    }

    /**
     * Log a debug message with source tracking.
     *
     * @param {string} message - The debug message to log
     * @param {string} [source='System'] - Source of the log message
     * @returns {void}
     */
    logDebug(message, source = 'System') {
        this.originalDebug(`[DEBUG] ${source}: ${message}`);
        this.sendToLogViewer('debug', message, source);
    }

    /**
     * Log a success message with source tracking.
     *
     * @param {string} message - The success message to log
     * @param {string} [source='System'] - Source of the log message
     * @returns {void}
     */
    logSuccess(message, source = 'System') {
        this.originalLog(`[SUCCESS] ${source}: ${message}`);
        this.sendToLogViewer('success', message, source);
    }

    /**
     * Log a trace message with source tracking.
     *
     * @param {string} message - The trace message to log
     * @param {string} [source='System'] - Source of the log message
     * @returns {void}
     */
    logTrace(message, source = 'System') {
        this.originalTrace(`[TRACE] ${source}: ${message}`);
        this.sendToLogViewer('trace', message, source);
    }

    /**
     * Log a security-related event with timestamp and details.
     *
     * @param {string} event - The security event description
     * @param {Object} details - Additional details about the security event
     * @param {string} [source='Security'] - Source of the security log
     * @returns {void}
     */
    logSecurity(event, details, source = 'Security') {
        const timestamp = new Date().toISOString();
        const message = `${event} - ${JSON.stringify(details)}`;
        this.originalLog(`[SECURITY] ${timestamp}: ${message}`);
        this.sendToLogViewer('warn', message, source);
    }

    /**
     * Restore original console methods
     */
    restoreConsole() {
        console.log = this.originalLog;
        console.warn = this.originalWarn;
        console.error = this.originalError;
        console.debug = this.originalDebug;
        console.trace = this.originalTrace;
    }

    /**
     * Get logging configuration
     */
    getLoggingConfig() {
        return {
            consoleOverridden: console.log !== this.originalLog,
            logViewerIntegration: !!this.windowManager,
            availableLevels: ['info', 'warn', 'error', 'debug', 'success', 'trace', 'security'],
        };
    }

    /**
     * Set log level filter (for future enhancement)
     */
    setLogLevel(level) {
        this.logLevel = level;
        this.logInfo(`Log level set to: ${level}`, 'LoggingManager');
    }

    /**
     * Log with custom level
     */
    log(level, message, source = 'System') {
        switch (level.toLowerCase()) {
            case 'info':
                this.logInfo(message, source);
                break;
            case 'warn':
            case 'warning':
                this.logWarn(message, source);
                break;
            case 'error':
                this.logError(message, source);
                break;
            case 'debug':
                this.logDebug(message, source);
                break;
            case 'success':
                this.logSuccess(message, source);
                break;
            case 'trace':
                this.logTrace(message, source);
                break;
            case 'security':
                this.logSecurity(message, {}, source);
                break;
            default:
                this.logInfo(message, source);
        }
    }

    /**
     * Batch log multiple messages
     */
    logBatch(messages) {
        messages.forEach(({ level, message, source }) => {
            this.log(level, message, source);
        });
    }

    /**
     * Log with timestamp
     */
    logWithTimestamp(level, message, source = 'System') {
        const timestamp = new Date().toISOString();
        const timestampedMessage = `[${timestamp}] ${message}`;
        this.log(level, timestampedMessage, source);
    }

    /**
     * Initialize the logging manager
     */
    initialize() {
        this.logInfo('Logging Manager initialized', 'LoggingManager');
        return true;
    }
}

module.exports = LoggingManager;
