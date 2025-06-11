/**
 * Cleanup Tab JavaScript - Remastered
 * Simple and reliable Windows system cleanup functionality
 * Enhanced with security validations and safe file operations
 */

// Simple cleanup state
let cleanupState = {
    isRunning: false,
    startTime: null
};

// Security configuration for cleanup operations
const CLEANUP_SECURITY_CONFIG = {
    allowedCategories: ['temp', 'system', 'cache', 'registry'],
    maxConcurrentOperations: 1,
    confirmationRequired: true,
    safetyChecks: true,
    protectedPaths: [
        'C:\\Windows\\System32',
        'C:\\Windows\\SysWOW64',
        'C:\\Program Files',
        'C:\\Program Files (x86)',
        'C:\\Users\\Default',
        'C:\\ProgramData\\Microsoft\\Windows\\Start Menu'
    ]
};

// Security validation functions
function validateCleanupCategory(category) {
    return CLEANUP_SECURITY_CONFIG.allowedCategories.includes(category);
}

function sanitizeCleanupCategory(category) {
    if (!category || typeof category !== 'string') return '';
    return category.replace(/[^a-zA-Z0-9_-]/g, '');
}

// Enhanced error handling and user feedback
function showNotification(message, type = 'info', duration = 5000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.cleanup-notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `cleanup-notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        color: ${type === 'warning' ? '#212529' : 'white'};
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        word-wrap: break-word;
        animation: slideInRight 0.3s ease-out;
    `;

    const icon = type === 'success' ? 'check-circle' :
                 type === 'error' ? 'exclamation-triangle' :
                 type === 'warning' ? 'exclamation-triangle' : 'info-circle';

    notification.innerHTML = `<i class="fas fa-${icon}"></i> ${escapeHtml(message)}`;

    document.body.appendChild(notification);

    // Auto-remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize cleanup tab when loaded
document.addEventListener('DOMContentLoaded', function() {
    initCleanupTab();
});

// Also initialize when the tab becomes active
if (typeof tabContainer !== 'undefined' && tabContainer) {
    initCleanupTab();
}

/**
 * Initialize the cleanup tab
 */
function initCleanupTab() {
    console.log('Initializing cleanup tab...');

    // Check if we're in the cleanup tab
    const cleanupContent = document.querySelector('.cleanup-content');
    if (!cleanupContent) {
        console.log('Cleanup content not found, waiting...');
        setTimeout(initCleanupTab, 500);
        return;
    }

    console.log('Cleanup tab initialized successfully');

    // Load disk space data
    loadDiskSpace();
}

/**
 * Load disk space information
 */
async function loadDiskSpace() {
    try {
        if (window.electronAPI) {
            const diskData = await window.electronAPI.getDiskSpace();
            updateDiskSpaceDisplay(diskData);
        } else {
            // Fallback for browser testing
            const mockData = {
                total: 1000000000000, // 1TB
                used: 600000000000,   // 600GB
                free: 400000000000    // 400GB
            };
            updateDiskSpaceDisplay(mockData);
        }
    } catch (error) {
        console.error('Error loading disk space:', error);
        // Show error state
        document.getElementById('total-space').textContent = 'Error';
        document.getElementById('used-space').textContent = 'Error';
        document.getElementById('free-space').textContent = 'Error';
    }
}

/**
 * Update disk space display
 */
function updateDiskSpaceDisplay(diskData) {
    const { total, used, free } = diskData;

    // Format and display values
    document.getElementById('total-space').textContent = formatBytes(total);
    document.getElementById('used-space').textContent = formatBytes(used);
    document.getElementById('free-space').textContent = formatBytes(free);

    // Update progress bars
    const usedPercentage = (used / total) * 100;
    const freePercentage = (free / total) * 100;

    document.getElementById('total-space-bar').style.width = '100%';
    document.getElementById('used-space-bar').style.width = `${usedPercentage}%`;
    document.getElementById('free-space-bar').style.width = `${freePercentage}%`;

    // Color coding for used space bar
    const usedBar = document.getElementById('used-space-bar');
    if (usedPercentage > 90) {
        usedBar.style.background = '#e74c3c'; // Red
    } else if (usedPercentage > 75) {
        usedBar.style.background = '#f39c12'; // Orange
    } else {
        usedBar.style.background = 'var(--primary-color)'; // Default
    }
}

/**
 * Start the cleanup process with enhanced security
 */
async function startCleanupSecure() {
    if (cleanupState.isRunning) {
        showNotification('Cleanup operation already in progress', 'warning');
        return;
    }

    // Enhanced confirmation with detailed warning
    const confirmed = confirm(
        'SYSTEM CLEANUP WARNING\n\n' +
        'This operation will permanently delete:\n' +
        '• Temporary files and folders\n' +
        '• System cache and log files\n' +
        '• Browser cache and temporary data\n' +
        '• Windows update cache files\n\n' +
        'This action CANNOT be undone.\n\n' +
        'Important: Close all running applications before proceeding.\n\n' +
        'Do you want to continue with the cleanup?'
    );

    if (!confirmed) {
        return;
    }

    // Additional safety check for critical operations
    if (CLEANUP_SECURITY_CONFIG.safetyChecks) {
        const finalConfirm = confirm(
            'FINAL CONFIRMATION\n\n' +
            'You are about to perform a system cleanup that will permanently delete files.\n\n' +
            'Are you absolutely sure you want to proceed?'
        );

        if (!finalConfirm) {
            return;
        }
    }

    cleanupState.isRunning = true;
    cleanupState.startTime = Date.now();

    // Update UI
    showProgress();
    updateCleanupButton(true);
    hideResults();

    try {
        await performCleanupProcessSecure();
        showNotification('System cleanup completed successfully', 'success');
    } catch (error) {
        console.error('Cleanup failed:', error);
        showNotification(`Cleanup failed: ${error.message}`, 'error');
        showError('Cleanup failed: ' + error.message);
    } finally {
        cleanupState.isRunning = false;
        hideProgress();
        updateCleanupButton(false);
    }
}

// Legacy function for backward compatibility (deprecated)
async function startCleanup() {
    return startCleanupSecure();
}

/**
 * Perform the actual cleanup process with security validation
 */
async function performCleanupProcessSecure() {
    const categories = [
        { name: 'temp', label: 'Temporary Files' },
        { name: 'system', label: 'System Files' },
        { name: 'cache', label: 'Cache Files' }
    ];

    // Validate all categories before starting
    const validCategories = categories.filter(category => {
        const isValid = validateCleanupCategory(category.name);
        if (!isValid) {
            console.warn(`Invalid cleanup category detected: ${category.name}`);
        }
        return isValid;
    });

    if (validCategories.length === 0) {
        throw new Error('No valid cleanup categories available');
    }

    let totalFilesRemoved = 0;
    let totalSpaceFreed = 0;
    const results = [];

    for (let i = 0; i < validCategories.length; i++) {
        const category = validCategories[i];
        const progress = ((i + 1) / validCategories.length) * 100;

        updateProgress(`Cleaning ${escapeHtml(category.label)}...`, progress);

        try {
            let result;
            if (window.electronAPI && window.electronAPI.executeCleanup) {
                // Sanitize category name before sending to backend
                const sanitizedCategory = sanitizeCleanupCategory(category.name);

                // Additional validation
                if (!sanitizedCategory || sanitizedCategory !== category.name) {
                    throw new Error(`Invalid category name: ${category.name}`);
                }

                result = await window.electronAPI.executeCleanup(sanitizedCategory);

                // Validate result structure
                if (!result || typeof result !== 'object') {
                    throw new Error(`Invalid cleanup result for ${category.name}`);
                }

                // Sanitize numeric results
                result.filesRemoved = Math.max(0, parseInt(result.filesRemoved) || 0);
                result.sizeFreed = Math.max(0, parseInt(result.sizeFreed) || 0);

            } else {
                // Simulate cleanup for browser testing
                await new Promise(resolve => setTimeout(resolve, 2000));
                result = {
                    filesRemoved: Math.floor(Math.random() * 500) + 100,
                    sizeFreed: Math.floor(Math.random() * 100000000) + 10000000 // 10-110MB
                };
            }

            totalFilesRemoved += result.filesRemoved || 0;
            totalSpaceFreed += result.sizeFreed || 0;

            results.push({
                category: category.name,
                label: category.label,
                filesRemoved: result.filesRemoved || 0,
                sizeFreed: result.sizeFreed || 0,
                success: true
            });

        } catch (error) {
            console.warn(`Failed to clean ${category.name}:`, error);
            results.push({
                category: category.name,
                label: category.label,
                filesRemoved: 0,
                sizeFreed: 0,
                success: false,
                error: error.message
            });
            // Continue with other categories
        }
    }

    // Show results
    const timeTaken = Math.round((Date.now() - cleanupState.startTime) / 1000);
    showResultsSecure(totalFilesRemoved, totalSpaceFreed, timeTaken, results);

    // Refresh disk space
    setTimeout(loadDiskSpace, 1000);
}

// Legacy function for backward compatibility (deprecated)
async function performCleanupProcess() {
    return performCleanupProcessSecure();
}

/**
 * Show progress section
 */
function showProgress() {
    const progressSection = document.getElementById('cleanup-progress');
    if (progressSection) {
        progressSection.style.display = 'block';
    }
}

/**
 * Hide progress section
 */
function hideProgress() {
    const progressSection = document.getElementById('cleanup-progress');
    if (progressSection) {
        progressSection.style.display = 'none';
    }
}

/**
 * Update progress display
 */
function updateProgress(text, percentage) {
    const progressText = document.getElementById('progress-text');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressFill = document.getElementById('progress-bar-fill');
    const progressDetails = document.getElementById('progress-details');

    if (progressText) progressText.textContent = text;
    if (progressPercentage) progressPercentage.textContent = `${Math.round(percentage)}%`;
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressDetails) progressDetails.textContent = `Processing... ${Math.round(percentage)}% complete`;
}

/**
 * Update cleanup button state
 */
function updateCleanupButton(isRunning) {
    const button = document.getElementById('cleanup-btn');
    if (!button) return;

    if (isRunning) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cleaning...';
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-broom"></i> Start Cleanup';
        button.classList.remove('loading');
    }
}

/**
 * Show cleanup results with enhanced security and detail
 */
function showResultsSecure(filesRemoved, spaceFreed, timeTaken, detailedResults = []) {
    const resultsSection = document.getElementById('results-section');
    if (!resultsSection) return;

    // Validate and sanitize input values
    const safeFilesRemoved = Math.max(0, parseInt(filesRemoved) || 0);
    const safeSpaceFreed = Math.max(0, parseInt(spaceFreed) || 0);
    const safeTimeTaken = Math.max(0, parseInt(timeTaken) || 0);

    // Update result values securely
    const filesCleanedEl = document.getElementById('files-cleaned');
    const spaceFreedEl = document.getElementById('space-freed');
    const timeTakenEl = document.getElementById('time-taken');

    if (filesCleanedEl) {
        filesCleanedEl.textContent = safeFilesRemoved.toLocaleString();
    }

    if (spaceFreedEl) {
        spaceFreedEl.textContent = formatBytes(safeSpaceFreed);
    }

    if (timeTakenEl) {
        timeTakenEl.textContent = `${safeTimeTaken}s`;
    }

    // Add detailed results if available
    const detailsContainer = document.getElementById('cleanup-details');
    if (detailsContainer && detailedResults.length > 0) {
        detailsContainer.innerHTML = '';

        detailedResults.forEach(result => {
            const detailItem = document.createElement('div');
            detailItem.className = `cleanup-detail-item ${result.success ? 'success' : 'error'}`;

            const icon = result.success ? 'check-circle' : 'exclamation-triangle';
            const statusText = result.success ? 'Completed' : 'Failed';

            detailItem.innerHTML = `
                <div class="detail-header">
                    <i class="fas fa-${icon}"></i>
                    <span class="detail-category">${escapeHtml(result.label)}</span>
                    <span class="detail-status">${statusText}</span>
                </div>
                <div class="detail-stats">
                    ${result.success ?
                        `Files: ${result.filesRemoved.toLocaleString()} | Space: ${formatBytes(result.sizeFreed)}` :
                        `Error: ${escapeHtml(result.error || 'Unknown error')}`
                    }
                </div>
            `;

            detailsContainer.appendChild(detailItem);
        });
    }

    // Show results section
    resultsSection.style.display = 'block';

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Legacy function for backward compatibility (deprecated)
function showResults(filesRemoved, spaceFreed, timeTaken) {
    return showResultsSecure(filesRemoved, spaceFreed, timeTaken);
}

/**
 * Hide results section
 */
function hideResults() {
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }
}

/**
 * Show error message with enhanced security
 */
function showError(message) {
    const sanitizedMessage = escapeHtml(message || 'Unknown error occurred');

    // Use notification system instead of alert
    showNotification(`Cleanup Error: ${sanitizedMessage}`, 'error', 10000);

    // Also log to console for debugging
    console.error('Cleanup error:', message);
}

/**
 * Open Windows Disk Cleanup utility
 */
async function openDiskCleanup() {
    try {
        if (window.electronAPI) {
            await window.electronAPI.openDiskCleanup();
        } else {
            alert('Windows Disk Cleanup can only be opened in the desktop application.');
        }
    } catch (error) {
        console.error('Failed to open disk cleanup:', error);
        showError('Failed to open Windows Disk Cleanup');
    }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Add CSS animations for notifications if not already present
if (!document.querySelector('#cleanup-notification-styles')) {
    const notificationStyles = document.createElement('style');
    notificationStyles.id = 'cleanup-notification-styles';
    notificationStyles.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }

        .cleanup-detail-item {
            background: var(--background-card);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 8px;
        }

        .cleanup-detail-item.success {
            border-left: 4px solid #28a745;
        }

        .cleanup-detail-item.error {
            border-left: 4px solid #dc3545;
        }

        .detail-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
        }

        .detail-header i {
            color: inherit;
        }

        .detail-category {
            font-weight: 600;
            flex-grow: 1;
        }

        .detail-status {
            font-size: 12px;
            text-transform: uppercase;
            font-weight: 500;
        }

        .detail-stats {
            font-size: 12px;
            color: var(--text-secondary);
        }

        .cleanup-detail-item.success .detail-header i,
        .cleanup-detail-item.success .detail-status {
            color: #28a745;
        }

        .cleanup-detail-item.error .detail-header i,
        .cleanup-detail-item.error .detail-status {
            color: #dc3545;
        }
    `;
    document.head.appendChild(notificationStyles);
}

// Make functions available globally
window.startCleanup = startCleanupSecure;
window.openDiskCleanup = openDiskCleanup;

console.log('Cleanup tab script loaded successfully with security enhancements');
