/**
 * WinTool - Cleanup Tab
 * Handles system cleanup operations
 */

// Global variables
let diskSpaceChart = null;
let cleanupStartTime = null;
let cleanupLog = [];
let diskSpaceData = {
    total: 0,
    used: 0,
    free: 0
};

// Predefined cleanup profiles
const CLEANUP_PROFILES = {
    safe: {
        temp: true,
        prefetch: true,
        windowsLogs: true,
        dnsCache: true,
        updates: false,
        installers: false,
        eventLogs: false,
        browserCache: false,
        browserCookies: false,
        browserHistory: false,
        networkData: false,
        deliveryOptimization: false
    },
    moderate: {
        temp: true,
        prefetch: true,
        windowsLogs: true,
        dnsCache: true,
        updates: true,
        installers: false,
        eventLogs: true,
        browserCache: true,
        browserCookies: false,
        browserHistory: false,
        networkData: true,
        deliveryOptimization: true
    },
    aggressive: {
        temp: true,
        prefetch: true,
        windowsLogs: true,
        dnsCache: true,
        updates: true,
        installers: true,
        eventLogs: true,
        browserCache: true,
        browserCookies: true,
        browserHistory: true,
        networkData: true,
        deliveryOptimization: true
    }
};

// Initialize the cleanup tab
function initCleanupTab() {
    // Set up event listeners
    setupDiskSpaceAnalysis();
    setupQuickCleanup();
    setupAdvancedCleanup();
    setupCleanupProfiles();
    setupLargeFileAnalysis();

    // Initialize disk space chart
    initDiskSpaceChart();

    // Get initial disk space data
    getDiskSpaceInfo();
}

// Initialize disk space chart
function initDiskSpaceChart() {
    const chartCanvas = document.getElementById('disk-space-chart');
    if (!chartCanvas) {
        console.error('Disk space chart canvas not found');
        return;
    }

    try {
        const ctx = chartCanvas.getContext('2d');

        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.log('Chart.js not loaded, loading dynamically');
            // Load Chart.js dynamically
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onerror = () => {
                console.error('Failed to load Chart.js');
                showErrorNotification('Failed to load chart library');
            };
            script.onload = () => {
                console.log('Chart.js loaded successfully');
                createDiskSpaceChart(ctx);
            };
            document.head.appendChild(script);
        } else {
            console.log('Chart.js already loaded');
            createDiskSpaceChart(ctx);
        }
    } catch (error) {
        console.error('Error initializing disk space chart:', error);
    }
}

// Create disk space chart
function createDiskSpaceChart(ctx) {
    try {
        // Destroy existing chart if it exists
        if (diskSpaceChart) {
            diskSpaceChart.destroy();
        }

        // Get the accent color from CSS variable
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#ff9800';

        // Create new chart
        diskSpaceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Used Space', 'Free Space'],
                datasets: [{
                    data: [1, 1], // Placeholder data
                    backgroundColor: [
                        `${accentColor}cc`,  // Use accent color with transparency
                        'rgba(30, 30, 35, 0.6)'
                    ],
                    borderColor: [
                        accentColor,  // Use accent color
                        'rgba(30, 30, 35, 0.8)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e0e0e0',
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                return label + ': ' + formatBytes(value);
                            }
                        }
                    }
                }
            }
        });

        console.log('Disk space chart created successfully with accent color:', accentColor);
    } catch (error) {
        console.error('Error creating disk space chart:', error);
        showErrorNotification('Failed to create disk space chart');
    }
}

// Set up disk space analysis
function setupDiskSpaceAnalysis() {
    const scanDiskBtn = document.getElementById('btn-scan-disk');
    if (scanDiskBtn) {
        scanDiskBtn.addEventListener('click', async () => {
            try {
                // Disable button while scanning
                scanDiskBtn.disabled = true;
                scanDiskBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';

                // Show a notification that we're scanning
                showNotification('Scanning disk space...', { type: 'info' });

                // Get the disk space info
                await getDiskSpaceInfo(true);

                // Re-enable button
                scanDiskBtn.disabled = false;
                scanDiskBtn.innerHTML = '<i class="fas fa-search"></i> Scan Disk';
            } catch (error) {
                console.error('Error in disk space scan:', error);
                showErrorNotification('Failed to scan disk: ' + error.message);

                // Re-enable button
                scanDiskBtn.disabled = false;
                scanDiskBtn.innerHTML = '<i class="fas fa-search"></i> Scan Disk';
            }
        });
    }
}

// Get disk space information
async function getDiskSpaceInfo(showNotificationFlag = false) {
    try {
        // Update UI to show loading state
        document.getElementById('disk-total').textContent = 'Scanning...';
        document.getElementById('disk-used').textContent = 'Scanning...';
        document.getElementById('disk-free').textContent = 'Scanning...';

        // Get disk space data from backend
        const diskInfo = await window.electronAPI.getDiskUsage();

        // Validate the disk info
        if (!diskInfo || typeof diskInfo.total !== 'number' || typeof diskInfo.used !== 'number' || typeof diskInfo.free !== 'number') {
            throw new Error('Invalid disk information received');
        }

        // Check for zero values which might indicate an error
        if (diskInfo.total === 0 || (diskInfo.used === 0 && diskInfo.free === 0)) {
            throw new Error('Disk information appears to be invalid (zero values)');
        }

        // Update global disk space data
        diskSpaceData = {
            total: diskInfo.total,
            used: diskInfo.used,
            free: diskInfo.free
        };

        // Update UI
        document.getElementById('disk-total').textContent = formatBytes(diskSpaceData.total);
        document.getElementById('disk-used').textContent = formatBytes(diskSpaceData.used);
        document.getElementById('disk-free').textContent = formatBytes(diskSpaceData.free);

        // Update chart
        updateDiskSpaceChart();

        if (showNotificationFlag) {
            showNotification('Disk space analysis completed', { type: 'success' });
        }

        // Return the disk info for other functions to use
        return diskInfo;
    } catch (error) {
        console.error('Error getting disk space info:', error);
        document.getElementById('disk-total').textContent = 'Error';
        document.getElementById('disk-used').textContent = 'Error';
        document.getElementById('disk-free').textContent = 'Error';

        // Reset chart to default values
        diskSpaceData = {
            total: 1,
            used: 0.5,
            free: 0.5
        };
        updateDiskSpaceChart();

        if (showNotificationFlag) {
            showErrorNotification('Failed to analyze disk space: ' + error.message);
        }

        // Re-throw the error for the caller to handle
        throw error;
    }
}

// Update disk space chart with current data
function updateDiskSpaceChart() {
    try {
        if (diskSpaceChart) {
            // Get the current accent color
            const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#ff9800';

            // Update chart colors to match current accent color
            diskSpaceChart.data.datasets[0].backgroundColor[0] = `${accentColor}cc`;
            diskSpaceChart.data.datasets[0].borderColor[0] = accentColor;

            // Make sure we have valid data
            if (diskSpaceData && typeof diskSpaceData.used === 'number' && typeof diskSpaceData.free === 'number') {
                // Update chart data
                diskSpaceChart.data.datasets[0].data = [diskSpaceData.used, diskSpaceData.free];
                diskSpaceChart.update();
                console.log('Disk space chart updated with:', diskSpaceData);
            } else {
                console.warn('Invalid disk space data for chart update:', diskSpaceData);
                // Use placeholder data if actual data is invalid
                diskSpaceChart.data.datasets[0].data = [1, 1];
                diskSpaceChart.update();
            }
        } else {
            console.warn('Disk space chart not initialized yet');
            // Try to initialize the chart if it doesn't exist
            initDiskSpaceChart();
        }
    } catch (error) {
        console.error('Error updating disk space chart:', error);
    }
}

// Set up quick cleanup
function setupQuickCleanup() {
    const quickCleanupBtn = document.getElementById('btn-quick-cleanup');
    if (quickCleanupBtn) {
        quickCleanupBtn.addEventListener('click', async () => {
            try {
                // Start cleanup timer
                cleanupStartTime = Date.now();
                cleanupLog = [];

                // Update UI
                quickCleanupBtn.disabled = true;
                quickCleanupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cleaning...';
                showProgress('Running quick cleanup...');
                updateProgressBar(10);
                addLogEntry('Starting quick cleanup...');

                // Get initial disk space
                const initialDiskInfo = await window.electronAPI.getDiskUsage();
                const initialUsed = initialDiskInfo.used;

                // Run quick cleanup
                updateProgressBar(30);
                updateCurrentTask('Cleaning temporary files...');
                addLogEntry('Cleaning temporary files...');

                const quickCleanupResult = await window.electronAPI.runQuickCleanup();

                if (!quickCleanupResult.success) {
                    throw new Error(quickCleanupResult.error || 'Quick cleanup failed');
                }

                // Log each cleaned item
                if (quickCleanupResult.cleanedItems && Array.isArray(quickCleanupResult.cleanedItems)) {
                    quickCleanupResult.cleanedItems.forEach(item => {
                        addLogEntry(`Cleaned ${item}`);
                    });
                }

                // Update progress
                updateProgressBar(80);
                updateCurrentTask('Finalizing cleanup...');
                addLogEntry('Quick cleanup completed successfully.');

                // Get final disk space to calculate space saved
                const finalDiskInfo = await window.electronAPI.getDiskUsage();
                const finalUsed = finalDiskInfo.used;
                const spaceSaved = initialUsed - finalUsed;

                // Update disk space info
                getDiskSpaceInfo();

                // Show results
                updateProgressBar(100);
                showCleanupResults(spaceSaved, 3, Date.now() - cleanupStartTime);

                // Show notification
                showNotification('Quick cleanup completed successfully', { type: 'success' });
            } catch (error) {
                console.error('Quick cleanup error:', error);
                addLogEntry('Error: ' + error.message);
                showErrorNotification('Quick cleanup failed: ' + error.message);
            } finally {
                hideProgress();
                quickCleanupBtn.disabled = false;
                quickCleanupBtn.innerHTML = '<i class="fas fa-play"></i> Run Quick Cleanup';
            }
        });
    }
}

// Set up advanced cleanup
function setupAdvancedCleanup() {
    const advancedCleanupBtn = document.getElementById('btn-advanced-cleanup');
    if (advancedCleanupBtn) {
        advancedCleanupBtn.addEventListener('click', async () => {
            // Collect options from all checkboxes
            const options = {
                temp: document.getElementById('cleanup-temp').checked,
                prefetch: document.getElementById('cleanup-prefetch').checked,
                windowsLogs: document.getElementById('cleanup-windows-logs').checked,
                dnsCache: document.getElementById('cleanup-dns-cache').checked,
                updates: document.getElementById('cleanup-updates').checked,
                installers: document.getElementById('cleanup-installers').checked,
                eventLogs: document.getElementById('cleanup-event-logs').checked,
                browserCache: document.getElementById('cleanup-browser-cache')?.checked || false,
                browserCookies: document.getElementById('cleanup-browser-cookies')?.checked || false,
                browserHistory: document.getElementById('cleanup-browser-history')?.checked || false,
                networkData: document.getElementById('cleanup-network-data')?.checked || false,
                deliveryOptimization: document.getElementById('cleanup-delivery-optimization')?.checked || false
            };

            try {
                // Start cleanup timer
                cleanupStartTime = Date.now();
                cleanupLog = [];

                // Update UI
                advancedCleanupBtn.disabled = true;
                advancedCleanupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cleaning...';
                showProgress('Running advanced cleanup...');
                updateProgressBar(5);
                addLogEntry('Starting advanced cleanup...');

                // Get initial disk space
                const initialDiskInfo = await window.electronAPI.getDiskUsage();
                const initialUsed = initialDiskInfo.used;

                // Count selected options for progress calculation
                const selectedOptions = Object.values(options).filter(Boolean).length;
                let completedOptions = 0;

                // Get initial disk space to calculate space saved
                addLogEntry('Analyzing disk space before cleanup...');

                // Run cleanup for each selected option
                for (const [key, enabled] of Object.entries(options)) {
                    if (enabled) {
                        const progressPercent = 5 + Math.round((completedOptions / selectedOptions) * 90);
                        updateProgressBar(progressPercent);

                        // Update current task
                        const taskName = getTaskName(key);
                        updateCurrentTask(`Cleaning ${taskName}...`);
                        addLogEntry(`Cleaning ${taskName}...`);

                        // Run the specific cleanup task
                        const taskResult = await runCleanupTask(key);

                        if (taskResult) {
                            addLogEntry(`✓ Successfully cleaned ${getTaskName(key)}`);
                        } else {
                            addLogEntry(`⚠️ Partially cleaned ${getTaskName(key)} (some operations may have failed)`);
                        }

                        completedOptions++;
                    }
                }

                // Get final disk space to calculate space saved
                updateProgressBar(95);
                updateCurrentTask('Finalizing cleanup...');
                addLogEntry('Advanced cleanup completed successfully.');

                const finalDiskInfo = await window.electronAPI.getDiskUsage();
                const finalUsed = finalDiskInfo.used;
                const spaceSaved = initialUsed - finalUsed;

                // Update disk space info
                getDiskSpaceInfo();

                // Show results
                updateProgressBar(100);
                showCleanupResults(spaceSaved, selectedOptions, Date.now() - cleanupStartTime);

                // Show notification
                showNotification('Advanced cleanup completed successfully', { type: 'success' });
            } catch (error) {
                console.error('Advanced cleanup error:', error);
                addLogEntry('Error: ' + error.message);
                showErrorNotification('Advanced cleanup failed: ' + error.message);
            } finally {
                hideProgress();
                advancedCleanupBtn.disabled = false;
                advancedCleanupBtn.innerHTML = '<i class="fas fa-play"></i> Run Advanced Cleanup';
            }
        });
    }
}

// Run a specific cleanup task
async function runCleanupTask(key) {
    // Create a subset of options with only the current task enabled
    const options = {};
    options[key] = true;

    try {
        // Run the task
        const result = await window.electronAPI.runAdvancedCleanup(options);

        if (!result.success) {
            throw new Error(result.error || 'Unknown error');
        }

        // Check if we have detailed results
        if (result.details) {
            const { successfulCommands, failedCommands, totalCommands } = result.details;

            if (failedCommands > 0) {
                if (successfulCommands > 0) {
                    // Some commands succeeded, some failed
                    addLogEntry(`Partially cleaned ${getTaskName(key)}: ${successfulCommands}/${totalCommands} operations completed.`);
                    return true; // Still return true as we had some success
                } else {
                    // All commands failed
                    addLogEntry(`Failed to clean ${getTaskName(key)}: All operations failed.`);
                    return false;
                }
            } else {
                // All commands succeeded
                addLogEntry(`Successfully cleaned ${getTaskName(key)}: All operations completed.`);
                return true;
            }
        } else {
            // No detailed results, but success was true
            addLogEntry(`Successfully cleaned ${getTaskName(key)}.`);
            return true;
        }
    } catch (error) {
        console.error(`Error cleaning ${key}:`, error);
        addLogEntry(`Error cleaning ${getTaskName(key)}: ${error.message}`);
        return false;
    }
}

// Get human-readable task name
function getTaskName(key) {
    const taskNames = {
        temp: 'Temporary Files',
        prefetch: 'Prefetch Cache',
        windowsLogs: 'Windows Logs',
        dnsCache: 'DNS Cache',
        updates: 'Windows Update Cache',
        installers: 'Windows Installer Cache',
        eventLogs: 'Event Logs',
        browserCache: 'Browser Cache',
        browserCookies: 'Browser Cookies',
        browserHistory: 'Browsing History',
        networkData: 'Network Data',
        deliveryOptimization: 'Delivery Optimization Files'
    };

    return taskNames[key] || key;
}

// Set up cleanup profiles
function setupCleanupProfiles() {
    const saveProfileBtn = document.getElementById('btn-save-profile');
    const loadProfileBtn = document.getElementById('btn-load-profile');
    const profileSelect = document.getElementById('profile-select');

    // Log the elements to debug
    console.log('Save Profile Button:', saveProfileBtn);
    console.log('Load Profile Button:', loadProfileBtn);
    console.log('Profile Select:', profileSelect);

    // Check if the profile select has the predefined options
    if (profileSelect) {
        // Make sure the predefined profiles exist in the dropdown
        const existingOptions = Array.from(profileSelect.options).map(opt => opt.value);

        // Add predefined profiles if they don't exist
        Object.keys(CLEANUP_PROFILES).forEach(profileKey => {
            if (!existingOptions.includes(profileKey)) {
                const option = document.createElement('option');
                option.value = profileKey;
                option.textContent = profileKey.charAt(0).toUpperCase() + profileKey.slice(1) + ' Cleanup';
                profileSelect.appendChild(option);
            }
        });

        // Check for custom profile in localStorage
        const savedCustomProfile = localStorage.getItem('cleanup-custom-profile');
        if (savedCustomProfile && !existingOptions.includes('custom')) {
            const customOption = document.createElement('option');
            customOption.value = 'custom';
            customOption.textContent = 'Custom Profile';
            profileSelect.appendChild(customOption);
        }
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            try {
                // Get current selection
                const currentSelection = {
                    temp: document.getElementById('cleanup-temp')?.checked || false,
                    prefetch: document.getElementById('cleanup-prefetch')?.checked || false,
                    windowsLogs: document.getElementById('cleanup-windows-logs')?.checked || false,
                    dnsCache: document.getElementById('cleanup-dns-cache')?.checked || false,
                    updates: document.getElementById('cleanup-updates')?.checked || false,
                    installers: document.getElementById('cleanup-installers')?.checked || false,
                    eventLogs: document.getElementById('cleanup-event-logs')?.checked || false,
                    browserCache: document.getElementById('cleanup-browser-cache')?.checked || false,
                    browserCookies: document.getElementById('cleanup-browser-cookies')?.checked || false,
                    browserHistory: document.getElementById('cleanup-browser-history')?.checked || false,
                    networkData: document.getElementById('cleanup-network-data')?.checked || false,
                    deliveryOptimization: document.getElementById('cleanup-delivery-optimization')?.checked || false
                };

                console.log('Saving profile with settings:', currentSelection);

                // Save to localStorage
                localStorage.setItem('cleanup-custom-profile', JSON.stringify(currentSelection));

                // Add to profile select if not already there
                if (profileSelect) {
                    let customOptionExists = false;
                    for (let i = 0; i < profileSelect.options.length; i++) {
                        if (profileSelect.options[i].value === 'custom') {
                            customOptionExists = true;
                            break;
                        }
                    }

                    if (!customOptionExists) {
                        const customOption = document.createElement('option');
                        customOption.value = 'custom';
                        customOption.textContent = 'Custom Profile';
                        profileSelect.appendChild(customOption);
                    }

                    // Select the custom profile
                    profileSelect.value = 'custom';
                }

                showNotification('Custom profile saved', { type: 'success' });
            } catch (error) {
                console.error('Error saving profile:', error);
                showErrorNotification('Failed to save profile: ' + error.message);
            }
        });
    }

    if (loadProfileBtn && profileSelect) {
        loadProfileBtn.addEventListener('click', () => {
            try {
                const selectedProfile = profileSelect.value;
                if (!selectedProfile) {
                    showErrorNotification('Please select a profile to load');
                    return;
                }

                console.log('Loading profile:', selectedProfile);
                let profileData;

                if (selectedProfile === 'custom') {
                    // Load from localStorage
                    const savedProfile = localStorage.getItem('cleanup-custom-profile');
                    if (savedProfile) {
                        try {
                            profileData = JSON.parse(savedProfile);
                            console.log('Loaded custom profile:', profileData);
                        } catch (e) {
                            console.error('Error parsing custom profile:', e);
                            showErrorNotification('Invalid custom profile format');
                            return;
                        }
                    } else {
                        showErrorNotification('No custom profile found');
                        return;
                    }
                } else {
                    // Load from predefined profiles
                    profileData = CLEANUP_PROFILES[selectedProfile];
                    console.log('Loaded predefined profile:', profileData);

                    if (!profileData) {
                        showErrorNotification(`Profile "${selectedProfile}" not found`);
                        return;
                    }
                }

                // Apply profile to checkboxes
                applyProfile(profileData);

                showNotification(`Loaded ${selectedProfile} profile`, { type: 'success' });
            } catch (error) {
                console.error('Error loading profile:', error);
                showErrorNotification('Failed to load profile: ' + error.message);
            }
        });
    }

    // Add change event to profile select to enable/disable load button
    if (profileSelect && loadProfileBtn) {
        profileSelect.addEventListener('change', () => {
            loadProfileBtn.disabled = !profileSelect.value;
        });

        // Initialize button state
        loadProfileBtn.disabled = !profileSelect.value;
    }
}

// Apply a profile to the checkboxes
function applyProfile(profile) {
    if (!profile || typeof profile !== 'object') {
        console.error('Invalid profile data:', profile);
        showErrorNotification('Invalid profile data');
        return false;
    }

    console.log('Applying profile to checkboxes:', profile);

    // Track which checkboxes were found and updated
    const updatedCheckboxes = [];
    const missingCheckboxes = [];

    for (const [key, value] of Object.entries(profile)) {
        const checkboxId = `cleanup-${key}`;
        const checkbox = document.getElementById(checkboxId);

        if (checkbox) {
            // Set the checkbox state
            checkbox.checked = Boolean(value);
            updatedCheckboxes.push(key);
            console.log(`Set ${checkboxId} to ${Boolean(value)}`);
        } else {
            missingCheckboxes.push(key);
            console.warn(`Checkbox not found: ${checkboxId}`);
        }
    }

    // Log results
    console.log(`Updated ${updatedCheckboxes.length} checkboxes:`, updatedCheckboxes);

    if (missingCheckboxes.length > 0) {
        console.warn(`Missing ${missingCheckboxes.length} checkboxes:`, missingCheckboxes);
    }

    return updatedCheckboxes.length > 0;
}

// Set up large file analysis
function setupLargeFileAnalysis() {
    const analyzeLargeFilesBtn = document.getElementById('btn-analyze-large-files');
    if (analyzeLargeFilesBtn) {
        analyzeLargeFilesBtn.addEventListener('click', async () => {
            try {
                analyzeLargeFilesBtn.disabled = true;
                analyzeLargeFilesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

                showNotification('Large file analysis started. This may take a while...', { type: 'info' });

                // Call the backend to find large files
                const options = {
                    minSize: 100 * 1024 * 1024, // 100 MB
                    maxResults: 20,
                    paths: ['C:\\Users', 'C:\\Program Files', 'C:\\Program Files (x86)']
                };

                const result = await window.electronAPI.findLargeFiles(options);

                if (result.success) {
                    // Show a dialog with the results
                    showLargeFilesDialog(result.files);
                } else {
                    throw new Error(result.error || 'Failed to find large files');
                }

                analyzeLargeFilesBtn.disabled = false;
                analyzeLargeFilesBtn.innerHTML = '<i class="fas fa-file-alt"></i> Find Large Files';
            } catch (error) {
                console.error('Large file analysis error:', error);
                showErrorNotification('Failed to analyze large files: ' + error.message);

                analyzeLargeFilesBtn.disabled = false;
                analyzeLargeFilesBtn.innerHTML = '<i class="fas fa-file-alt"></i> Find Large Files';
            }
        });
    }

    // Also set up folder analysis
    setupFolderAnalysis();
}

// Set up folder analysis
function setupFolderAnalysis() {
    const scanDiskBtn = document.getElementById('btn-scan-disk');
    if (scanDiskBtn) {
        // Add right-click handler for advanced scan
        scanDiskBtn.addEventListener('contextmenu', async (e) => {
            e.preventDefault();

            try {
                scanDiskBtn.disabled = true;
                scanDiskBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing Folders...';

                showNotification('Folder size analysis started. This may take a while...', { type: 'info' });

                // Call the backend to analyze folder sizes
                const options = {
                    path: 'C:\\',
                    depth: 1
                };

                const result = await window.electronAPI.getDiskUsageByFolder(options);

                if (result.success) {
                    // Show a dialog with the results
                    showFolderSizesDialog(result.folders);
                } else {
                    throw new Error(result.error || 'Failed to analyze folder sizes');
                }

                scanDiskBtn.disabled = false;
                scanDiskBtn.innerHTML = '<i class="fas fa-search"></i> Scan Disk';
            } catch (error) {
                console.error('Folder analysis error:', error);
                showErrorNotification('Failed to analyze folder sizes: ' + error.message);

                scanDiskBtn.disabled = false;
                scanDiskBtn.innerHTML = '<i class="fas fa-search"></i> Scan Disk';
            }
        });

        // Add tooltip to inform users about right-click
        scanDiskBtn.title = 'Left-click: Scan disk space | Right-click: Analyze folder sizes';
    }
}

// Show large files dialog
function showLargeFilesDialog(largeFiles) {
    // Create a modal dialog
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';

    // Create modal content
    modal.innerHTML = `
        <div class="modal-content" style="width: 80%; max-width: 800px;">
            <div class="modal-header">
                <h3><i class="fas fa-file-alt"></i> Large Files Analysis</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <p>Found ${largeFiles.length} large files that are taking up significant disk space:</p>
                <div class="large-files-list invisible-scrollbar">
                    ${largeFiles.length > 0 ?
                        largeFiles.map(file => `
                            <div class="large-file-item">
                                <div class="file-path">${file.Path}</div>
                                <div class="file-info">
                                    <span class="file-size">${formatBytes(file.Size)}</span>
                                    <span class="file-type">${file.Type || 'Unknown'}</span>
                                    <span class="file-date">${file.LastModified || ''}</span>
                                </div>
                            </div>
                        `).join('') :
                        '<div class="no-files">No large files found in the scanned locations.</div>'
                    }
                </div>
                <p class="mt-2">Consider removing these files to free up disk space.</p>
            </div>
            <div class="modal-footer">
                <button class="action-button close-btn">Close</button>
            </div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .large-files-list {
            max-height: 300px;
            overflow-y: auto;
            background: rgba(20, 20, 25, 0.7);
            border-radius: 6px;
            padding: 0.5rem;
            margin-top: 1rem;
        }
        .large-file-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem;
            border-bottom: 1px solid #31343a;
        }
        .large-file-item:last-child {
            border-bottom: none;
        }
        .file-path {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #e0e0e0;
        }
        .file-info {
            display: flex;
            gap: 1rem;
            align-items: center;
        }
        .file-size {
            font-weight: 600;
            color: var(--primary);
        }
        .file-type {
            color: #aaa;
            font-size: 0.9rem;
        }
        .file-date {
            color: #888;
            font-size: 0.85rem;
        }
        .no-files {
            padding: 1rem;
            text-align: center;
            color: #aaa;
        }
    `;

    // Add to document
    document.body.appendChild(modal);
    document.head.appendChild(style);

    // Add event listeners
    const closeBtn = modal.querySelector('.close');
    const closeBtnFooter = modal.querySelector('.close-btn');

    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    closeBtnFooter.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// Show folder sizes dialog
function showFolderSizesDialog(folders) {
    // Create a modal dialog
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';

    // Create modal content
    modal.innerHTML = `
        <div class="modal-content" style="width: 80%; max-width: 800px;">
            <div class="modal-header">
                <h3><i class="fas fa-folder"></i> Folder Size Analysis</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <p>Top folders by size on your system:</p>
                <div class="folder-sizes-list invisible-scrollbar">
                    ${folders.length > 0 ?
                        folders.map(folder => `
                            <div class="folder-item">
                                <div class="folder-info">
                                    <div class="folder-icon"><i class="fas fa-folder"></i></div>
                                    <div class="folder-name">${folder.Name}</div>
                                </div>
                                <div class="folder-details">
                                    <span class="folder-size">${formatBytes(folder.SizeBytes)}</span>
                                    <span class="folder-items">${folder.ItemCount} items</span>
                                </div>
                            </div>
                        `).join('') :
                        '<div class="no-folders">No folder information available.</div>'
                    }
                </div>
                <p class="mt-2">These folders are taking up the most space on your system.</p>
            </div>
            <div class="modal-footer">
                <button class="action-button close-btn">Close</button>
            </div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .folder-sizes-list {
            max-height: 300px;
            overflow-y: auto;
            background: rgba(20, 20, 25, 0.7);
            border-radius: 6px;
            padding: 0.5rem;
            margin-top: 1rem;
        }
        .folder-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem;
            border-bottom: 1px solid #31343a;
        }
        .folder-item:last-child {
            border-bottom: none;
        }
        .folder-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
        }
        .folder-icon {
            color: var(--primary);
        }
        .folder-name {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #e0e0e0;
        }
        .folder-details {
            display: flex;
            gap: 1rem;
            align-items: center;
        }
        .folder-size {
            font-weight: 600;
            color: var(--primary);
        }
        .folder-items {
            color: #aaa;
            font-size: 0.9rem;
        }
        .no-folders {
            padding: 1rem;
            text-align: center;
            color: #aaa;
        }
    `;

    // Add to document
    document.body.appendChild(modal);
    document.head.appendChild(style);

    // Add event listeners
    const closeBtn = modal.querySelector('.close');
    const closeBtnFooter = modal.querySelector('.close-btn');

    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    closeBtnFooter.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// Show progress bar and text
function showProgress(text) {
    const progressContainer = document.querySelector('.progress-container');
    const progressText = document.querySelector('.progress-text');

    if (progressContainer && progressText) {
        progressText.textContent = text;
        progressContainer.style.display = 'block';
        updateProgressBar(0);
    }
}

// Hide progress bar
function hideProgress() {
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
}

// Update progress bar
function updateProgressBar(percent) {
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }
}

// Update current task text
function updateCurrentTask(text) {
    const currentTask = document.getElementById('current-task');
    if (currentTask) {
        currentTask.textContent = text;
    }
}

// Show cleanup results
function showCleanupResults(spaceSaved, itemsCleaned, timeTaken) {
    // First update the inline results section if it exists
    const resultsSection = document.getElementById('cleanup-results');
    const spaceFreedEl = document.getElementById('space-freed');
    const itemsCleanedEl = document.getElementById('items-cleaned');
    const timeTakenEl = document.getElementById('time-taken');
    const logContentEl = document.getElementById('log-content');

    if (resultsSection && spaceFreedEl && itemsCleanedEl && timeTakenEl && logContentEl) {
        // Update values
        spaceFreedEl.textContent = formatBytes(spaceSaved);
        itemsCleanedEl.textContent = itemsCleaned;
        timeTakenEl.textContent = formatTime(timeTaken);

        // Update log content
        logContentEl.textContent = cleanupLog.join('\n');

        // Show results section
        resultsSection.style.display = 'block';
    }

    // Now show a modal with the results
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';

    // Format space saved with appropriate color
    let spaceColor = 'var(--primary)';
    let spaceIcon = 'fas fa-trash-alt';
    let spaceMessage = 'Space Freed';

    if (spaceSaved <= 0) {
        spaceColor = '#888';
        spaceIcon = 'fas fa-info-circle';
        spaceMessage = 'No measurable space freed';
    } else if (spaceSaved > 1024 * 1024 * 1024) { // More than 1GB
        spaceColor = '#4caf50';
        spaceIcon = 'fas fa-check-circle';
        spaceMessage = 'Significant Space Freed';
    }

    // Create modal content
    modal.innerHTML = `
        <div class="modal-content" style="width: 80%; max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-check-circle"></i> Cleanup Complete</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="cleanup-results">
                    <div class="result-item">
                        <div class="result-icon"><i class="${spaceIcon}" style="color: ${spaceColor};"></i></div>
                        <div class="result-info">
                            <div class="result-value" style="color: ${spaceColor};">${spaceSaved > 0 ? formatBytes(spaceSaved) : 'Minimal'}</div>
                            <div class="result-label">${spaceMessage}</div>
                        </div>
                    </div>
                    <div class="result-item">
                        <div class="result-icon"><i class="fas fa-list"></i></div>
                        <div class="result-info">
                            <div class="result-value">${itemsCleaned}</div>
                            <div class="result-label">Items Cleaned</div>
                        </div>
                    </div>
                    <div class="result-item">
                        <div class="result-icon"><i class="fas fa-clock"></i></div>
                        <div class="result-info">
                            <div class="result-value">${formatTime(timeTaken)}</div>
                            <div class="result-label">Time Taken</div>
                        </div>
                    </div>
                </div>
                <p class="mt-2">Your system has been cleaned successfully.</p>
                <p class="cleanup-note">Note: Some files may be in use by Windows and cannot be deleted until the next restart.</p>
            </div>
            <div class="modal-footer">
                <button class="action-button view-log-btn">View Log</button>
                <button class="action-button close-btn">Close</button>
            </div>
        </div>
    `;

    // Add styles for the cleanup results
    const style = document.createElement('style');
    style.textContent = `
        .cleanup-results {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-around;
            margin: 1rem 0;
        }
        .result-item {
            display: flex;
            align-items: center;
            padding: 0.8rem;
            min-width: 120px;
        }
        .result-icon {
            font-size: 1.8rem;
            margin-right: 0.8rem;
            color: var(--primary);
        }
        .result-value {
            font-size: 1.2rem;
            font-weight: 600;
            color: #e0e0e0;
        }
        .result-label {
            font-size: 0.85rem;
            color: #a0a0a0;
        }
        .cleanup-note {
            font-size: 0.85rem;
            color: #888;
            font-style: italic;
            margin-top: 0.5rem;
            text-align: center;
        }
        .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
        }
    `;

    // Add to document
    document.body.appendChild(modal);
    document.head.appendChild(style);

    // Add event listeners
    const closeBtn = modal.querySelector('.close');
    const closeBtnFooter = modal.querySelector('.close-btn');
    const viewLogBtn = modal.querySelector('.view-log-btn');

    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    closeBtnFooter.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    if (viewLogBtn) {
        viewLogBtn.addEventListener('click', () => {
            // Show log section
            if (resultsSection) {
                resultsSection.style.display = 'block';

                // Scroll to log section
                resultsSection.scrollIntoView({ behavior: 'smooth' });

                // Close modal
                document.body.removeChild(modal);
            }
        });
    }
}

// Add entry to cleanup log
function addLogEntry(text) {
    const timestamp = new Date().toLocaleTimeString();
    cleanupLog.push(`[${timestamp}] ${text}`);

    // Update log content if visible
    const logContentEl = document.getElementById('log-content');
    if (logContentEl && logContentEl.parentElement.parentElement.style.display !== 'none') {
        logContentEl.textContent = cleanupLog.join('\n');
        logContentEl.scrollTop = logContentEl.scrollHeight;
    }
}

// Format bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format time to human-readable format
function formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;

    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}m ${remainingSeconds}s`;
}

// Show notification
function showNotification(message, options = {}) {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, options);
    } else {
        console.log('Notification:', message);
    }
}

// Show error notification
function showErrorNotification(message) {
    if (typeof window.showErrorNotification === 'function') {
        window.showErrorNotification(message);
    } else {
        console.error('Error:', message);
    }
}

// Export the initialization function
window.initCleanupTab = initCleanupTab;

function showProgress(text) {
    const progress = document.querySelector('.progress-container');
    const progressText = progress.querySelector('.progress-text');
    progressText.textContent = text;
    progress.style.display = 'block';
}

function hideProgress() {
    const progress = document.querySelector('.progress-container');
    progress.style.display = 'none';
}

// Export the initialization function
window.initCleanupTab = initCleanupTab;
