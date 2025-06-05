/**
 * Cleanup Tab JavaScript - Remastered
 * Simple and reliable Windows system cleanup functionality
 */

// Simple cleanup state
let cleanupState = {
    isRunning: false,
    startTime: null
};

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
 * Start the cleanup process
 */
async function startCleanup() {
    if (cleanupState.isRunning) {
        console.log('Cleanup already running');
        return;
    }

    // Confirm with user
    const confirmed = confirm(
        'This will clean temporary files, cache, logs, and other unnecessary files.\n\n' +
        'Are you sure you want to continue? This action cannot be undone.'
    );

    if (!confirmed) {
        return;
    }

    cleanupState.isRunning = true;
    cleanupState.startTime = Date.now();

    // Update UI
    showProgress();
    updateCleanupButton(true);
    hideResults();

    try {
        await performCleanupProcess();
    } catch (error) {
        console.error('Cleanup failed:', error);
        showError('Cleanup failed: ' + error.message);
    } finally {
        cleanupState.isRunning = false;
        hideProgress();
        updateCleanupButton(false);
    }
}

/**
 * Perform the actual cleanup process
 */
async function performCleanupProcess() {
    const categories = [
        { name: 'temp', label: 'Temporary Files' },
        { name: 'system', label: 'System Files' },
        { name: 'cache', label: 'Cache Files' }
    ];

    let totalFilesRemoved = 0;
    let totalSpaceFreed = 0;

    for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const progress = ((i + 1) / categories.length) * 100;

        updateProgress(`Cleaning ${category.label}...`, progress);

        try {
            let result;
            if (window.electronAPI) {
                result = await window.electronAPI.executeCleanup(category.name);
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

        } catch (error) {
            console.warn(`Failed to clean ${category.name}:`, error);
            // Continue with other categories
        }
    }

    // Show results
    const timeTaken = Math.round((Date.now() - cleanupState.startTime) / 1000);
    showResults(totalFilesRemoved, totalSpaceFreed, timeTaken);

    // Refresh disk space
    setTimeout(loadDiskSpace, 1000);
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
 * Show cleanup results
 */
function showResults(filesRemoved, spaceFreed, timeTaken) {
    const resultsSection = document.getElementById('results-section');
    if (!resultsSection) return;

    // Update result values
    document.getElementById('files-cleaned').textContent = filesRemoved.toLocaleString();
    document.getElementById('space-freed').textContent = formatBytes(spaceFreed);
    document.getElementById('time-taken').textContent = `${timeTaken}s`;

    // Show results section
    resultsSection.style.display = 'block';

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
 * Show error message
 */
function showError(message) {
    alert('Error: ' + message);
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

// Make functions available globally
window.startCleanup = startCleanup;
window.openDiskCleanup = openDiskCleanup;

console.log('Cleanup tab script loaded successfully');
