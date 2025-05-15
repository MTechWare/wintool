/**
 * WinTool - Backup Scheduler
 * Provides functionality to schedule automatic backups
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const logger = require('./logger');
const backupRestore = require('./backup-restore');

// Default backup schedule (once a week)
const DEFAULT_SCHEDULE = {
    enabled: false,
    frequency: 'weekly', // 'daily', 'weekly', 'monthly'
    dayOfWeek: 0, // 0 = Sunday, 1 = Monday, etc.
    dayOfMonth: 1, // 1-31
    hour: 3, // 0-23
    minute: 0, // 0-59
    keepCount: 5, // Number of backups to keep
    lastBackup: null // Date of last backup
};

// Get backup schedule configuration file path
function getScheduleConfigPath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'backup-schedule.json');
}

/**
 * Load backup schedule configuration
 * @returns {Object} Backup schedule configuration
 */
function loadSchedule() {
    try {
        const configPath = getScheduleConfigPath();
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);
            return { ...DEFAULT_SCHEDULE, ...config };
        }
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.BACKUP, `Error loading backup schedule: ${error.message}`);
    }
    
    return DEFAULT_SCHEDULE;
}

/**
 * Save backup schedule configuration
 * @param {Object} schedule - Backup schedule configuration
 */
function saveSchedule(schedule) {
    try {
        const configPath = getScheduleConfigPath();
        const configData = JSON.stringify(schedule, null, 2);
        fs.writeFileSync(configPath, configData);
        logger.info(logger.LOG_CATEGORIES.BACKUP, 'Backup schedule saved');
        return true;
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.BACKUP, `Error saving backup schedule: ${error.message}`);
        return false;
    }
}

/**
 * Set backup schedule
 * @param {Object} options - Schedule options
 * @returns {Object} Result of setting schedule
 */
function setSchedule(options) {
    try {
        const currentSchedule = loadSchedule();
        const newSchedule = { ...currentSchedule, ...options };
        
        // Validate schedule
        if (newSchedule.frequency === 'weekly' && (newSchedule.dayOfWeek < 0 || newSchedule.dayOfWeek > 6)) {
            return { success: false, error: 'Invalid day of week' };
        }
        
        if (newSchedule.frequency === 'monthly' && (newSchedule.dayOfMonth < 1 || newSchedule.dayOfMonth > 31)) {
            return { success: false, error: 'Invalid day of month' };
        }
        
        if (newSchedule.hour < 0 || newSchedule.hour > 23) {
            return { success: false, error: 'Invalid hour' };
        }
        
        if (newSchedule.minute < 0 || newSchedule.minute > 59) {
            return { success: false, error: 'Invalid minute' };
        }
        
        if (newSchedule.keepCount < 1) {
            return { success: false, error: 'Invalid keep count' };
        }
        
        // Save schedule
        if (saveSchedule(newSchedule)) {
            // If enabled, schedule next backup
            if (newSchedule.enabled) {
                scheduleNextBackup();
            }
            
            return { success: true, schedule: newSchedule };
        } else {
            return { success: false, error: 'Failed to save schedule' };
        }
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.BACKUP, `Error setting backup schedule: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Get next backup time based on schedule
 * @param {Object} schedule - Backup schedule
 * @returns {Date} Next backup time
 */
function getNextBackupTime(schedule = null) {
    if (!schedule) {
        schedule = loadSchedule();
    }
    
    if (!schedule.enabled) {
        return null;
    }
    
    const now = new Date();
    const next = new Date();
    
    // Set time
    next.setHours(schedule.hour);
    next.setMinutes(schedule.minute);
    next.setSeconds(0);
    next.setMilliseconds(0);
    
    // Adjust date based on frequency
    if (schedule.frequency === 'daily') {
        // If today's scheduled time has passed, schedule for tomorrow
        if (next <= now) {
            next.setDate(next.getDate() + 1);
        }
    } else if (schedule.frequency === 'weekly') {
        // Set to the next occurrence of the specified day of week
        const currentDay = next.getDay();
        const daysUntilTarget = (schedule.dayOfWeek - currentDay + 7) % 7;
        
        // If today is the target day but the time has passed, schedule for next week
        if (daysUntilTarget === 0 && next <= now) {
            next.setDate(next.getDate() + 7);
        } else {
            next.setDate(next.getDate() + daysUntilTarget);
        }
    } else if (schedule.frequency === 'monthly') {
        // Set to the specified day of the month
        next.setDate(schedule.dayOfMonth);
        
        // If this month's scheduled time has passed, schedule for next month
        if (next <= now || next.getDate() !== schedule.dayOfMonth) {
            next.setMonth(next.getMonth() + 1);
            next.setDate(schedule.dayOfMonth);
            
            // Handle invalid dates (e.g., February 30)
            if (next.getDate() !== schedule.dayOfMonth) {
                // Go to the last day of the month
                next.setDate(0);
            }
        }
    }
    
    return next;
}

// Variable to store the backup timer
let backupTimer = null;

/**
 * Schedule next backup
 */
function scheduleNextBackup() {
    try {
        // Clear existing timer
        if (backupTimer) {
            clearTimeout(backupTimer);
            backupTimer = null;
        }
        
        const schedule = loadSchedule();
        if (!schedule.enabled) {
            logger.info(logger.LOG_CATEGORIES.BACKUP, 'Automatic backups are disabled');
            return;
        }
        
        const nextBackupTime = getNextBackupTime(schedule);
        if (!nextBackupTime) {
            logger.warn(logger.LOG_CATEGORIES.BACKUP, 'Failed to determine next backup time');
            return;
        }
        
        const now = new Date();
        const timeUntilBackup = nextBackupTime.getTime() - now.getTime();
        
        if (timeUntilBackup <= 0) {
            logger.warn(logger.LOG_CATEGORIES.BACKUP, 'Next backup time is in the past, rescheduling');
            // Force reschedule for tomorrow
            schedule.lastBackup = now.toISOString();
            saveSchedule(schedule);
            scheduleNextBackup();
            return;
        }
        
        logger.info(logger.LOG_CATEGORIES.BACKUP, `Next automatic backup scheduled for ${nextBackupTime.toLocaleString()}`);
        
        // Schedule backup
        backupTimer = setTimeout(() => {
            performAutomaticBackup();
        }, timeUntilBackup);
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.BACKUP, `Error scheduling backup: ${error.message}`);
    }
}

/**
 * Perform automatic backup
 */
async function performAutomaticBackup() {
    try {
        logger.info(logger.LOG_CATEGORIES.BACKUP, 'Starting automatic backup');
        
        const schedule = loadSchedule();
        const backupDir = backupRestore.getBackupDir();
        const now = new Date();
        const dateStr = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
        const backupPath = path.join(backupDir, `WinTool_AutoBackup_${dateStr}.wtbackup`);
        
        // Ensure backup directory exists
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Create backup options
        const options = {
            description: `Automatic backup - ${now.toLocaleString()}`,
            categories: ['app_settings', 'system_configs', 'tweaks', 'user_profiles'],
            createVerification: true
        };
        
        // Perform backup
        const result = await backupRestore.createBackup(backupPath, options);
        
        if (result.success) {
            logger.info(logger.LOG_CATEGORIES.BACKUP, `Automatic backup completed successfully: ${backupPath}`);
            
            // Update last backup time
            schedule.lastBackup = now.toISOString();
            saveSchedule(schedule);
            
            // Clean up old backups
            cleanupOldBackups(schedule.keepCount);
        } else {
            logger.error(logger.LOG_CATEGORIES.BACKUP, `Automatic backup failed: ${result.error}`);
        }
        
        // Schedule next backup
        scheduleNextBackup();
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.BACKUP, `Error performing automatic backup: ${error.message}`);
        
        // Reschedule next backup even if this one failed
        scheduleNextBackup();
    }
}

/**
 * Clean up old backups
 * @param {number} keepCount - Number of backups to keep
 */
function cleanupOldBackups(keepCount) {
    try {
        if (!keepCount || keepCount < 1) {
            keepCount = 5; // Default to keeping 5 backups
        }
        
        const history = backupRestore.getBackupHistory();
        
        // Filter for automatic backups only
        const autoBackups = history.filter(backup => 
            backup.description && backup.description.startsWith('Automatic backup'));
        
        // Sort by date (newest first)
        autoBackups.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
        });
        
        // Delete old backups
        if (autoBackups.length > keepCount) {
            const backupsToDelete = autoBackups.slice(keepCount);
            
            backupsToDelete.forEach(backup => {
                try {
                    if (backup.path && fs.existsSync(backup.path)) {
                        fs.unlinkSync(backup.path);
                        logger.info(logger.LOG_CATEGORIES.BACKUP, `Deleted old automatic backup: ${backup.path}`);
                        
                        // Delete verification file if it exists
                        const verificationFile = `${backup.path}.verify`;
                        if (fs.existsSync(verificationFile)) {
                            fs.unlinkSync(verificationFile);
                        }
                    }
                } catch (deleteError) {
                    logger.warn(logger.LOG_CATEGORIES.BACKUP, `Failed to delete old backup: ${deleteError.message}`);
                }
            });
        }
    } catch (error) {
        logger.error(logger.LOG_CATEGORIES.BACKUP, `Error cleaning up old backups: ${error.message}`);
    }
}

// Export the module
module.exports = {
    loadSchedule,
    saveSchedule,
    setSchedule,
    getNextBackupTime,
    scheduleNextBackup,
    performAutomaticBackup
};
