/**
 * Advanced System Cleanup Tab JavaScript
 * Professional-grade system optimization and cleanup functionality
 * Enhanced with advanced features, security validations, and modern UI
 */

// Initialize lazy loading helper
const lazyHelper = new LazyLoadingHelper('cleanup');

// Enhanced cleanup state management
let cleanupState = {
    isRunning: false,
    isPaused: false,
    startTime: null,
    currentCategory: null,
    totalCategories: 0,
    completedCategories: 0,
    selectedCategories: new Set(['temp', 'cache', 'browser']), // Default selections
    lastCleanupResults: [], // Store detailed results from last cleanup
    lastCleanupSummary: { // Store summary from last cleanup
        totalFilesRemoved: 0,
        totalSpaceFreed: 0,
        duration: 0,
        timestamp: null
    },
    settings: {
        confirmBeforeDelete: true,
        skipRecentFiles: true,
        createRestorePoint: false,
        cleanupThreads: 1
    }
};

// Enhanced security configuration
const CLEANUP_SECURITY_CONFIG = {
    allowedCategories: ['temp', 'cache', 'browser', 'updates', 'logs', 'recycle', 'registry', 'dumps'],
    maxConcurrentOperations: 1,
    confirmationRequired: true,
    safetyChecks: true,
    protectedPaths: [
        'C:\\Windows\\System32',
        'C:\\Windows\\SysWOW64',
        'C:\\Program Files',
        'C:\\Program Files (x86)',
        'C:\\Users\\Default',
        'C:\\ProgramData\\Microsoft\\Windows\\Start Menu',
        'C:\\Windows\\Boot',
        'C:\\Windows\\System32\\drivers'
    ],
    categoryInfo: {
        temp: { name: 'Temporary Files', icon: 'file-alt', risk: 'low' },
        cache: { name: 'System Cache', icon: 'database', risk: 'low' },
        browser: { name: 'Browser Data', icon: 'globe', risk: 'medium' },
        updates: { name: 'Windows Update', icon: 'download', risk: 'low' },
        logs: { name: 'System Logs', icon: 'file-text', risk: 'medium' },
        recycle: { name: 'Recycle Bin', icon: 'trash', risk: 'high' },
        registry: { name: 'Registry Cleanup', icon: 'cogs', risk: 'high' },
        dumps: { name: 'Memory Dumps', icon: 'bug', risk: 'medium' }
    }
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
    initAdvancedCleanupTab();
});

// Also initialize when the tab becomes active
if (typeof tabContainer !== 'undefined' && tabContainer) {
    initAdvancedCleanupTab();
}

/**
 * Initialize the advanced cleanup tab
 */
function initAdvancedCleanupTab() {
    // Check if should initialize (lazy loading support)
    if (!lazyHelper.shouldInitialize()) {
        lazyHelper.markTabReady();
        return;
    }

    // Mark script as executed
    lazyHelper.markScriptExecuted();

    // Check if we're in the cleanup tab
    const cleanupContent = document.querySelector('.cleanup-content');
    if (!cleanupContent) {
        setTimeout(initAdvancedCleanupTab, 500);
        return;
    }



    // Initialize components
    loadDiskSpace();
    initializeCategoryCards();
    loadCleanupSettings();
    setupEventListeners();
    startInitialScan();

    // Signal that this tab is ready
    lazyHelper.markTabReady();
}

/**
 * Initialize category cards and setup interactions
 */
function initializeCategoryCards() {
    const categoryCards = document.querySelectorAll('.category-card');

    categoryCards.forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        const category = card.dataset.category;

        // Set up click handler for the entire card
        card.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });

        // Set up checkbox change handler
        checkbox.addEventListener('change', () => {
            updateCategorySelection(category, checkbox.checked);
            updateCleanupSummary();
        });

        // Initialize selection state
        if (checkbox.checked) {
            cleanupState.selectedCategories.add(category);
            card.classList.add('selected');
        }
    });

    updateCleanupSummary();
}

/**
 * Setup event listeners for various UI elements
 */
function setupEventListeners() {


    // Category selection buttons
    const selectAllBtn = document.querySelector('[onclick="selectAllCategories()"]');
    const deselectAllBtn = document.querySelector('[onclick="deselectAllCategories()"]');

    if (selectAllBtn) selectAllBtn.addEventListener('click', selectAllCategories);
    if (deselectAllBtn) deselectAllBtn.addEventListener('click', deselectAllCategories);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
    if (e.key === 'Escape') {
        hideCleanupSettings();
    }
}

/**
 * Start initial scan of selected categories
 */
function startInitialScan() {


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
 * Update disk space display with enhanced information
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

    // Update details
    updateDiskDetails(diskData);
}

/**
 * Update disk details with additional information
 */
function updateDiskDetails(diskData) {
    const { total, used, free } = diskData;

    const totalDetails = document.getElementById('total-space-details');
    const usedDetails = document.getElementById('used-space-details');
    const freeDetails = document.getElementById('free-space-details');

    if (totalDetails) {
        totalDetails.textContent = `${formatBytes(total)} total capacity`;
    }

    if (usedDetails) {
        const usedPercentage = ((used / total) * 100).toFixed(1);
        usedDetails.textContent = `${usedPercentage}% of total space`;
    }

    if (freeDetails) {
        const freePercentage = ((free / total) * 100).toFixed(1);
        freeDetails.textContent = `${freePercentage}% available`;
    }


}

/**
 * Update category selection state
 */
function updateCategorySelection(category, isSelected) {
    const card = document.querySelector(`[data-category="${category}"]`);

    if (isSelected) {
        cleanupState.selectedCategories.add(category);
        card?.classList.add('selected');
    } else {
        cleanupState.selectedCategories.delete(category);
        card?.classList.remove('selected');
    }
}

/**
 * Select all categories
 */
function selectAllCategories() {
    const checkboxes = document.querySelectorAll('.category-card input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            checkbox.checked = true;
            const category = checkbox.closest('.category-card').dataset.category;
            updateCategorySelection(category, true);
        }
    });

    updateCleanupSummary();
    showNotification('All categories selected', 'info', 2000);
}

/**
 * Deselect all categories
 */
function deselectAllCategories() {
    const checkboxes = document.querySelectorAll('.category-card input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            checkbox.checked = false;
            const category = checkbox.closest('.category-card').dataset.category;
            updateCategorySelection(category, false);
        }
    });

    updateCleanupSummary();
    showNotification('All categories deselected', 'info', 2000);
}

/**
 * Update cleanup summary display
 */
function updateCleanupSummary() {
    const selectedCountEl = document.getElementById('selected-count');
    const estimatedSpaceEl = document.getElementById('estimated-space');

    if (selectedCountEl) {
        selectedCountEl.textContent = cleanupState.selectedCategories.size;
    }

    // Since we removed scanning, just show that categories are selected
    if (estimatedSpaceEl) {
        if (cleanupState.selectedCategories.size > 0) {
            estimatedSpaceEl.textContent = 'Ready to clean';
            estimatedSpaceEl.style.color = 'var(--primary-color)';
        } else {
            estimatedSpaceEl.textContent = 'No categories selected';
            estimatedSpaceEl.style.color = 'var(--text-secondary)';
        }
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
 * Quick cleanup - clean safe categories with minimal confirmation
 */
async function quickCleanup() {
    if (cleanupState.isRunning) {
        showNotification('Cleanup operation already in progress', 'warning');
        return;
    }

    // Select safe categories for quick cleanup
    const safeCategories = ['temp', 'cache', 'updates'];

    // Clear current selection and select safe categories
    cleanupState.selectedCategories.clear();
    safeCategories.forEach(category => {
        cleanupState.selectedCategories.add(category);
        const checkbox = document.getElementById(`cat-${category}`);
        if (checkbox) {
            checkbox.checked = true;
            updateCategorySelection(category, true);
        }
    });

    updateCleanupSummary();

    // Quick confirmation
    const confirmed = confirm(
        'Quick Cleanup\n\n' +
        'This will clean safe categories:\n' +
        '• Temporary files\n' +
        '• System cache\n' +
        '• Windows update cache\n\n' +
        'Continue with quick cleanup?'
    );

    if (confirmed) {
        await startAdvancedCleanup();
    }
}



/**
 * Start advanced cleanup process
 */
async function startAdvancedCleanup() {
    if (cleanupState.isRunning) {
        showNotification('Cleanup operation already in progress', 'warning');
        return;
    }

    if (cleanupState.selectedCategories.size === 0) {
        showNotification('Please select at least one category to clean', 'warning');
        return;
    }

    // Enhanced confirmation based on selected categories
    const riskLevel = calculateRiskLevel();
    const confirmed = await showAdvancedConfirmation(riskLevel);

    if (!confirmed) {
        return;
    }

    cleanupState.isRunning = true;
    cleanupState.startTime = Date.now();
    cleanupState.totalCategories = cleanupState.selectedCategories.size;
    cleanupState.completedCategories = 0;

    // Update UI
    showAdvancedProgress();
    updateCleanupButton(true);
    hideResults();

    try {
        await performAdvancedCleanupProcess();
        showNotification('Advanced cleanup completed successfully', 'success');

    } catch (error) {
        console.error('Advanced cleanup failed:', error);
        showNotification(`Cleanup failed: ${error.message}`, 'error');
        addLogEntry(`Error: ${error.message}`, 'error');
    } finally {
        cleanupState.isRunning = false;
        cleanupState.isPaused = false;
        hideProgress();
        updateCleanupButton(false);
    }
}

/**
 * Calculate risk level based on selected categories
 */
function calculateRiskLevel() {
    let riskScore = 0;
    const riskWeights = { low: 1, medium: 2, high: 3 };

    cleanupState.selectedCategories.forEach(category => {
        const categoryInfo = CLEANUP_SECURITY_CONFIG.categoryInfo[category];
        if (categoryInfo) {
            riskScore += riskWeights[categoryInfo.risk] || 1;
        }
    });

    if (riskScore <= 3) return 'low';
    if (riskScore <= 6) return 'medium';
    return 'high';
}

/**
 * Show advanced confirmation dialog
 */
async function showAdvancedConfirmation(riskLevel) {
    const selectedCategories = Array.from(cleanupState.selectedCategories);
    const categoryNames = selectedCategories.map(cat =>
        CLEANUP_SECURITY_CONFIG.categoryInfo[cat]?.name || cat
    ).join('\n• ');

    const riskMessages = {
        low: 'This is a low-risk cleanup operation.',
        medium: 'This cleanup includes medium-risk categories. Please review carefully.',
        high: '⚠️ HIGH RISK OPERATION ⚠️\nThis cleanup includes high-risk categories that may affect system functionality.'
    };

    const message = `Advanced System Cleanup\n\n` +
        `Selected categories:\n• ${categoryNames}\n\n` +
        `${riskMessages[riskLevel]}\n\n` +
        `This action cannot be undone.\n\n` +
        `Continue with cleanup?`;

    return confirm(message);
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

    // Store results in global state for export functionality
    const timeTaken = Math.round((Date.now() - cleanupState.startTime) / 1000);
    cleanupState.lastCleanupResults = [...results]; // Store detailed results
    cleanupState.lastCleanupSummary = {
        totalFilesRemoved: totalFilesRemoved,
        totalSpaceFreed: totalSpaceFreed,
        duration: timeTaken,
        timestamp: new Date().toISOString()
    };

    // Show results
    showResultsSecure(totalFilesRemoved, totalSpaceFreed, timeTaken, results);

    // Refresh disk space
    setTimeout(loadDiskSpace, 1000);
}

/**
 * Perform advanced cleanup process with selected categories
 */
async function performAdvancedCleanupProcess() {
    if (cleanupState.selectedCategories.size === 0) {
        throw new Error('No categories selected for cleanup');
    }

    // Convert selected categories to the format expected by the cleanup process
    const selectedCategoriesArray = Array.from(cleanupState.selectedCategories);
    const categories = selectedCategoriesArray.map(categoryName => {
        const categoryInfo = CLEANUP_SECURITY_CONFIG.categoryInfo[categoryName];
        return {
            name: categoryName,
            label: categoryInfo?.name || categoryName.charAt(0).toUpperCase() + categoryName.slice(1)
        };
    });

    // Validate all categories before starting
    const validCategories = categories.filter(category => {
        const isValid = validateCleanupCategory(category.name);
        if (!isValid) {
            addLogEntry(`Skipping invalid category: ${category.name}`, 'warning');
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

        // Update advanced progress
        cleanupState.currentCategory = category.name;
        cleanupState.completedCategories = i;

        updateAdvancedProgress(
            progress,
            `Cleaning ${escapeHtml(category.label)}...`,
            `Processing category ${i + 1} of ${validCategories.length}`
        );

        addLogEntry(`Starting cleanup of ${category.label}...`, 'info');

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
                await new Promise(resolve => setTimeout(resolve, 1500));
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

            addLogEntry(`${category.label}: ${result.filesRemoved || 0} files, ${formatBytes(result.sizeFreed || 0)} freed`, 'success');

        } catch (error) {
            addLogEntry(`Failed to clean ${category.label}: ${error.message}`, 'error');

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

        // Check if cleanup was paused or cancelled
        if (cleanupState.isPaused) {
            addLogEntry('Cleanup paused by user', 'info');
            break;
        }
    }

    // Update final progress
    cleanupState.completedCategories = validCategories.length;
    updateAdvancedProgress(100, 'Cleanup completed', 'Finalizing results...');

    // Store results in global state for export functionality
    const timeTaken = Math.round((Date.now() - cleanupState.startTime) / 1000);
    cleanupState.lastCleanupResults = [...results]; // Store detailed results
    cleanupState.lastCleanupSummary = {
        totalFilesRemoved: totalFilesRemoved,
        totalSpaceFreed: totalSpaceFreed,
        duration: timeTaken,
        timestamp: new Date().toISOString()
    };

    // Show results
    showAdvancedResults(totalFilesRemoved, totalSpaceFreed, timeTaken, results);

    // Refresh disk space
    setTimeout(loadDiskSpace, 1000);

    addLogEntry(`Cleanup completed in ${timeTaken} seconds`, 'success');
}

// Legacy function for backward compatibility (deprecated)
async function performCleanupProcess() {
    return performCleanupProcessSecure();
}

/**
 * Show advanced progress during cleanup
 */
function showAdvancedProgress() {
    const progressSection = document.getElementById('cleanup-progress');
    if (progressSection) {
        progressSection.style.display = 'flex';

        // Reset progress
        updateAdvancedProgress(0, 'Initializing cleanup...', 'Preparing cleanup process...');

        // Clear log
        const logEl = document.getElementById('progress-log');
        if (logEl) {
            logEl.innerHTML = '<div class="log-entry">Starting cleanup process...</div>';
        }
    }
}

/**
 * Show progress section (legacy compatibility)
 */
function showProgress() {
    showAdvancedProgress();
}

/**
 * Update advanced progress display
 */
function updateAdvancedProgress(percentage, text, operation) {
    const progressPercentage = document.getElementById('progress-percentage');
    const progressText = document.getElementById('progress-text');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const currentOperation = document.getElementById('current-operation');
    const progressEta = document.getElementById('progress-eta');

    if (progressPercentage) {
        progressPercentage.textContent = `${Math.round(percentage)}%`;
    }

    if (progressText) {
        progressText.textContent = text;
    }

    if (progressBarFill) {
        progressBarFill.style.width = `${percentage}%`;
    }

    if (currentOperation && operation) {
        currentOperation.textContent = operation;
    }

    // Calculate ETA
    if (progressEta && cleanupState.startTime && percentage > 0) {
        const elapsed = Date.now() - cleanupState.startTime;
        const estimated = (elapsed / percentage) * (100 - percentage);
        const eta = Math.round(estimated / 1000);
        progressEta.textContent = eta > 0 ? `ETA: ${eta}s` : 'Calculating...';
    }
}

/**
 * Add entry to progress log
 */
function addLogEntry(message, type = 'info') {
    const logEl = document.getElementById('progress-log');
    if (!logEl) return;

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;

    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;

    // Limit log entries to prevent memory issues
    const entries = logEl.querySelectorAll('.log-entry');
    if (entries.length > 100) {
        entries[0].remove();
    }
}

/**
 * Pause cleanup process
 */
function pauseCleanup() {
    if (!cleanupState.isRunning) return;

    cleanupState.isPaused = !cleanupState.isPaused;
    const pauseBtn = document.getElementById('pause-btn');

    if (cleanupState.isPaused) {
        if (pauseBtn) {
            pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
        }
        addLogEntry('Cleanup paused by user', 'warning');
        showNotification('Cleanup paused', 'info');
    } else {
        if (pauseBtn) {
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        }
        addLogEntry('Cleanup resumed', 'info');
        showNotification('Cleanup resumed', 'info');
    }
}

/**
 * Cancel cleanup process
 */
function cancelCleanup() {
    if (!cleanupState.isRunning) return;

    const confirmed = confirm('Are you sure you want to cancel the cleanup process?');
    if (!confirmed) return;

    cleanupState.isRunning = false;
    cleanupState.isPaused = false;

    addLogEntry('Cleanup cancelled by user', 'error');
    showNotification('Cleanup cancelled', 'warning');

    hideProgress();
    updateCleanupButton(false);
}

/**
 * Show cleanup settings modal
 */
function showCleanupSettings() {
    const modal = document.getElementById('cleanup-settings-modal');
    if (modal) {
        // Load current settings
        loadSettingsToModal();
        modal.style.display = 'flex';
    }
}

/**
 * Hide cleanup settings modal
 */
function hideCleanupSettings() {
    const modal = document.getElementById('cleanup-settings-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Load settings to modal
 */
function loadSettingsToModal() {
    const settings = cleanupState.settings;

    const confirmBeforeDelete = document.getElementById('confirm-before-delete');
    const skipRecentFiles = document.getElementById('skip-recent-files');
    const createRestorePoint = document.getElementById('create-restore-point');
    const cleanupThreads = document.getElementById('cleanup-threads');

    if (confirmBeforeDelete) confirmBeforeDelete.checked = settings.confirmBeforeDelete;
    if (skipRecentFiles) skipRecentFiles.checked = settings.skipRecentFiles;
    if (createRestorePoint) createRestorePoint.checked = settings.createRestorePoint;
    if (cleanupThreads) cleanupThreads.value = settings.cleanupThreads;
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

/**
 * Show advanced cleanup results with enhanced details
 */
function showAdvancedResults(filesRemoved, spaceFreed, timeTaken, detailedResults = []) {
    const resultsSection = document.getElementById('results-section');
    if (!resultsSection) return;

    // Validate and sanitize input values
    const safeFilesRemoved = Math.max(0, parseInt(filesRemoved) || 0);
    const safeSpaceFreed = Math.max(0, parseInt(spaceFreed) || 0);
    const safeTimeTaken = Math.max(0, parseInt(timeTaken) || 0);

    // Add success class and timestamp
    resultsSection.classList.add('success');

    // Update timestamp
    const timestampEl = document.getElementById('results-timestamp');
    if (timestampEl) {
        timestampEl.textContent = `Completed at ${new Date().toLocaleString()}`;
    }

    // Update main result values
    const filesCleanedEl = document.getElementById('files-cleaned');
    const spaceFreedEl = document.getElementById('space-freed');
    const timeTakenEl = document.getElementById('time-taken');
    const categoriesCleanedEl = document.getElementById('categories-cleaned');

    if (filesCleanedEl) {
        const value = safeFilesRemoved.toLocaleString();
        filesCleanedEl.textContent = value;
    }

    if (spaceFreedEl) {
        const value = formatBytes(safeSpaceFreed);
        spaceFreedEl.textContent = value;
    }

    if (timeTakenEl) {
        const value = `${safeTimeTaken}s`;
        timeTakenEl.textContent = value;
    }

    if (categoriesCleanedEl) {
        const value = detailedResults.length;
        categoriesCleanedEl.textContent = value;
    }

    // Show detailed results with enhanced information
    const detailsContainer = document.getElementById('cleanup-details');
    if (detailsContainer && Array.isArray(detailedResults)) {
        const successfulResults = detailedResults.filter(r => r.success);
        const failedResults = detailedResults.filter(r => !r.success);

        detailsContainer.innerHTML = `
            <div class="results-summary">
                <h4>Cleanup Summary</h4>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Categories Processed:</span>
                        <span class="stat-value">${detailedResults.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Successful:</span>
                        <span class="stat-value success">${successfulResults.length}</span>
                    </div>
                    ${failedResults.length > 0 ? `
                    <div class="stat-item">
                        <span class="stat-label">Failed:</span>
                        <span class="stat-value error">${failedResults.length}</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="results-details">
                <h4>Detailed Results</h4>
                ${detailedResults.map(result => {
                    const statusIcon = result.success ?
                        '<i class="fas fa-check-circle success"></i>' :
                        '<i class="fas fa-exclamation-circle error"></i>';
                    const statusText = result.success ? 'Success' : 'Failed';

                    return `
                        <div class="detail-item ${result.success ? 'success' : 'error'}">
                            <div class="detail-header">
                                ${statusIcon}
                                <span class="detail-category">${escapeHtml(result.label)}</span>
                                <span class="detail-status">${statusText}</span>
                            </div>
                            <div class="detail-stats">
                                ${result.success ?
                                    `Files: ${result.filesRemoved.toLocaleString()} | Space: ${formatBytes(result.sizeFreed)}` :
                                    `Error: ${escapeHtml(result.error || 'Unknown error')}`
                                }
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Show results section
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Add to log
    addLogEntry(`Results displayed: ${safeFilesRemoved} files, ${formatBytes(safeSpaceFreed)} freed`, 'success');
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
        showError('Failed to open Windows Disk Cleanup');
    }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
    // Handle invalid inputs
    if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) {
        return '0 B';
    }

    // Convert to number if it's a string
    bytes = Number(bytes);

    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    // Ensure i is within bounds
    const sizeIndex = Math.min(i, sizes.length - 1);
    const formattedValue = (bytes / Math.pow(k, sizeIndex)).toFixed(1);

    return parseFloat(formattedValue) + ' ' + sizes[sizeIndex];
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







/**
 * Save cleanup settings
 */
function saveCleanupSettings() {
    const confirmBeforeDelete = document.getElementById('confirm-before-delete');
    const skipRecentFiles = document.getElementById('skip-recent-files');
    const createRestorePoint = document.getElementById('create-restore-point');
    const cleanupThreads = document.getElementById('cleanup-threads');

    cleanupState.settings = {
        confirmBeforeDelete: confirmBeforeDelete?.checked || true,
        skipRecentFiles: skipRecentFiles?.checked || true,
        createRestorePoint: createRestorePoint?.checked || false,
        cleanupThreads: parseInt(cleanupThreads?.value) || 1
    };

    // Save to localStorage
    try {
        localStorage.setItem('cleanupSettings', JSON.stringify(cleanupState.settings));
    } catch (error) {
        // Failed to save settings
    }

    showNotification('Settings saved successfully', 'success');
    hideCleanupSettings();
}

/**
 * Reset cleanup settings to defaults
 */
function resetCleanupSettings() {
    const confirmed = confirm('Reset all settings to default values?');
    if (!confirmed) return;

    cleanupState.settings = {
        confirmBeforeDelete: true,
        skipRecentFiles: true,
        createRestorePoint: false,
        cleanupThreads: 1
    };

    loadSettingsToModal();
    showNotification('Settings reset to defaults', 'info');
}

/**
 * Load cleanup settings from localStorage
 */
function loadCleanupSettings() {
    try {
        const saved = localStorage.getItem('cleanupSettings');
        if (saved) {
            cleanupState.settings = { ...cleanupState.settings, ...JSON.parse(saved) };
        }
    } catch (error) {
        // Failed to load settings
    }
}











/**
 * Export cleanup results
 */
function exportResults() {
    const results = generateCleanupReport();
    const blob = new Blob([results], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `cleanup-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    showNotification('Report exported successfully', 'success');
}

/**
 * Generate cleanup report
 */
function generateCleanupReport() {
    const timestamp = new Date().toLocaleString();
    const spaceFreed = calculateTotalSpaceFreed();
    const filesDeleted = calculateTotalFilesDeleted();
    const lastResults = cleanupState.lastCleanupResults || [];
    const lastSummary = cleanupState.lastCleanupSummary;

    // Use stored duration if available, otherwise calculate from current time
    const duration = lastSummary.duration ||
        (cleanupState.startTime ? Math.round((Date.now() - cleanupState.startTime) / 1000) : 0);

    // Generate detailed results section
    let detailedResults = '';
    if (lastResults.length > 0) {
        detailedResults = lastResults.map(result => {
            const status = result.success ? 'SUCCESS' : 'FAILED';
            const files = result.filesRemoved || 0;
            const size = formatBytes(result.sizeFreed || 0);
            const error = result.error ? ` (Error: ${result.error})` : '';
            return `${result.label || result.category}: ${status} - ${files} files, ${size} freed${error}`;
        }).join('\n');
    } else {
        // Fallback to selected categories if no detailed results available
        const categories = Array.from(cleanupState.selectedCategories);
        detailedResults = categories.map(cat => `${cat.toUpperCase()}: No detailed results available`).join('\n');
    }

    // Generate categories list
    const categoriesCleaned = lastResults.length > 0
        ? lastResults.map(r => r.label || r.category).join(', ')
        : Array.from(cleanupState.selectedCategories).join(', ');

    return `WinTool System Cleanup Report
Generated: ${timestamp}
Cleanup Performed: ${lastSummary.timestamp ? new Date(lastSummary.timestamp).toLocaleString() : 'Unknown'}

=== CLEANUP SUMMARY ===
Categories Cleaned: ${categoriesCleaned}
Total Space Freed: ${formatBytes(spaceFreed)}
Total Files Deleted: ${filesDeleted}
Duration: ${duration} seconds
Success Rate: ${lastResults.length > 0 ? Math.round((lastResults.filter(r => r.success).length / lastResults.length) * 100) : 'N/A'}%

=== DETAILED RESULTS ===
${detailedResults}

=== SYSTEM INFO ===
User Agent: ${navigator.userAgent}
Platform: ${navigator.platform}
Language: ${navigator.language}
Report Generated: ${timestamp}

Report generated by WinTool Advanced System Cleanup
`;
}

/**
 * Calculate total space freed from last cleanup
 */
function calculateTotalSpaceFreed() {
    return cleanupState.lastCleanupSummary.totalSpaceFreed || 0;
}

/**
 * Calculate total files deleted from last cleanup
 */
function calculateTotalFilesDeleted() {
    return cleanupState.lastCleanupSummary.totalFilesRemoved || 0;
}



/**
 * Initialize category displays with ready state
 */
function initializeCategoryDisplays() {
    const categories = ['temp', 'cache', 'browser', 'updates', 'logs', 'recycle', 'registry', 'dumps'];

    categories.forEach(category => {
        const sizeEl = document.getElementById(`${category}-size`);
        const statusEl = document.getElementById(`${category}-status`);

        if (sizeEl) {
            sizeEl.textContent = 'Ready to clean';
            sizeEl.style.color = 'var(--primary-color)';
        }

        if (statusEl) {
            statusEl.className = 'category-status ready';
            statusEl.innerHTML = '<i class="fas fa-check"></i>';
        }
    });
}

// Initialize cleanup tab when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {

    // Initialize category displays
    initializeCategoryDisplays();

    // Initialize disk space display
    updateDiskSpaceDisplay({
        total: 1000000000000, // 1TB
        used: 600000000000,   // 600GB
        free: 400000000000    // 400GB
    });



    // Initialize cleanup summary
    updateCleanupSummary();
});

// Make functions available globally
window.startCleanup = startCleanupSecure;
window.startAdvancedCleanup = startAdvancedCleanup;
window.quickCleanup = quickCleanup;

window.selectAllCategories = selectAllCategories;
window.deselectAllCategories = deselectAllCategories;
window.pauseCleanup = pauseCleanup;
window.cancelCleanup = cancelCleanup;
window.showCleanupSettings = showCleanupSettings;
window.hideCleanupSettings = hideCleanupSettings;
window.saveCleanupSettings = saveCleanupSettings;
window.resetCleanupSettings = resetCleanupSettings;

window.exportResults = exportResults;
window.openDiskCleanup = openDiskCleanup;


