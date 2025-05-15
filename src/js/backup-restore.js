/**
 * WinTool - Backup and Restore UI
 * Provides UI functionality for backup and restore operations
 */

// DOM Elements
let backupDialog;
let restoreDialog;
let backupHistoryDialog;
let createBackupBtn;
let restoreBackupBtn;
let viewBackupHistoryBtn;
let autoBackupToggle;

// Initialize backup and restore functionality
function initBackupRestore() {
    console.log('Initializing backup and restore functionality');

    // Check if dialogs already exist
    if (!document.getElementById('backup-dialog')) {
        // Load dialog HTML
        loadDialogs();
    } else {
        console.log('Backup dialogs already exist in the DOM');
    }

    // Get DOM elements with a slight delay to ensure they're loaded
    setTimeout(() => {
        backupDialog = document.getElementById('backup-dialog');
        restoreDialog = document.getElementById('restore-dialog');
        backupHistoryDialog = document.getElementById('backup-history-dialog');
        createBackupBtn = document.getElementById('create-backup-btn');
        restoreBackupBtn = document.getElementById('restore-backup-btn');
        viewBackupHistoryBtn = document.getElementById('view-backup-history-btn');
        autoBackupToggle = document.getElementById('auto-backup-toggle');

        // If dialogs still don't exist, create them directly
        if (!backupDialog || !restoreDialog || !backupHistoryDialog) {
            console.warn('Backup dialogs not found in DOM after loading, creating directly');
            const dialogHTML = createBackupDialogDirectly();
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = dialogHTML;

            // Append dialogs to the body
            while (tempContainer.firstChild) {
                document.body.appendChild(tempContainer.firstChild);
            }

            // Update references
            backupDialog = document.getElementById('backup-dialog');
            restoreDialog = document.getElementById('restore-dialog');
            backupHistoryDialog = document.getElementById('backup-history-dialog');
        }

        // Set up dialog event listeners
        setupDialogEventListeners();

        // Set up main button event listeners
        if (createBackupBtn) {
            console.log('Setting up createBackupBtn event listener');
            createBackupBtn.addEventListener('click', showBackupDialog);
        } else {
            console.warn('createBackupBtn not found');
        }

        if (restoreBackupBtn) {
            console.log('Setting up restoreBackupBtn event listener');
            restoreBackupBtn.addEventListener('click', showRestoreDialog);
        } else {
            console.warn('restoreBackupBtn not found');
        }

        if (viewBackupHistoryBtn) {
            console.log('Setting up viewBackupHistoryBtn event listener');
            viewBackupHistoryBtn.addEventListener('click', showBackupHistoryDialog);
        } else {
            console.warn('viewBackupHistoryBtn not found');
        }

        // Register progress event listeners
        registerBackupProgressListener();

        // Set up autoBackupToggle
        if (autoBackupToggle) {
            console.log('Setting up autoBackupToggle event listener');

            // Set initial state from localStorage
            autoBackupToggle.checked = localStorage.getItem('autoBackup') === 'true';

            // Add event listener
            autoBackupToggle.addEventListener('change', function() {
                localStorage.setItem('autoBackup', this.checked);

                if (window.electronAPI && window.electronAPI.setAutoBackup) {
                    window.electronAPI.setAutoBackup(this.checked)
                        .then(result => {
                            if (result.success) {
                                showNotification(`Automatic backups ${this.checked ? 'enabled' : 'disabled'}`);
                            } else {
                                showNotification(`Failed to ${this.checked ? 'enable' : 'disable'} automatic backups: ${result.error}`, { type: 'error' });
                                // Reset toggle
                                this.checked = !this.checked;
                                localStorage.setItem('autoBackup', this.checked);
                            }
                        })
                        .catch(error => {
                            console.error('Error setting auto backup:', error);
                            showNotification(`Failed to ${this.checked ? 'enable' : 'disable'} automatic backups`, { type: 'error' });
                            // Reset toggle
                            this.checked = !this.checked;
                            localStorage.setItem('autoBackup', this.checked);
                        });
                }
            });
        } else {
            console.warn('autoBackupToggle not found');
        }
    }, 100);

    // autoBackupToggle event listener is now set up in the setTimeout callback
}

// Load dialog HTML
async function loadDialogs() {
    try {
        // Check if dialogs are already loaded
        if (document.getElementById('backup-dialog')) {
            return;
        }

        // Fetch dialog HTML - try multiple possible paths
        let response;
        const possiblePaths = [
            '../html/dialogs/backup-dialog.html',
            'html/dialogs/backup-dialog.html',
            './html/dialogs/backup-dialog.html',
            '/html/dialogs/backup-dialog.html',
            'src/html/dialogs/backup-dialog.html'
        ];

        let lastError = '';
        for (const dialogPath of possiblePaths) {
            try {
                console.log(`Trying to load dialog from: ${dialogPath}`);
                response = await fetch(dialogPath);
                if (response.ok) {
                    console.log(`Successfully loaded dialog from: ${dialogPath}`);
                    break;
                } else {
                    lastError = `Failed to load from ${dialogPath}: ${response.status}`;
                    console.error(lastError);
                }
            } catch (error) {
                lastError = `Error loading from ${dialogPath}: ${error.message}`;
                console.error(lastError);
            }
        }

        if (!response || !response.ok) {
            // If all paths failed, try to create the dialog directly
            console.warn('All paths failed to load dialog HTML. Creating dialog directly.');
            return createBackupDialogDirectly();
        }

        let html;
        try {
            html = await response.text();
        } catch (error) {
            console.error('Error reading response text:', error);
            return createBackupDialogDirectly();
        }

        // Create a temporary container
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = html;

        // Append dialogs to the body
        while (tempContainer.firstChild) {
            document.body.appendChild(tempContainer.firstChild);
        }

        // Set up dialog event listeners
        setupDialogEventListeners();
    } catch (error) {
        console.error('Error loading backup dialogs:', error);
        showNotification('Failed to load backup dialogs', { type: 'error' });
    }
}

// Set up dialog event listeners
function setupDialogEventListeners() {
    console.log('Setting up dialog event listeners');

    try {
        // Close buttons
        document.querySelectorAll('.dialog-close-btn, .dialog-cancel-btn').forEach(button => {
            button.addEventListener('click', function() {
                const dialog = this.closest('.dialog-container');
                if (dialog) {
                    hideDialog(dialog);
                }
            });
        });

        // Backup dialog
        const startBackupBtn = document.getElementById('start-backup-btn');
        if (startBackupBtn) {
            console.log('Found start-backup-btn, adding event listener');
            startBackupBtn.addEventListener('click', startBackup);
        } else {
            console.warn('start-backup-btn not found');
        }

        const browseBackupLocationBtn = document.getElementById('browse-backup-location');
        if (browseBackupLocationBtn) {
            console.log('Found browse-backup-location, adding event listener');
            browseBackupLocationBtn.addEventListener('click', browseBackupLocation);
        } else {
            console.warn('browse-backup-location not found');
        }

        // Restore dialog
        const startRestoreBtn = document.getElementById('start-restore-btn');
        if (startRestoreBtn) {
            console.log('Found start-restore-btn, adding event listener');
            startRestoreBtn.addEventListener('click', startRestore);
        } else {
            console.warn('start-restore-btn not found');
        }

        const browseRestoreFileBtn = document.getElementById('browse-restore-file');
        if (browseRestoreFileBtn) {
            console.log('Found browse-restore-file, adding event listener');
            browseRestoreFileBtn.addEventListener('click', browseRestoreFile);
        } else {
            console.warn('browse-restore-file not found');
        }

        // Backup history dialog
        const clearBackupHistoryBtn = document.getElementById('clear-backup-history-btn');
        if (clearBackupHistoryBtn) {
            console.log('Found clear-backup-history-btn, adding event listener');
            clearBackupHistoryBtn.addEventListener('click', clearBackupHistory);
        } else {
            console.warn('clear-backup-history-btn not found');
        }

        console.log('Dialog event listeners set up successfully');
    } catch (error) {
        console.error('Error setting up dialog event listeners:', error);
    }
}

// Show backup dialog
function showBackupDialog() {
    // Set default backup location
    const backupLocationInput = document.getElementById('backup-location');
    if (backupLocationInput && window.electronAPI && window.electronAPI.getDefaultBackupPath) {
        window.electronAPI.getDefaultBackupPath()
            .then(path => {
                backupLocationInput.value = path;
            })
            .catch(error => {
                console.error('Error getting default backup path:', error);
                backupLocationInput.value = '';
            });
    }

    // Reset form
    const backupDescriptionInput = document.getElementById('backup-description');
    if (backupDescriptionInput) {
        const now = new Date();
        backupDescriptionInput.value = `WinTool Backup - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    }

    // Reset progress
    const progressBar = document.querySelector('.backup-progress .progress-bar');
    const progressStatus = document.querySelector('.backup-progress .progress-status');
    const progressContainer = document.querySelector('.backup-progress');

    if (progressBar && progressStatus && progressContainer) {
        progressBar.style.width = '0%';
        progressStatus.textContent = 'Preparing backup...';
        progressContainer.style.display = 'none';
    }

    // Show dialog
    showDialog(document.getElementById('backup-dialog'));
}

// Show restore dialog
function showRestoreDialog() {
    // Reset form
    const restoreFileInput = document.getElementById('restore-file');
    if (restoreFileInput) {
        restoreFileInput.value = '';
    }

    // Hide backup info
    const backupInfo = document.querySelector('.backup-info');
    if (backupInfo) {
        backupInfo.style.display = 'none';
    }

    // Reset restore categories
    const restoreCategories = document.getElementById('restore-categories');
    if (restoreCategories) {
        restoreCategories.innerHTML = '<div class="placeholder-text">Select a backup file to see available categories</div>';
    }

    // Reset progress
    const progressBar = document.querySelector('.restore-progress .progress-bar');
    const progressStatus = document.querySelector('.restore-progress .progress-status');
    const progressContainer = document.querySelector('.restore-progress');

    if (progressBar && progressStatus && progressContainer) {
        progressBar.style.width = '0%';
        progressStatus.textContent = 'Preparing restore...';
        progressContainer.style.display = 'none';
    }

    // Show dialog
    showDialog(document.getElementById('restore-dialog'));
}

// Show backup history dialog
function showBackupHistoryDialog() {
    // Load backup history
    loadBackupHistory();

    // Show dialog
    showDialog(document.getElementById('backup-history-dialog'));
}

// Show dialog
function showDialog(dialog) {
    if (dialog) {
        dialog.style.display = 'flex';
    }
}

// Hide dialog
function hideDialog(dialog) {
    if (dialog) {
        dialog.style.display = 'none';
    }
}

// Browse for backup location
function browseBackupLocation() {
    if (window.electronAPI && window.electronAPI.showSaveDialog) {
        window.electronAPI.showSaveDialog({
            title: 'Select Backup Location',
            defaultPath: document.getElementById('backup-location').value || '',
            filters: [
                { name: 'WinTool Backup', extensions: ['wtbackup'] }
            ]
        })
            .then(result => {
                if (!result.canceled && result.filePath) {
                    document.getElementById('backup-location').value = result.filePath;
                }
            })
            .catch(error => {
                console.error('Error showing save dialog:', error);
                showNotification('Failed to open file dialog', { type: 'error' });
            });
    }
}

// Browse for restore file
function browseRestoreFile() {
    if (window.electronAPI && window.electronAPI.showOpenDialog) {
        window.electronAPI.showOpenDialog({
            title: 'Select Backup File',
            properties: ['openFile'],
            filters: [
                { name: 'WinTool Backup', extensions: ['wtbackup'] }
            ]
        })
            .then(result => {
                if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    document.getElementById('restore-file').value = filePath;

                    // Load backup info
                    loadBackupInfo(filePath);
                }
            })
            .catch(error => {
                console.error('Error showing open dialog:', error);
                showNotification('Failed to open file dialog', { type: 'error' });
            });
    }
}

// Load backup info
function loadBackupInfo(filePath) {
    if (window.electronAPI && window.electronAPI.getBackupInfo) {
        window.electronAPI.getBackupInfo(filePath)
            .then(info => {
                if (info.success) {
                    // Show backup info
                    const backupInfo = document.querySelector('.backup-info');
                    if (backupInfo) {
                        backupInfo.style.display = 'block';
                    }

                    // Set backup info
                    const backupDate = document.getElementById('backup-date');
                    const backupDescription = document.getElementById('backup-info-description');
                    const backupContents = document.getElementById('backup-contents');

                    if (backupDate && info.metadata && info.metadata.date) {
                        const date = new Date(info.metadata.date);
                        backupDate.textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                    } else if (backupDate) {
                        backupDate.textContent = 'Unknown';
                    }

                    if (backupDescription && info.metadata && info.metadata.description) {
                        backupDescription.textContent = info.metadata.description;
                    } else if (backupDescription) {
                        backupDescription.textContent = 'No description';
                    }

                    if (backupContents && info.metadata && info.metadata.categories) {
                        backupContents.textContent = info.metadata.categories.join(', ');
                    } else if (backupContents) {
                        backupContents.textContent = 'Unknown';
                    }

                    // Populate restore categories
                    populateRestoreCategories(info.metadata);
                } else {
                    showNotification(`Failed to load backup info: ${info.error}`, { type: 'error' });
                }
            })
            .catch(error => {
                console.error('Error loading backup info:', error);
                showNotification('Failed to load backup info', { type: 'error' });
            });
    }
}

// Populate restore categories
function populateRestoreCategories(metadata) {
    const restoreCategories = document.getElementById('restore-categories');
    if (!restoreCategories || !metadata || !metadata.categories || !metadata.categories.length) {
        return;
    }

    // Clear existing categories
    restoreCategories.innerHTML = '';

    // Add categories
    metadata.categories.forEach(category => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = true;
        input.dataset.category = category;

        const span = document.createElement('span');
        span.textContent = getCategoryDisplayName(category);

        label.appendChild(input);
        label.appendChild(span);

        restoreCategories.appendChild(label);
    });
}

// Get category display name
function getCategoryDisplayName(category) {
    const displayNames = {
        'app_settings': 'Application Settings',
        'system_configs': 'System Configurations',
        'tweaks': 'Applied Tweaks',
        'user_profiles': 'User Profiles',
        'custom': 'Custom Data'
    };

    return displayNames[category] || category;
}

// Start backup process
function startBackup() {
    // Get form values
    const description = document.getElementById('backup-description').value;
    const backupPath = document.getElementById('backup-location').value;
    const createVerification = document.getElementById('backup-create-verification').checked;

    // Get selected categories
    const categories = [];
    if (document.getElementById('backup-app-settings').checked) {
        categories.push('app_settings');
    }
    if (document.getElementById('backup-system-configs').checked) {
        categories.push('system_configs');
    }
    if (document.getElementById('backup-tweaks').checked) {
        categories.push('tweaks');
    }
    if (document.getElementById('backup-user-profiles').checked) {
        categories.push('user_profiles');
    }

    // Validate form
    if (!backupPath) {
        showNotification('Please select a backup location', { type: 'error' });
        return;
    }

    if (categories.length === 0) {
        showNotification('Please select at least one category to backup', { type: 'error' });
        return;
    }

    // Show progress
    const progressBar = document.querySelector('.backup-progress .progress-bar');
    const progressStatus = document.querySelector('.backup-progress .progress-status');
    const progressContainer = document.querySelector('.backup-progress');

    if (progressBar && progressStatus && progressContainer) {
        progressBar.style.width = '0%';
        progressStatus.textContent = 'Preparing backup...';
        progressContainer.style.display = 'block';
    }

    // Disable form elements
    const formElements = document.querySelectorAll('#backup-dialog input, #backup-dialog button:not(.dialog-close-btn)');
    formElements.forEach(element => {
        element.disabled = true;
    });

    // Collect application settings from localStorage
    const appSettings = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        appSettings[key] = localStorage.getItem(key);
    }

    // Create backup options
    const options = {
        description: description,
        categories: categories,
        createVerification: createVerification,
        appSettings: appSettings
    };

    // Start backup
    if (window.electronAPI && window.electronAPI.createBackup) {
        window.electronAPI.createBackup(backupPath, options)
            .then(result => {
                // Re-enable form elements
                formElements.forEach(element => {
                    element.disabled = false;
                });

                if (result.success) {
                    // Update progress
                    if (progressBar && progressStatus) {
                        progressBar.style.width = '100%';
                        progressStatus.textContent = 'Backup completed successfully';
                    }

                    showNotification('Backup completed successfully', { type: 'success' });

                    // Close dialog after a delay
                    setTimeout(() => {
                        hideDialog(document.getElementById('backup-dialog'));
                    }, 2000);
                } else {
                    // Update progress
                    if (progressBar && progressStatus) {
                        progressBar.style.width = '100%';
                        progressBar.style.backgroundColor = '#e53935';
                        progressStatus.textContent = `Backup failed: ${result.error}`;
                    }

                    showNotification(`Backup failed: ${result.error}`, { type: 'error' });
                }
            })
            .catch(error => {
                console.error('Error creating backup:', error);

                // Re-enable form elements
                formElements.forEach(element => {
                    element.disabled = false;
                });

                // Update progress
                if (progressBar && progressStatus) {
                    progressBar.style.width = '100%';
                    progressBar.style.backgroundColor = '#e53935';
                    progressStatus.textContent = 'Backup failed';
                }

                showNotification('Failed to create backup', { type: 'error' });
            });
    }
}

// Start restore process
function startRestore() {
    // Get form values
    const backupFile = document.getElementById('restore-file').value;
    const verifyBackup = document.getElementById('restore-verify-backup').checked;

    // Get selected categories
    const categories = [];
    const categoryCheckboxes = document.querySelectorAll('#restore-categories input[type="checkbox"]');
    categoryCheckboxes.forEach(checkbox => {
        if (checkbox.checked && checkbox.dataset.category) {
            categories.push(checkbox.dataset.category);
        }
    });

    // Validate form
    if (!backupFile) {
        showNotification('Please select a backup file', { type: 'error' });
        return;
    }

    if (categories.length === 0) {
        showNotification('Please select at least one category to restore', { type: 'error' });
        return;
    }

    // Confirm restore
    if (!confirm('Are you sure you want to restore from this backup? The application will restart after the restore is complete.')) {
        return;
    }

    // Show progress
    const progressBar = document.querySelector('.restore-progress .progress-bar');
    const progressStatus = document.querySelector('.restore-progress .progress-status');
    const progressContainer = document.querySelector('.restore-progress');

    if (progressBar && progressStatus && progressContainer) {
        progressBar.style.width = '0%';
        progressStatus.textContent = 'Preparing restore...';
        progressContainer.style.display = 'block';
    }

    // Disable form elements
    const formElements = document.querySelectorAll('#restore-dialog input, #restore-dialog button:not(.dialog-close-btn)');
    formElements.forEach(element => {
        element.disabled = true;
    });

    // Create restore options
    const options = {
        categories: categories,
        verifyBackup: verifyBackup
    };

    // Start restore
    if (window.electronAPI && window.electronAPI.restoreBackup) {
        window.electronAPI.restoreBackup(backupFile, options)
            .then(result => {
                // Re-enable form elements
                formElements.forEach(element => {
                    element.disabled = false;
                });

                if (result.success) {
                    // Update progress
                    if (progressBar && progressStatus) {
                        progressBar.style.width = '100%';
                        progressStatus.textContent = 'Restore completed successfully';
                    }

                    showNotification('Restore completed successfully. The application will restart.', { type: 'success' });

                    // Close dialog and restart app after a delay
                    setTimeout(() => {
                        hideDialog(document.getElementById('restore-dialog'));

                        // Restart app
                        if (window.electronAPI && window.electronAPI.restartApp) {
                            window.electronAPI.restartApp();
                        }
                    }, 2000);
                } else {
                    // Update progress
                    if (progressBar && progressStatus) {
                        progressBar.style.width = '100%';
                        progressBar.style.backgroundColor = '#e53935';
                        progressStatus.textContent = `Restore failed: ${result.error}`;
                    }

                    showNotification(`Restore failed: ${result.error}`, { type: 'error' });
                }
            })
            .catch(error => {
                console.error('Error restoring backup:', error);

                // Re-enable form elements
                formElements.forEach(element => {
                    element.disabled = false;
                });

                // Update progress
                if (progressBar && progressStatus) {
                    progressBar.style.width = '100%';
                    progressBar.style.backgroundColor = '#e53935';
                    progressStatus.textContent = 'Restore failed';
                }

                showNotification('Failed to restore backup', { type: 'error' });
            });
    }
}

// Load backup history
function loadBackupHistory() {
    const tbody = document.getElementById('backup-history-tbody');
    if (!tbody) {
        return;
    }

    // Show loading placeholder
    tbody.innerHTML = '<tr class="placeholder-row"><td colspan="4">Loading backup history...</td></tr>';

    // Load backup history
    if (window.electronAPI && window.electronAPI.getBackupHistory) {
        window.electronAPI.getBackupHistory()
            .then(history => {
                if (history && history.length > 0) {
                    // Clear placeholder
                    tbody.innerHTML = '';

                    // Add history items
                    history.forEach(item => {
                        const tr = document.createElement('tr');

                        // Date
                        const dateCell = document.createElement('td');
                        if (item.date) {
                            const date = new Date(item.date);
                            dateCell.textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                        } else {
                            dateCell.textContent = 'Unknown';
                        }
                        tr.appendChild(dateCell);

                        // Description
                        const descriptionCell = document.createElement('td');
                        descriptionCell.textContent = item.description || 'No description';
                        tr.appendChild(descriptionCell);

                        // Categories
                        const categoriesCell = document.createElement('td');
                        if (item.categories && item.categories.length > 0) {
                            categoriesCell.textContent = item.categories.map(getCategoryDisplayName).join(', ');
                        } else {
                            categoriesCell.textContent = 'Unknown';
                        }
                        tr.appendChild(categoriesCell);

                        // Actions
                        const actionsCell = document.createElement('td');
                        const actionsDiv = document.createElement('div');
                        actionsDiv.className = 'backup-history-actions';

                        // Restore button
                        const restoreBtn = document.createElement('button');
                        restoreBtn.innerHTML = '<i class="fas fa-upload" title="Restore"></i>';
                        restoreBtn.addEventListener('click', () => {
                            // Close history dialog
                            hideDialog(document.getElementById('backup-history-dialog'));

                            // Open restore dialog with this backup
                            document.getElementById('restore-file').value = item.path;
                            loadBackupInfo(item.path);
                            showRestoreDialog();
                        });
                        actionsDiv.appendChild(restoreBtn);

                        // Delete button
                        const deleteBtn = document.createElement('button');
                        deleteBtn.innerHTML = '<i class="fas fa-trash-alt" title="Delete"></i>';
                        deleteBtn.addEventListener('click', () => {
                            if (confirm('Are you sure you want to delete this backup?')) {
                                deleteBackup(item.path);
                            }
                        });
                        actionsDiv.appendChild(deleteBtn);

                        actionsCell.appendChild(actionsDiv);
                        tr.appendChild(actionsCell);

                        tbody.appendChild(tr);
                    });
                } else {
                    // No history
                    tbody.innerHTML = '<tr class="placeholder-row"><td colspan="4">No backup history found</td></tr>';
                }
            })
            .catch(error => {
                console.error('Error loading backup history:', error);
                tbody.innerHTML = '<tr class="placeholder-row"><td colspan="4">Failed to load backup history</td></tr>';
            });
    }
}

// Delete backup
function deleteBackup(backupPath) {
    if (window.electronAPI && window.electronAPI.deleteBackup) {
        window.electronAPI.deleteBackup(backupPath)
            .then(result => {
                if (result.success) {
                    showNotification('Backup deleted successfully', { type: 'success' });

                    // Reload backup history
                    loadBackupHistory();
                } else {
                    showNotification(`Failed to delete backup: ${result.error}`, { type: 'error' });
                }
            })
            .catch(error => {
                console.error('Error deleting backup:', error);
                showNotification('Failed to delete backup', { type: 'error' });
            });
    }
}

// Clear backup history
function clearBackupHistory() {
    if (!confirm('Are you sure you want to clear all backup history? This will not delete the backup files.')) {
        return;
    }

    if (window.electronAPI && window.electronAPI.clearBackupHistory) {
        window.electronAPI.clearBackupHistory()
            .then(result => {
                if (result.success) {
                    showNotification('Backup history cleared successfully', { type: 'success' });

                    // Reload backup history
                    loadBackupHistory();
                } else {
                    showNotification(`Failed to clear backup history: ${result.error}`, { type: 'error' });
                }
            })
            .catch(error => {
                console.error('Error clearing backup history:', error);
                showNotification('Failed to clear backup history', { type: 'error' });
            });
    }
}

// Register backup progress event listener
function registerBackupProgressListener() {
    if (window.electronAPI && window.electronAPI.onBackupProgress) {
        window.electronAPI.onBackupProgress((event) => {
            const progressBar = document.querySelector('.backup-progress .progress-bar');
            const progressStatus = document.querySelector('.backup-progress .progress-status');

            if (progressBar && progressStatus && event) {
                progressBar.style.width = `${event.progress}%`;
                progressStatus.textContent = event.status || 'Processing...';
            }
        });
    }

    if (window.electronAPI && window.electronAPI.onRestoreProgress) {
        window.electronAPI.onRestoreProgress((event) => {
            const progressBar = document.querySelector('.restore-progress .progress-bar');
            const progressStatus = document.querySelector('.restore-progress .progress-status');

            if (progressBar && progressStatus && event) {
                progressBar.style.width = `${event.progress}%`;
                progressStatus.textContent = event.status || 'Processing...';
            }
        });
    }
}

// Function to create backup dialog HTML directly
function createBackupDialogDirectly() {
    console.log('Creating backup dialog HTML directly');

    // Create backup dialog HTML
    const backupDialogHTML = `
    <!-- Backup Dialog -->
    <div id="backup-dialog" class="dialog-container">
        <div class="dialog">
            <div class="dialog-header">
                <h2><i class="fas fa-save"></i> Create Backup</h2>
                <button class="dialog-close-btn"><i class="fas fa-times"></i></button>
            </div>
            <div class="dialog-content">
                <div class="dialog-section">
                    <h3>Backup Options</h3>
                    <div class="form-group">
                        <label for="backup-description">Description</label>
                        <input type="text" id="backup-description" placeholder="Enter a description for this backup" class="form-control">
                    </div>

                    <div class="form-group">
                        <label>What to include in the backup:</label>
                        <div class="checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="backup-app-settings" checked>
                                <span>Application Settings</span>
                                <span class="checkbox-description">Theme, accent color, sidebar state, etc.</span>
                            </label>

                            <label class="checkbox-label">
                                <input type="checkbox" id="backup-system-configs">
                                <span>System Configurations</span>
                                <span class="checkbox-description">Registry settings and system preferences</span>
                            </label>

                            <label class="checkbox-label">
                                <input type="checkbox" id="backup-tweaks">
                                <span>Applied Tweaks</span>
                                <span class="checkbox-description">System tweaks and optimizations</span>
                            </label>

                            <label class="checkbox-label">
                                <input type="checkbox" id="backup-user-profiles">
                                <span>User Profiles</span>
                                <span class="checkbox-description">User-specific settings and preferences</span>
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="backup-create-verification" checked>
                            <span>Create verification file</span>
                            <span class="checkbox-description">Helps verify backup integrity during restore</span>
                        </label>
                    </div>

                    <div class="form-group">
                        <label for="backup-location">Backup Location</label>
                        <div class="input-with-button">
                            <input type="text" id="backup-location" class="form-control" readonly>
                            <button id="browse-backup-location" class="btn btn-secondary">Browse</button>
                        </div>
                    </div>
                </div>

                <div class="backup-progress" style="display: none;">
                    <div class="progress-bar-container">
                        <div class="progress-bar"></div>
                    </div>
                    <div class="progress-status">Preparing backup...</div>
                </div>
            </div>
            <div class="dialog-footer">
                <button class="btn btn-secondary dialog-cancel-btn">Cancel</button>
                <button class="btn btn-primary" id="start-backup-btn">Create Backup</button>
            </div>
        </div>
    </div>

    <!-- Restore Dialog -->
    <div id="restore-dialog" class="dialog-container">
        <div class="dialog">
            <div class="dialog-header">
                <h2><i class="fas fa-upload"></i> Restore from Backup</h2>
                <button class="dialog-close-btn"><i class="fas fa-times"></i></button>
            </div>
            <div class="dialog-content">
                <div class="dialog-section">
                    <h3>Restore Options</h3>

                    <div class="form-group">
                        <label for="restore-file">Backup File</label>
                        <div class="input-with-button">
                            <input type="text" id="restore-file" class="form-control" readonly>
                            <button id="browse-restore-file" class="btn btn-secondary">Browse</button>
                        </div>
                    </div>

                    <div class="form-group backup-info" style="display: none;">
                        <label>Backup Information</label>
                        <div class="info-box">
                            <div class="info-row">
                                <span class="info-label">Created:</span>
                                <span class="info-value" id="backup-date">-</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Description:</span>
                                <span class="info-value" id="backup-info-description">-</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Contents:</span>
                                <span class="info-value" id="backup-contents">-</span>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>What to restore:</label>
                        <div class="checkbox-group" id="restore-categories">
                            <div class="placeholder-text">Select a backup file to see available categories</div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="restore-verify-backup" checked>
                            <span>Verify backup integrity</span>
                            <span class="checkbox-description">Check backup file integrity before restoring</span>
                        </label>
                    </div>

                    <div class="warning-box">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>Warning:</strong> Restoring from a backup will overwrite your current settings.
                            The application will restart after the restore is complete.
                        </div>
                    </div>
                </div>

                <div class="restore-progress" style="display: none;">
                    <div class="progress-bar-container">
                        <div class="progress-bar"></div>
                    </div>
                    <div class="progress-status">Preparing restore...</div>
                </div>
            </div>
            <div class="dialog-footer">
                <button class="btn btn-secondary dialog-cancel-btn">Cancel</button>
                <button class="btn btn-primary" id="start-restore-btn">Restore</button>
            </div>
        </div>
    </div>

    <!-- Backup History Dialog -->
    <div id="backup-history-dialog" class="dialog-container">
        <div class="dialog wide-dialog">
            <div class="dialog-header">
                <h2><i class="fas fa-history"></i> Backup History</h2>
                <button class="dialog-close-btn"><i class="fas fa-times"></i></button>
            </div>
            <div class="dialog-content">
                <div class="backup-history-list">
                    <table class="backup-history-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Categories</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="backup-history-tbody">
                            <tr class="placeholder-row">
                                <td colspan="4">Loading backup history...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="dialog-footer">
                <button class="btn btn-secondary dialog-cancel-btn">Close</button>
                <button class="btn btn-danger" id="clear-backup-history-btn">Clear History</button>
            </div>
        </div>
    </div>
    `;

    // Add CSS styles
    const dialogStyles = `
    <style>
        /* Dialog Styles */
        .dialog-container {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }

        .dialog {
            background-color: #1e1e24;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            width: 550px;
            max-width: 90%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #2e2e36;
        }

        .wide-dialog {
            width: 750px;
        }

        .dialog-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px 20px;
            background-color: #27272f;
            border-bottom: 1px solid #2e2e36;
        }

        .dialog-header h2 {
            font-size: 1.2rem;
            font-weight: 600;
            color: #f0f0f0;
            margin: 0;
            display: flex;
            align-items: center;
        }

        .dialog-header h2 i {
            margin-right: 10px;
            color: var(--primary);
        }

        .dialog-close-btn {
            background: none;
            border: none;
            color: #a0a0a0;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 5px;
        }

        .dialog-close-btn:hover {
            color: #f0f0f0;
        }

        .dialog-content {
            padding: 20px;
            overflow-y: auto;
            max-height: calc(90vh - 130px);
        }

        .dialog-footer {
            display: flex;
            justify-content: flex-end;
            padding: 15px 20px;
            background-color: #27272f;
            border-top: 1px solid #2e2e36;
            gap: 10px;
        }

        /* Form Styles */
        .form-group {
            margin-bottom: 15px;
        }

        .form-group label {
            display: block;
            font-weight: 500;
            color: #e0e0e0;
            margin-bottom: 5px;
        }

        .form-control {
            width: 100%;
            padding: 8px 12px;
            background-color: #27272f;
            border: 1px solid #3e3e46;
            border-radius: 4px;
            color: #e0e0e0;
        }

        .input-with-button {
            display: flex;
            gap: 10px;
        }

        .input-with-button .form-control {
            flex: 1;
        }

        .checkbox-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 5px;
        }

        .checkbox-label {
            display: flex;
            align-items: flex-start;
            cursor: pointer;
        }

        .checkbox-label input {
            margin-top: 3px;
            margin-right: 10px;
        }

        .checkbox-label span {
            display: block;
        }

        .checkbox-description {
            font-size: 0.85rem;
            color: #a0a0a0;
            margin-top: 2px;
            margin-left: 24px;
        }

        /* Progress Bar */
        .progress-bar-container {
            height: 10px;
            background-color: #27272f;
            border-radius: 5px;
            overflow: hidden;
            margin-bottom: 10px;
        }

        .progress-bar {
            height: 100%;
            background-color: var(--primary);
            width: 0%;
            transition: width 0.3s;
        }

        .progress-status {
            font-size: 0.9rem;
            color: #a0a0a0;
            text-align: center;
        }

        /* Info Box */
        .info-box {
            background-color: #27272f;
            border-radius: 4px;
            padding: 10px 15px;
            border: 1px solid #3e3e46;
        }

        .info-row {
            display: flex;
            margin-bottom: 5px;
        }

        .info-row:last-child {
            margin-bottom: 0;
        }

        .info-label {
            font-weight: 500;
            color: #a0a0a0;
            width: 100px;
        }

        .info-value {
            color: #e0e0e0;
            flex: 1;
        }

        /* Warning Box */
        .warning-box {
            display: flex;
            align-items: flex-start;
            background-color: rgba(255, 152, 0, 0.1);
            border: 1px solid rgba(255, 152, 0, 0.3);
            border-radius: 4px;
            padding: 10px 15px;
            margin-top: 20px;
        }

        .warning-box i {
            color: #ff9800;
            font-size: 1.2rem;
            margin-right: 10px;
            margin-top: 2px;
        }

        /* Backup History Table */
        .backup-history-table {
            width: 100%;
            border-collapse: collapse;
        }

        .backup-history-table th,
        .backup-history-table td {
            padding: 10px 15px;
            text-align: left;
            border-bottom: 1px solid #2e2e36;
        }

        .backup-history-table th {
            background-color: #27272f;
            color: #e0e0e0;
            font-weight: 500;
        }

        .backup-history-table tbody tr:hover {
            background-color: #27272f;
        }

        .backup-history-table .placeholder-row td {
            text-align: center;
            color: #a0a0a0;
            padding: 20px;
        }

        .backup-history-actions {
            display: flex;
            gap: 5px;
        }

        .backup-history-actions button {
            background: none;
            border: none;
            color: #a0a0a0;
            cursor: pointer;
            padding: 5px;
            font-size: 1rem;
        }

        .backup-history-actions button:hover {
            color: var(--primary);
        }

        .placeholder-text {
            color: #a0a0a0;
            font-style: italic;
            padding: 10px 0;
        }
    </style>
    `;

    return backupDialogHTML + dialogStyles;
}

// Helper function to show notifications
function showNotification(message, options = {}) {
    if (window.showNotification) {
        window.showNotification(message, options);
    } else {
        console.log(`Notification: ${message}`);
        alert(message);
    }
}

// Export the initialization function
window.initBackupRestore = initBackupRestore;
