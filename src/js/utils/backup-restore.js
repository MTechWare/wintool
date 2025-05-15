/**
 * WinTool - Backup and Restore Utility
 * Provides functionality to backup and restore application settings and system configurations
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execAsync } = require('./async-exec');
const logger = require('./logger');

// Load uuid module safely
let uuidv4;
try {
    const { v4 } = require('uuid');
    uuidv4 = v4;
} catch (error) {
    logger.error(logger.LOG_CATEGORIES.BACKUP, `Failed to load uuid module: ${error.message}`);
    // Create a stub function that generates a simple timestamp-based ID
    uuidv4 = () => `backup-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// Load archiver module safely
let archiver;
try {
    archiver = require('archiver');
} catch (error) {
    logger.error(logger.LOG_CATEGORIES.BACKUP, `Failed to load archiver module: ${error.message}`);
    // Create a stub function that returns a rejected promise
    archiver = () => {
        throw new Error('archiver module not available');
    };
}

// Load extract-zip module safely
let extract;
try {
    extract = require('extract-zip');
} catch (error) {
    logger.error(logger.LOG_CATEGORIES.BACKUP, `Failed to load extract-zip module: ${error.message}`);
    // Create a stub function that returns a rejected promise
    extract = async () => {
        throw new Error('extract-zip module not available');
    };
}

// Define backup categories
const BACKUP_CATEGORIES = {
    APP_SETTINGS: 'app_settings',
    SYSTEM_CONFIGS: 'system_configs',
    TWEAKS: 'tweaks',
    USER_PROFILES: 'user_profiles',
    CUSTOM: 'custom'
};

// Define backup locations
const getBackupDir = () => {
    const userDataPath = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Application Support') : path.join(os.homedir(), '.config'));
    return path.join(userDataPath, 'WinTool', 'backups');
};

/**
 * Create a backup of specified categories
 * @param {string} backupPath - Path to save the backup
 * @param {Object} options - Backup options
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} - Result of the backup operation
 */
async function createBackup(backupPath, options = {}, progressCallback = null) {
    // Ensure progressCallback is a function
    const reportProgress = typeof progressCallback === 'function'
        ? progressCallback
        : (progress, status) => {
            logger.info(logger.LOG_CATEGORIES.BACKUP, `Backup progress: ${progress}% - ${status}`);
        };

    try {
        logger.info(logger.LOG_CATEGORIES.BACKUP, `Starting backup to ${backupPath}`);
        reportProgress(0, 'Initializing backup...');

        // Create temp directory for backup
        const tempDir = path.join(os.tmpdir(), `wintool_backup_${Date.now()}`);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Create metadata
        const metadata = {
            id: uuidv4(),
            date: new Date().toISOString(),
            version: process.env.npm_package_version || 'unknown',
            categories: options.categories || [BACKUP_CATEGORIES.APP_SETTINGS],
            description: options.description || 'WinTool Backup',
            items: {}
        };

        reportProgress(10, 'Collecting application settings...');

        // Backup application settings
        if (options.categories?.includes(BACKUP_CATEGORIES.APP_SETTINGS)) {
            await backupAppSettings(tempDir, metadata);
        }

        // Backup system configurations
        if (options.categories?.includes(BACKUP_CATEGORIES.SYSTEM_CONFIGS)) {
            reportProgress(30, 'Collecting system configurations...');
            await backupSystemConfigs(tempDir, metadata);
        }

        // Backup tweaks
        if (options.categories?.includes(BACKUP_CATEGORIES.TWEAKS)) {
            reportProgress(50, 'Collecting applied tweaks...');
            await backupTweaks(tempDir, metadata);
        }

        // Backup user profiles
        if (options.categories?.includes(BACKUP_CATEGORIES.USER_PROFILES)) {
            reportProgress(70, 'Collecting user profiles...');
            await backupUserProfiles(tempDir, metadata);
        }

        // Save metadata
        const metadataPath = path.join(tempDir, 'backup_metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        // Create zip archive
        reportProgress(80, 'Creating backup archive...');

        // Ensure backup directory exists
        const backupDir = path.dirname(backupPath);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        try {
            const output = fs.createWriteStream(backupPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.pipe(output);
            archive.directory(tempDir, false);

            await new Promise((resolve, reject) => {
                output.on('close', resolve);
                archive.on('error', reject);
                archive.finalize();
            });
        } catch (archiverError) {
            logger.error(logger.LOG_CATEGORIES.BACKUP, `Error creating backup archive: ${archiverError.message}`);
            throw new Error(`Failed to create backup archive: ${archiverError.message}`);
        }

        // Create verification file if requested
        if (options.createVerification) {
            reportProgress(90, 'Creating verification data...');

            // Create verification by calculating file size and modified date
            const stats = fs.statSync(backupPath);
            const verificationData = {
                size: stats.size,
                modified: stats.mtime,
                path: backupPath,
                metadata: metadata
            };

            const verificationPath = `${backupPath}.verify`;
            fs.writeFileSync(verificationPath, JSON.stringify(verificationData, null, 2));
        }

        // Add to backup history
        addToBackupHistory({
            path: backupPath,
            date: new Date().toISOString(),
            description: options.description || 'WinTool Backup',
            categories: options.categories || [BACKUP_CATEGORIES.APP_SETTINGS],
            verified: options.createVerification || false
        });

        // Clean up temp directory
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
            logger.warn(logger.LOG_CATEGORIES.BACKUP, `Failed to clean up temp directory: ${cleanupError.message}`);
        }

        reportProgress(100, 'Backup completed successfully');

        return {
            success: true,
            message: 'Backup completed successfully',
            path: backupPath,
            metadata: metadata
        };
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.BACKUP, `Backup failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Restore from a backup file
 * @param {string} backupFile - Path to the backup file
 * @param {Object} options - Restore options
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} - Result of the restore operation
 */
async function restoreBackup(backupFile, options = {}, progressCallback = null) {
    // Ensure progressCallback is a function
    const reportProgress = typeof progressCallback === 'function'
        ? progressCallback
        : (progress, status) => {
            logger.info(logger.LOG_CATEGORIES.RESTORE, `Restore progress: ${progress}% - ${status}`);
        };

    try {
        logger.info(logger.LOG_CATEGORIES.RESTORE, `Starting restore from ${backupFile}`);
        reportProgress(0, 'Initializing restore...');

        // Create temp directory for extraction
        const tempDir = path.join(os.tmpdir(), `wintool_restore_${Date.now()}`);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Extract backup
        reportProgress(10, 'Extracting backup archive...');
        try {
            await extract(backupFile, { dir: tempDir });
        } catch (extractError) {
            logger.error(logger.LOG_CATEGORIES.RESTORE, `Error extracting backup: ${extractError.message}`);
            throw new Error(`Failed to extract backup: ${extractError.message}`);
        }

        // Read backup metadata
        const metadataPath = path.join(tempDir, 'backup_metadata.json');
        if (!fs.existsSync(metadataPath)) {
            throw new Error('Invalid backup file: metadata not found');
        }

        const metadataContent = fs.readFileSync(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);

        // Verify backup if verification is enabled
        if (options.verifyBackup) {
            reportProgress(20, 'Verifying backup integrity...');
            const verificationPath = `${backupFile}.verify`;
            if (fs.existsSync(verificationPath)) {
                const verificationContent = fs.readFileSync(verificationPath, 'utf8');
                const verification = JSON.parse(verificationContent);

                // Compare metadata
                if (JSON.stringify(verification.metadata) !== JSON.stringify(metadata)) {
                    throw new Error('Backup verification failed: metadata mismatch');
                }
            }
        }

        // Restore based on categories
        const categoriesToRestore = options.categories || metadata.categories;

        // Restore application settings
        if (categoriesToRestore.includes(BACKUP_CATEGORIES.APP_SETTINGS)) {
            reportProgress(30, 'Restoring application settings...');
            await restoreAppSettings(tempDir, metadata);
        }

        // Restore system configurations
        if (categoriesToRestore.includes(BACKUP_CATEGORIES.SYSTEM_CONFIGS)) {
            reportProgress(50, 'Restoring system configurations...');
            await restoreSystemConfigs(tempDir, metadata);
        }

        // Restore tweaks
        if (categoriesToRestore.includes(BACKUP_CATEGORIES.TWEAKS)) {
            reportProgress(70, 'Restoring tweaks...');
            await restoreTweaks(tempDir, metadata);
        }

        // Restore user profiles
        if (categoriesToRestore.includes(BACKUP_CATEGORIES.USER_PROFILES)) {
            reportProgress(90, 'Restoring user profiles...');
            await restoreUserProfiles(tempDir, metadata);
        }

        // Clean up temp directory
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
            logger.warn(logger.LOG_CATEGORIES.RESTORE, `Failed to clean up temp directory: ${cleanupError.message}`);
        }

        reportProgress(100, 'Restore completed successfully');

        return {
            success: true,
            message: 'Restore completed successfully',
            metadata: metadata
        };
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.RESTORE, `Restore failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Backup application settings
 * @param {string} tempDir - Temporary directory for backup
 * @param {Object} metadata - Backup metadata
 */
async function backupAppSettings(tempDir, metadata) {
    try {
        // Create settings directory
        const settingsDir = path.join(tempDir, 'app_settings');
        fs.mkdirSync(settingsDir, { recursive: true });

        // Get localStorage data from the renderer process
        // This will be handled by the renderer process and passed to the main process
        metadata.items.app_settings = {
            count: 0,
            description: 'Application settings and preferences'
        };

        // The actual settings will be collected from the renderer process
        // and saved to a file in the settings directory
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.BACKUP, `Error backing up app settings: ${error.message}`);
        throw error;
    }
}

/**
 * Backup system configurations
 * @param {string} tempDir - Temporary directory for backup
 * @param {Object} metadata - Backup metadata
 */
async function backupSystemConfigs(tempDir, metadata) {
    try {
        // Create system configs directory
        const configsDir = path.join(tempDir, 'system_configs');
        fs.mkdirSync(configsDir, { recursive: true });

        // Export registry settings
        const regExportPath = path.join(configsDir, 'wintool_registry.reg');
        await execAsync(`reg export "HKCU\\Software\\WinTool" "${regExportPath}" /y`);

        metadata.items.system_configs = {
            count: 1,
            description: 'System configurations and registry settings'
        };
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.BACKUP, `Error backing up system configs: ${error.message}`);
        // Don't throw, just log the error and continue
        metadata.items.system_configs = {
            count: 0,
            description: 'Failed to backup system configurations',
            error: error.message
        };
    }
}

/**
 * Backup applied tweaks
 * @param {string} tempDir - Temporary directory for backup
 * @param {Object} metadata - Backup metadata
 */
async function backupTweaks(tempDir, metadata) {
    try {
        // Create tweaks directory
        const tweaksDir = path.join(tempDir, 'tweaks');
        fs.mkdirSync(tweaksDir, { recursive: true });

        // The actual tweaks will be collected from the renderer process
        // and saved to a file in the tweaks directory
        metadata.items.tweaks = {
            count: 0,
            description: 'Applied system tweaks and optimizations'
        };
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.BACKUP, `Error backing up tweaks: ${error.message}`);
        throw error;
    }
}

/**
 * Backup user profiles
 * @param {string} tempDir - Temporary directory for backup
 * @param {Object} metadata - Backup metadata
 */
async function backupUserProfiles(tempDir, metadata) {
    try {
        // Create profiles directory
        const profilesDir = path.join(tempDir, 'user_profiles');
        fs.mkdirSync(profilesDir, { recursive: true });

        // The actual profiles will be collected from the renderer process
        // and saved to a file in the profiles directory
        metadata.items.user_profiles = {
            count: 0,
            description: 'User profiles and preferences'
        };
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.BACKUP, `Error backing up user profiles: ${error.message}`);
        throw error;
    }
}

/**
 * Restore application settings
 * @param {string} tempDir - Temporary directory with extracted backup
 * @param {Object} metadata - Backup metadata
 */
async function restoreAppSettings(tempDir, metadata) {
    try {
        const settingsDir = path.join(tempDir, 'app_settings');
        if (!fs.existsSync(settingsDir)) {
            logger.warn(logger.LOG_CATEGORIES.RESTORE, 'App settings directory not found in backup');
            return;
        }

        // The actual settings will be restored by the renderer process
        // based on the files in the settings directory
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.RESTORE, `Error restoring app settings: ${error.message}`);
        throw error;
    }
}

/**
 * Restore system configurations
 * @param {string} tempDir - Temporary directory with extracted backup
 * @param {Object} metadata - Backup metadata
 */
async function restoreSystemConfigs(tempDir, metadata) {
    try {
        const configsDir = path.join(tempDir, 'system_configs');
        if (!fs.existsSync(configsDir)) {
            logger.warn(logger.LOG_CATEGORIES.RESTORE, 'System configs directory not found in backup');
            return;
        }

        // Import registry settings
        const regImportPath = path.join(configsDir, 'wintool_registry.reg');
        if (fs.existsSync(regImportPath)) {
            await execAsync(`reg import "${regImportPath}"`);
        }
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.RESTORE, `Error restoring system configs: ${error.message}`);
        // Don't throw, just log the error and continue
    }
}

/**
 * Restore tweaks
 * @param {string} tempDir - Temporary directory with extracted backup
 * @param {Object} metadata - Backup metadata
 */
async function restoreTweaks(tempDir, metadata) {
    try {
        const tweaksDir = path.join(tempDir, 'tweaks');
        if (!fs.existsSync(tweaksDir)) {
            logger.warn(logger.LOG_CATEGORIES.RESTORE, 'Tweaks directory not found in backup');
            return;
        }

        // The actual tweaks will be restored by the renderer process
        // based on the files in the tweaks directory
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.RESTORE, `Error restoring tweaks: ${error.message}`);
        throw error;
    }
}

/**
 * Restore user profiles
 * @param {string} tempDir - Temporary directory with extracted backup
 * @param {Object} metadata - Backup metadata
 */
async function restoreUserProfiles(tempDir, metadata) {
    try {
        const profilesDir = path.join(tempDir, 'user_profiles');
        if (!fs.existsSync(profilesDir)) {
            logger.warn(logger.LOG_CATEGORIES.RESTORE, 'User profiles directory not found in backup');
            return;
        }

        // The actual profiles will be restored by the renderer process
        // based on the files in the profiles directory
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.RESTORE, `Error restoring user profiles: ${error.message}`);
        throw error;
    }
}

/**
 * Add backup to history
 * @param {Object} backupInfo - Information about the backup
 */
function addToBackupHistory(backupInfo) {
    try {
        const backupDir = getBackupDir();
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const historyPath = path.join(backupDir, 'backup_history.json');
        let history = [];

        if (fs.existsSync(historyPath)) {
            const historyContent = fs.readFileSync(historyPath, 'utf8');
            history = JSON.parse(historyContent);
        }

        history.push(backupInfo);

        // Keep only the last 20 entries
        if (history.length > 20) {
            history = history.slice(history.length - 20);
        }

        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.BACKUP, `Error adding to backup history: ${error.message}`);
    }
}

/**
 * Get backup history
 * @returns {Array} - Backup history
 */
function getBackupHistory() {
    try {
        const backupDir = getBackupDir();
        const historyPath = path.join(backupDir, 'backup_history.json');

        if (!fs.existsSync(historyPath)) {
            return [];
        }

        const historyContent = fs.readFileSync(historyPath, 'utf8');
        return JSON.parse(historyContent);
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.BACKUP, `Error getting backup history: ${error.message}`);
        return [];
    }
}

// Export the module
module.exports = {
    createBackup,
    restoreBackup,
    BACKUP_CATEGORIES,
    getBackupDir,
    getBackupHistory
};
