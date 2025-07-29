/**
 * WinTool Security Configuration
 *
 * This file contains security settings and configurations for production deployment
 */

module.exports = {
    // Rate limiting configuration
    rateLimiting: {
        windowMs: 60000, // 1 minute
        maxRequests: 30, // 30 requests per minute
        enabled: true,
    },

    // Allowed commands for security
    allowedCommands: {
        winget: ['search', 'install', 'uninstall', 'list', 'show', 'source', 'upgrade'],
        systemUtilities: [
            'taskmgr',
            'devmgmt.msc',
            'diskmgmt.msc',
            'services.msc',
            'eventvwr.msc',
            'perfmon.msc',
            'compmgmt.msc',
            'gpedit.msc',
            'secpol.msc',
            'lusrmgr.msc',
            'regedit',
            'msconfig',
            'cmd',
            'powershell',
            'control',
            'appwiz.cpl',
            'desk.cpl',
            'firewall.cpl',
            'inetcpl.cpl',
            'intl.cpl',
            'main.cpl',
            'mmsys.cpl',
            'ncpa.cpl',
            'powercfg.cpl',
            'sysdm.cpl',
            'timedate.cpl',
            'wscui.cpl',
            'cleanmgr',
            'dxdiag',
            'msinfo32',
            'resmon',
            'winver',
        ],
        serviceActions: ['start', 'stop', 'restart'],
    },

    // Input validation rules
    validation: {
        serviceName: {
            maxLength: 100,
            allowedChars: /^[a-zA-Z0-9_-]+$/,
        },
        commandLength: {
            max: 500,
        },
    },

    // Security logging
    logging: {
        enabled: true,
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        logSecurityEvents: true,
        logFailedAttempts: true,
    },

    // PowerShell execution settings
    powershell: {
        useShell: false, // Never use shell: true for security
        executionPolicy: 'Bypass', // Required for scripts to run
        noProfile: true, // Don't load PowerShell profiles
        timeout: 30000, // 30 second timeout
    },

    // File system restrictions
    fileSystem: {
        allowedScriptPaths: [
            'scripts/scan-temp.ps1',
            'scripts/scan-system.ps1',
            'scripts/scan-cache.ps1',
            'scripts/clean-temp.ps1',
            'scripts/clean-system.ps1',
            'scripts/clean-cache.ps1',
            'scripts/get-disk-space.ps1',
        ],
        scriptDirectory: __dirname + '/../',
    },

    // Network security
    network: {
        allowedHosts: [], // Add any external hosts if needed
        timeout: 10000, // 10 second timeout
    },

    // Development vs Production settings
    development: {
        enableDevTools: true,
        verboseLogging: true,
        skipRateLimit: false, // Keep rate limiting even in dev
    },

    production: {
        enableDevTools: false,
        verboseLogging: false,
        skipRateLimit: false,
        requireSignedScripts: false, // Set to true if using signed PowerShell scripts
    },
};
