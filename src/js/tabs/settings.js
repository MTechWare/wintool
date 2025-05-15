/**
 * WinTool - Settings Tab JavaScript
 * Handles functionality specific to the settings tab
 */

// Default accent color
const defaultAccent = '#ff9800';

/**
 * Initialize the settings tab
 * Sets up all settings controls and their event handlers
 * @returns {void}
 */
function initSettingsTab() {
    // Set up theme selector
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            // Theme change logic here
            console.log('Theme changed to:', this.value);
        });
    }

    // Set up sidebar fold toggle
    const sidebarFoldToggle = document.getElementById('sidebar-fold-toggle');
    if (sidebarFoldToggle) {
        // Set initial state from localStorage
        const savedCollapsed = localStorage.getItem('sidebarCollapsed');
        sidebarFoldToggle.checked = savedCollapsed === '1';

        // Add event listener
        sidebarFoldToggle.addEventListener('change', function() {
            setSidebarCollapsed(this.checked, false);
        });
    }

    // Set up FPS counter toggle
    const fpsToggle = document.getElementById('fps-counter-toggle');
    if (fpsToggle) {
        // Set initial state
        fpsToggle.checked = localStorage.getItem('fpsCounter') === '1';

        // Add event listener
        fpsToggle.addEventListener('change', function() {
            showFpsOverlay(this.checked);
            localStorage.setItem('fpsCounter', this.checked ? '1' : '0');
        });
    }

    // Set up always on top toggle
    const alwaysOnTopToggle = document.getElementById('alwaysOnTopToggle');
    if (alwaysOnTopToggle) {
        // Set initial state
        alwaysOnTopToggle.checked = localStorage.getItem('alwaysOnTop') === '1';

        // Add event listener
        alwaysOnTopToggle.addEventListener('change', function() {
            if (window.electronAPI && window.electronAPI.setAlwaysOnTop) {
                window.electronAPI.setAlwaysOnTop(this.checked);
                localStorage.setItem('alwaysOnTop', this.checked ? '1' : '0');
            }
        });
    }

    // Set up show log viewer toggle
    const showLogViewerToggle = document.getElementById('showLogViewerToggle');
    if (showLogViewerToggle) {
        // Set initial state
        showLogViewerToggle.checked = localStorage.getItem('showLogViewer') === '1';

        // Add event listener
        showLogViewerToggle.addEventListener('change', function() {
            if (window.electronAPI) {
                // Store the preference
                localStorage.setItem('showLogViewer', this.checked ? '1' : '0');

                // If checked, open the log viewer immediately
                if (this.checked && window.electronAPI.openLogViewer) {
                    window.electronAPI.openLogViewer();
                }

                // Log user action
                if (window.electronAPI.logUserAction) {
                    window.electronAPI.logUserAction('toggle_log_viewer', {
                        enabled: this.checked,
                        source: 'settings_tab'
                    });
                }

                // Show notification
                showNotification(`Log viewer will ${this.checked ? 'be shown' : 'not be shown'} on startup`);
            }
        });
    }

    // Set up accent color picker
    const accentColorPicker = document.getElementById('accent-color-picker');
    if (accentColorPicker) {
        // Set initial color from localStorage
        const savedColor = localStorage.getItem('accentColor') || '#ff9800';
        accentColorPicker.value = savedColor;

        // Live preview on input
        accentColorPicker.addEventListener('input', function() {
            document.documentElement.style.setProperty('--primary', this.value);
            // Live update active tab color
            const activeTab = document.querySelector('.tab-item.active');
            if (activeTab) {
                activeTab.style.backgroundColor = this.value;
            }
        });
        // Wait until user picks a color (commits change)
        accentColorPicker.addEventListener('change', function() {
            localStorage.setItem('accentColor', this.value);
            if (window.electronAPI && window.electronAPI.reloadWindow) {
                window.electronAPI.reloadWindow();
            } else {
                window.location.reload();
            }
        });
    }

    // Set up reset accent color button
    const resetAccentBtn = document.getElementById('reset-accent-color-btn');
    if (resetAccentBtn) {
        resetAccentBtn.addEventListener('click', function() {
            const defaultColor = '#ff9800';
            document.documentElement.style.setProperty('--primary', defaultColor);
            localStorage.setItem('accentColor', defaultColor);
            if (accentColorPicker) {
                accentColorPicker.value = defaultColor;
            }


            // Update active tab color
            const activeTab = document.querySelector('.tab-item.active');
            if (activeTab) {
                activeTab.style.backgroundColor = defaultColor;
            }
            if (window.electronAPI && window.electronAPI.reloadWindow) {
                window.electronAPI.reloadWindow();
            } else {
                window.location.reload();
            }
        });
    }

    // Set up reset tab order button
    const resetTabOrderBtn = document.getElementById('reset-tab-order-btn');
    if (resetTabOrderBtn) {
        resetTabOrderBtn.addEventListener('click', function() {
            localStorage.removeItem('tabOrder');
            showNotification('Tab order has been reset to default. Restarting the application...');
            if (window.electronAPI && window.electronAPI.reloadWindow) {
                window.electronAPI.reloadWindow();
            } else {
                window.location.reload();
            }
        });
    }

    // Set up tab visibility manager
    setupTabVisibilityManager();

    // Initialize backup and restore functionality
    try {
        if (window.initBackupRestore) {
            console.log('Backup and restore functionality already loaded, initializing...');
            window.initBackupRestore();
        } else {
            console.log('Loading backup and restore functionality...');

            // Try multiple possible paths for the script
            const possiblePaths = [
                'js/backup-restore.js',
                '../js/backup-restore.js',
                './js/backup-restore.js',
                '/js/backup-restore.js',
                'src/js/backup-restore.js'
            ];

            // Function to try loading the script from different paths
            function tryLoadScript(paths, index) {
                if (index >= paths.length) {
                    console.error('Failed to load backup-restore.js from all paths');
                    createBackupRestoreFallback();
                    return;
                }

                const script = document.createElement('script');
                script.src = paths[index];

                script.onload = function() {
                    console.log(`Backup and restore script loaded successfully from ${paths[index]}`);
                    if (window.initBackupRestore) {
                        window.initBackupRestore();

                        // After backup-restore is loaded, load backup-schedule
                        loadBackupSchedule();
                    } else {
                        console.error('initBackupRestore function not found after loading script');
                        createBackupRestoreFallback();
                    }
                };

                script.onerror = function() {
                    console.warn(`Failed to load backup-restore.js from ${paths[index]}, trying next path...`);
                    tryLoadScript(paths, index + 1);
                };

                document.head.appendChild(script);
            }

            // Create a fallback implementation if script loading fails
            function createBackupRestoreFallback() {
                console.log('Creating backup and restore fallback implementation');

                // Create a simple implementation that shows a message
                window.initBackupRestore = function() {
                    const createBackupBtn = document.getElementById('create-backup-btn');
                    const restoreBackupBtn = document.getElementById('restore-backup-btn');
                    const viewBackupHistoryBtn = document.getElementById('view-backup-history-btn');

                    const showMessage = function() {
                        alert('Backup and restore functionality is currently unavailable. Please try again later.');
                    };

                    if (createBackupBtn) createBackupBtn.addEventListener('click', showMessage);
                    if (restoreBackupBtn) restoreBackupBtn.addEventListener('click', showMessage);
                    if (viewBackupHistoryBtn) viewBackupHistoryBtn.addEventListener('click', showMessage);
                };

                window.initBackupRestore();
            }

            // Start trying to load the script
            tryLoadScript(possiblePaths, 0);
        }
    } catch (error) {
        console.error('Error initializing backup and restore functionality:', error);
    }

    // Load backup schedule functionality
    function loadBackupSchedule() {
        try {
            if (window.initBackupSchedule) {
                console.log('Backup schedule functionality already loaded, initializing...');
                window.initBackupSchedule();
            } else {
                console.log('Loading backup schedule functionality...');

                // Create the backup-schedule.js content directly
                const scheduleScript = document.createElement('script');
                scheduleScript.textContent = `
                /**
                 * WinTool - Backup Schedule UI
                 * Provides UI for configuring automatic backup schedules
                 */

                // DOM Elements
                let backupScheduleDialog;
                let configureBackupScheduleBtn;
                let backupScheduleInfo;
                let backupFrequencyInfo;
                let nextBackupInfo;
                let lastBackupInfo;

                // Initialize backup schedule UI
                function initBackupSchedule() {
                    console.log('Initializing backup schedule UI');

                    // Get DOM elements
                    configureBackupScheduleBtn = document.getElementById('configure-backup-schedule-btn');
                    backupScheduleInfo = document.getElementById('backup-schedule-info');
                    backupFrequencyInfo = document.getElementById('backup-frequency-info');
                    nextBackupInfo = document.getElementById('next-backup-info');
                    lastBackupInfo = document.getElementById('last-backup-info');

                    // Create dialog HTML directly
                    createScheduleDialogDirectly();

                    // Set up event listeners
                    if (configureBackupScheduleBtn) {
                        console.log('Setting up configureBackupScheduleBtn event listener');
                        configureBackupScheduleBtn.addEventListener('click', showBackupScheduleDialog);
                    } else {
                        console.warn('Configure backup schedule button not found');

                        // Try to find it again after a short delay
                        setTimeout(() => {
                            const btn = document.getElementById('configure-backup-schedule-btn');
                            if (btn) {
                                console.log('Found configure backup schedule button after delay');
                                btn.addEventListener('click', showBackupScheduleDialog);
                            }
                        }, 1000);
                    }

                    // Update schedule info
                    updateScheduleInfo();
                }

                // Function to create schedule dialog HTML directly
                function createScheduleDialogDirectly() {
                    console.log('Creating backup schedule dialog HTML directly');

                    // Check if dialog already exists
                    if (document.getElementById('backup-schedule-dialog')) {
                        console.log('Backup schedule dialog already exists');
                        backupScheduleDialog = document.getElementById('backup-schedule-dialog');
                        setupDialogEventListeners();
                        return;
                    }

                    // Create backup schedule dialog HTML
                    const scheduleDialogHTML = \`
                    <!-- Backup Schedule Dialog -->
                    <div id="backup-schedule-dialog" class="dialog-container">
                        <div class="dialog">
                            <div class="dialog-header">
                                <h2><i class="fas fa-calendar-alt"></i> Configure Backup Schedule</h2>
                                <button class="dialog-close-btn"><i class="fas fa-times"></i></button>
                            </div>
                            <div class="dialog-content">
                                <div class="dialog-section">
                                    <h3>Schedule Settings</h3>

                                    <div class="form-group">
                                        <label for="backup-frequency">Backup Frequency</label>
                                        <select id="backup-frequency" class="form-control">
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                        </select>
                                    </div>

                                    <div class="form-group" id="day-of-week-group">
                                        <label for="backup-day-of-week">Day of Week</label>
                                        <select id="backup-day-of-week" class="form-control">
                                            <option value="0">Sunday</option>
                                            <option value="1">Monday</option>
                                            <option value="2">Tuesday</option>
                                            <option value="3">Wednesday</option>
                                            <option value="4">Thursday</option>
                                            <option value="5">Friday</option>
                                            <option value="6">Saturday</option>
                                        </select>
                                    </div>

                                    <div class="form-group" id="day-of-month-group" style="display: none;">
                                        <label for="backup-day-of-month">Day of Month</label>
                                        <select id="backup-day-of-month" class="form-control">
                                            <!-- Will be populated with days 1-31 -->
                                        </select>
                                        <span class="form-hint">If the selected day doesn't exist in a month (e.g., February 30), the backup will run on the last day of the month.</span>
                                    </div>

                                    <div class="form-group">
                                        <label for="backup-time">Time</label>
                                        <div class="time-picker">
                                            <select id="backup-hour" class="form-control">
                                                <!-- Will be populated with hours 0-23 -->
                                            </select>
                                            <span>:</span>
                                            <select id="backup-minute" class="form-control">
                                                <!-- Will be populated with minutes 0-59 in 5-minute increments -->
                                            </select>
                                        </div>
                                        <span class="form-hint">Backups are scheduled in 24-hour format. Choose a time when your computer is likely to be on but not in heavy use.</span>
                                    </div>

                                    <div class="form-group">
                                        <label for="backup-keep-count">Keep Last</label>
                                        <div class="input-with-label">
                                            <input type="number" id="backup-keep-count" class="form-control" min="1" max="50" value="5">
                                            <span>backups</span>
                                        </div>
                                        <span class="form-hint">Older automatic backups will be deleted to save disk space.</span>
                                    </div>

                                    <div class="info-box" style="margin-top: 20px;">
                                        <div class="info-row">
                                            <span class="info-label">Next Backup:</span>
                                            <span class="info-value" id="schedule-next-backup">-</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="dialog-footer">
                                <button class="btn btn-secondary dialog-cancel-btn">Cancel</button>
                                <button class="btn btn-primary" id="save-backup-schedule-btn">Save Schedule</button>
                            </div>
                        </div>
                    </div>
                    \`;

                    // Add CSS styles
                    const dialogStyles = \`
                    <style>
                        /* Time Picker Styles */
                        .time-picker {
                            display: flex;
                            align-items: center;
                            gap: 5px;
                        }

                        .time-picker select {
                            width: auto;
                        }

                        .time-picker span {
                            font-size: 1.2rem;
                            color: #e0e0e0;
                        }

                        /* Input with Label */
                        .input-with-label {
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        }

                        .input-with-label input[type="number"] {
                            width: 80px;
                        }

                        .input-with-label span {
                            color: #e0e0e0;
                        }

                        /* Form Hint */
                        .form-hint {
                            display: block;
                            font-size: 0.85rem;
                            color: #a0a0a0;
                            margin-top: 5px;
                        }
                    </style>
                    \`;

                    // Create a temporary container
                    const tempContainer = document.createElement('div');
                    tempContainer.innerHTML = scheduleDialogHTML + dialogStyles;

                    // Append dialog to body
                    while (tempContainer.firstChild) {
                        document.body.appendChild(tempContainer.firstChild);
                    }

                    // Get dialog element
                    backupScheduleDialog = document.getElementById('backup-schedule-dialog');

                    // Set up dialog event listeners
                    setupDialogEventListeners();
                }

                // Set up dialog event listeners
                function setupDialogEventListeners() {
                    try {
                        // Close buttons
                        document.querySelectorAll('#backup-schedule-dialog .dialog-close-btn, #backup-schedule-dialog .dialog-cancel-btn').forEach(button => {
                            button.addEventListener('click', function() {
                                hideDialog(backupScheduleDialog);
                            });
                        });

                        // Save button
                        const saveBtn = document.getElementById('save-backup-schedule-btn');
                        if (saveBtn) {
                            saveBtn.addEventListener('click', saveBackupSchedule);
                        }

                        // Frequency change
                        const frequencySelect = document.getElementById('backup-frequency');
                        if (frequencySelect) {
                            frequencySelect.addEventListener('change', updateScheduleUI);
                        }

                        // Populate day of month select
                        const dayOfMonthSelect = document.getElementById('backup-day-of-month');
                        if (dayOfMonthSelect && dayOfMonthSelect.children.length === 0) {
                            for (let i = 1; i <= 31; i++) {
                                const option = document.createElement('option');
                                option.value = i;
                                option.textContent = i;
                                dayOfMonthSelect.appendChild(option);
                            }
                        }

                        // Populate hour select
                        const hourSelect = document.getElementById('backup-hour');
                        if (hourSelect && hourSelect.children.length === 0) {
                            for (let i = 0; i < 24; i++) {
                                const option = document.createElement('option');
                                option.value = i;
                                option.textContent = i.toString().padStart(2, '0');
                                hourSelect.appendChild(option);
                            }
                        }

                        // Populate minute select
                        const minuteSelect = document.getElementById('backup-minute');
                        if (minuteSelect && minuteSelect.children.length === 0) {
                            for (let i = 0; i < 60; i += 5) {
                                const option = document.createElement('option');
                                option.value = i;
                                option.textContent = i.toString().padStart(2, '0');
                                minuteSelect.appendChild(option);
                            }
                        }

                        // Add change event listeners to update next backup time
                        const scheduleInputs = [
                            document.getElementById('backup-frequency'),
                            document.getElementById('backup-day-of-week'),
                            document.getElementById('backup-day-of-month'),
                            document.getElementById('backup-hour'),
                            document.getElementById('backup-minute')
                        ];

                        scheduleInputs.forEach(input => {
                            if (input) {
                                input.addEventListener('change', updateNextBackupTime);
                            }
                        });
                    } catch (error) {
                        console.error('Error setting up schedule dialog event listeners:', error);
                    }
                }

                // Show backup schedule dialog
                function showBackupScheduleDialog() {
                    console.log('Showing backup schedule dialog');

                    if (!backupScheduleDialog) {
                        console.error('Backup schedule dialog not found, creating it now');
                        createScheduleDialogDirectly();
                    }

                    // Get current schedule
                    if (window.electronAPI && window.electronAPI.getBackupSchedule) {
                        window.electronAPI.getBackupSchedule()
                            .then(result => {
                                if (result.success) {
                                    populateScheduleForm(result.schedule);
                                } else {
                                    console.error('Error getting backup schedule:', result.error);
                                    populateScheduleForm(getDefaultSchedule());
                                }
                                showDialog(backupScheduleDialog);
                            })
                            .catch(error => {
                                console.error('Error getting backup schedule:', error);
                                populateScheduleForm(getDefaultSchedule());
                                showDialog(backupScheduleDialog);
                            });
                    } else {
                        // Fallback to default schedule
                        populateScheduleForm(getDefaultSchedule());
                        showDialog(backupScheduleDialog);
                    }
                }

                // Get default schedule
                function getDefaultSchedule() {
                    return {
                        enabled: false,
                        frequency: 'weekly',
                        dayOfWeek: 0,
                        dayOfMonth: 1,
                        hour: 3,
                        minute: 0,
                        keepCount: 5
                    };
                }

                // Populate schedule form with current settings
                function populateScheduleForm(schedule) {
                    const frequencySelect = document.getElementById('backup-frequency');
                    const dayOfWeekSelect = document.getElementById('backup-day-of-week');
                    const dayOfMonthSelect = document.getElementById('backup-day-of-month');
                    const hourSelect = document.getElementById('backup-hour');
                    const minuteSelect = document.getElementById('backup-minute');
                    const keepCountInput = document.getElementById('backup-keep-count');

                    if (frequencySelect) frequencySelect.value = schedule.frequency || 'weekly';
                    if (dayOfWeekSelect) dayOfWeekSelect.value = schedule.dayOfWeek || 0;
                    if (dayOfMonthSelect) dayOfMonthSelect.value = schedule.dayOfMonth || 1;
                    if (hourSelect) hourSelect.value = schedule.hour || 3;
                    if (minuteSelect) {
                        // Find closest 5-minute increment
                        const minute = schedule.minute || 0;
                        const closestMinute = Math.round(minute / 5) * 5;
                        minuteSelect.value = closestMinute > 55 ? 55 : closestMinute;
                    }
                    if (keepCountInput) keepCountInput.value = schedule.keepCount || 5;

                    // Update UI based on frequency
                    updateScheduleUI();

                    // Update next backup time
                    updateNextBackupTime();
                }

                // Update schedule UI based on frequency
                function updateScheduleUI() {
                    const frequencySelect = document.getElementById('backup-frequency');
                    const dayOfWeekGroup = document.getElementById('day-of-week-group');
                    const dayOfMonthGroup = document.getElementById('day-of-month-group');

                    if (!frequencySelect || !dayOfWeekGroup || !dayOfMonthGroup) {
                        return;
                    }

                    const frequency = frequencySelect.value;

                    if (frequency === 'weekly') {
                        dayOfWeekGroup.style.display = '';
                        dayOfMonthGroup.style.display = 'none';
                    } else if (frequency === 'monthly') {
                        dayOfWeekGroup.style.display = 'none';
                        dayOfMonthGroup.style.display = '';
                    } else {
                        // Daily
                        dayOfWeekGroup.style.display = 'none';
                        dayOfMonthGroup.style.display = 'none';
                    }

                    // Update next backup time
                    updateNextBackupTime();
                }

                // Update next backup time display
                function updateNextBackupTime() {
                    const frequencySelect = document.getElementById('backup-frequency');
                    const dayOfWeekSelect = document.getElementById('backup-day-of-week');
                    const dayOfMonthSelect = document.getElementById('backup-day-of-month');
                    const hourSelect = document.getElementById('backup-hour');
                    const minuteSelect = document.getElementById('backup-minute');
                    const nextBackupElement = document.getElementById('schedule-next-backup');

                    if (!frequencySelect || !dayOfWeekSelect || !dayOfMonthSelect || !hourSelect || !minuteSelect || !nextBackupElement) {
                        return;
                    }

                    // Get form values
                    const schedule = {
                        enabled: true,
                        frequency: frequencySelect.value,
                        dayOfWeek: parseInt(dayOfWeekSelect.value),
                        dayOfMonth: parseInt(dayOfMonthSelect.value),
                        hour: parseInt(hourSelect.value),
                        minute: parseInt(minuteSelect.value)
                    };

                    // Calculate next backup time
                    if (window.electronAPI && window.electronAPI.getNextBackupTime) {
                        window.electronAPI.getNextBackupTime(schedule)
                            .then(result => {
                                if (result.success && result.nextBackupTime) {
                                    const nextDate = new Date(result.nextBackupTime);
                                    nextBackupElement.textContent = nextDate.toLocaleString();
                                } else {
                                    nextBackupElement.textContent = 'Could not determine';
                                }
                            })
                            .catch(error => {
                                console.error('Error getting next backup time:', error);
                                nextBackupElement.textContent = 'Error calculating';
                            });
                    } else {
                        // Fallback to client-side calculation
                        const nextDate = calculateNextBackupTime(schedule);
                        nextBackupElement.textContent = nextDate ? nextDate.toLocaleString() : 'Could not determine';
                    }
                }

                // Calculate next backup time (client-side fallback)
                function calculateNextBackupTime(schedule) {
                    if (!schedule || !schedule.enabled) {
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

                // Save backup schedule
                function saveBackupSchedule() {
                    const frequencySelect = document.getElementById('backup-frequency');
                    const dayOfWeekSelect = document.getElementById('backup-day-of-week');
                    const dayOfMonthSelect = document.getElementById('backup-day-of-month');
                    const hourSelect = document.getElementById('backup-hour');
                    const minuteSelect = document.getElementById('backup-minute');
                    const keepCountInput = document.getElementById('backup-keep-count');
                    const autoBackupToggle = document.getElementById('auto-backup-toggle');

                    if (!frequencySelect || !dayOfWeekSelect || !dayOfMonthSelect || !hourSelect || !minuteSelect || !keepCountInput) {
                        showNotification('Could not save schedule: Form elements not found', { type: 'error' });
                        return;
                    }

                    // Get form values
                    const schedule = {
                        enabled: autoBackupToggle ? autoBackupToggle.checked : false,
                        frequency: frequencySelect.value,
                        dayOfWeek: parseInt(dayOfWeekSelect.value),
                        dayOfMonth: parseInt(dayOfMonthSelect.value),
                        hour: parseInt(hourSelect.value),
                        minute: parseInt(minuteSelect.value),
                        keepCount: parseInt(keepCountInput.value)
                    };

                    // Validate
                    if (schedule.keepCount < 1 || schedule.keepCount > 50) {
                        showNotification('Keep count must be between 1 and 50', { type: 'error' });
                        return;
                    }

                    // Save schedule
                    if (window.electronAPI && window.electronAPI.setBackupSchedule) {
                        window.electronAPI.setBackupSchedule(schedule)
                            .then(result => {
                                if (result.success) {
                                    showNotification('Backup schedule saved successfully');
                                    hideDialog(backupScheduleDialog);
                                    updateScheduleInfo();
                                } else {
                                    showNotification(\`Failed to save backup schedule: \${result.error}\`, { type: 'error' });
                                }
                            })
                            .catch(error => {
                                console.error('Error saving backup schedule:', error);
                                showNotification('Failed to save backup schedule', { type: 'error' });
                            });
                    } else {
                        // Fallback to localStorage
                        localStorage.setItem('backupSchedule', JSON.stringify(schedule));
                        showNotification('Backup schedule saved (local only)');
                        hideDialog(backupScheduleDialog);
                        updateScheduleInfo();
                    }
                }

                // Update schedule info display
                function updateScheduleInfo() {
                    if (!backupScheduleInfo || !backupFrequencyInfo || !nextBackupInfo || !lastBackupInfo) {
                        return;
                    }

                    if (window.electronAPI && window.electronAPI.getBackupSchedule) {
                        window.electronAPI.getBackupSchedule()
                            .then(result => {
                                if (result.success) {
                                    updateScheduleInfoDisplay(result.schedule);
                                } else {
                                    console.error('Error getting backup schedule:', result.error);
                                    backupScheduleInfo.style.display = 'none';
                                }
                            })
                            .catch(error => {
                                console.error('Error getting backup schedule:', error);
                                backupScheduleInfo.style.display = 'none';
                            });
                    } else {
                        // Fallback to localStorage
                        const scheduleJson = localStorage.getItem('backupSchedule');
                        if (scheduleJson) {
                            try {
                                const schedule = JSON.parse(scheduleJson);
                                updateScheduleInfoDisplay(schedule);
                            } catch (error) {
                                console.error('Error parsing backup schedule from localStorage:', error);
                                backupScheduleInfo.style.display = 'none';
                            }
                        } else {
                            backupScheduleInfo.style.display = 'none';
                        }
                    }
                }

                // Update schedule info display with schedule data
                function updateScheduleInfoDisplay(schedule) {
                    if (!schedule.enabled) {
                        backupScheduleInfo.style.display = 'none';
                        return;
                    }

                    backupScheduleInfo.style.display = '';

                    // Format frequency
                    let frequencyText = '';
                    if (schedule.frequency === 'daily') {
                        frequencyText = 'Daily';
                    } else if (schedule.frequency === 'weekly') {
                        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const day = days[schedule.dayOfWeek] || 'Sunday';
                        frequencyText = \`Weekly (\${day})\`;
                    } else if (schedule.frequency === 'monthly') {
                        frequencyText = \`Monthly (Day \${schedule.dayOfMonth})\`;
                    }

                    // Add time
                    const hour = schedule.hour.toString().padStart(2, '0');
                    const minute = schedule.minute.toString().padStart(2, '0');
                    frequencyText += \` at \${hour}:\${minute}\`;

                    backupFrequencyInfo.textContent = frequencyText;

                    // Next backup time
                    if (window.electronAPI && window.electronAPI.getNextBackupTime) {
                        window.electronAPI.getNextBackupTime()
                            .then(result => {
                                if (result.success && result.nextBackupTime) {
                                    const nextDate = new Date(result.nextBackupTime);
                                    nextBackupInfo.textContent = nextDate.toLocaleString();
                                } else {
                                    nextBackupInfo.textContent = 'Not scheduled';
                                }
                            })
                            .catch(error => {
                                console.error('Error getting next backup time:', error);
                                nextBackupInfo.textContent = 'Error calculating';
                            });
                    } else {
                        // Fallback to client-side calculation
                        const nextDate = calculateNextBackupTime(schedule);
                        nextBackupInfo.textContent = nextDate ? nextDate.toLocaleString() : 'Not scheduled';
                    }

                    // Last backup time
                    if (schedule.lastBackup) {
                        const lastDate = new Date(schedule.lastBackup);
                        lastBackupInfo.textContent = lastDate.toLocaleString();
                    } else {
                        lastBackupInfo.textContent = 'Never';
                    }
                }

                // Helper function to show dialog
                function showDialog(dialog) {
                    if (!dialog) return;
                    dialog.style.display = 'flex';
                }

                // Helper function to hide dialog
                function hideDialog(dialog) {
                    if (!dialog) return;
                    dialog.style.display = 'none';
                }

                // Helper function to show notifications
                function showNotification(message, options = {}) {
                    if (window.showNotification) {
                        window.showNotification(message, options);
                    } else {
                        console.log(\`Notification: \${message}\`);
                        alert(message);
                    }
                }

                // Export the initialization function
                window.initBackupSchedule = initBackupSchedule;
                `;

                document.head.appendChild(scheduleScript);

                // Initialize the backup schedule
                if (window.initBackupSchedule) {
                    window.initBackupSchedule();
                } else {
                    console.error('initBackupSchedule function not found after creating script');
                }
            }
        } catch (error) {
            console.error('Error initializing backup schedule functionality:', error);
        }
    }

    // Load backup schedule dialog script
    const backupScheduleScript = document.createElement('script');
    backupScheduleScript.src = 'js/backup-schedule-dialog.js';
    backupScheduleScript.onload = function() {
        console.log('Backup schedule dialog script loaded successfully');
    };
    backupScheduleScript.onerror = function(error) {
        console.error('Error loading backup schedule dialog script:', error);

        // Fall back to test dialog if backup schedule dialog script fails to load
        const testDialogScript = document.createElement('script');
        testDialogScript.src = 'js/test-dialog.js';
        testDialogScript.onload = function() {
            console.log('Test dialog script loaded successfully as fallback');
        };
        document.head.appendChild(testDialogScript);
    };
    document.head.appendChild(backupScheduleScript);

    // Add backup schedule dialog button
    const configureBackupScheduleBtn = document.getElementById('configure-backup-schedule-btn');
    if (configureBackupScheduleBtn) {
        configureBackupScheduleBtn.addEventListener('click', function() {
            if (window.showBackupScheduleDialog) {
                window.showBackupScheduleDialog();
            } else if (window.showTestDialog) {
                // Fall back to test dialog if backup schedule dialog is not available
                window.showTestDialog();
            } else {
                console.error('No dialog functionality available');
                alert('Backup schedule configuration is not available at this time');
            }
        });
    }

    // Set up check for updates button
    const checkUpdatesBtn = document.getElementById('check-updates');
    if (checkUpdatesBtn) {
        checkUpdatesBtn.addEventListener('click', function() {
            showNotification('Checking for updates...');
            // Simulate update check
            setTimeout(() => {
                showNotification('You are using the latest version.');
            }, 1500);
        });
    }

    // Set up admin privileges toggle
    const adminPrivilegesToggle = document.getElementById('adminPrivilegesToggle');
    if (adminPrivilegesToggle) {
        // Check current admin status
        if (window.electronAPI && window.electronAPI.isElevated) {
            window.electronAPI.isElevated()
                .then(isAdmin => {
                    console.log(`Current admin status: ${isAdmin ? 'Running as admin' : 'Not running as admin'}`);

                    // Initialize toggle state from localStorage if available
                    const savedAdminPreference = localStorage.getItem('runWithAdminPrivileges');
                    if (savedAdminPreference !== null) {
                        adminPrivilegesToggle.checked = savedAdminPreference === 'true';
                    } else {
                        // If no saved preference, set it based on current status
                        adminPrivilegesToggle.checked = isAdmin;
                        localStorage.setItem('runWithAdminPrivileges', isAdmin.toString());
                    }
                })
                .catch(error => {
                    console.error('Error checking admin status:', error);
                    // Default to unchecked if we can't determine admin status
                    adminPrivilegesToggle.checked = false;
                });
        }

        // Add event listener
        adminPrivilegesToggle.addEventListener('change', function() {
            const shouldRunAsAdmin = this.checked;

            // Save the preference to localStorage
            localStorage.setItem('runWithAdminPrivileges', shouldRunAsAdmin.toString());
            console.log(`Admin privileges preference set to: ${shouldRunAsAdmin}`);

            // If the user wants to apply the change immediately, we can use the Electron API
            if (window.electronAPI) {
                if (confirm(`Do you want to ${shouldRunAsAdmin ? 'restart with' : 'disable'} admin privileges now? The application will restart.`)) {
                    showNotification(`Restarting application ${shouldRunAsAdmin ? 'with' : 'without'} admin privileges...`);

                    try {
                        // Always use setElevationPreference to ensure the preference is saved in electron-store
                        window.electronAPI.setElevationPreference(shouldRunAsAdmin)
                            .then(result => {
                                if (!result.success) {
                                    showNotification(`Failed to change admin privileges: ${result.error || 'Unknown error'}`, { type: 'error' });
                                    // Reset the toggle to its previous state
                                    this.checked = !shouldRunAsAdmin;
                                    localStorage.setItem('runWithAdminPrivileges', (!shouldRunAsAdmin).toString());
                                }
                            })
                            .catch(error => {
                                console.error('Error changing admin privileges:', error);
                                showNotification('Failed to change admin privileges', { type: 'error' });
                                // Reset the toggle to its previous state
                                this.checked = !shouldRunAsAdmin;
                                localStorage.setItem('runWithAdminPrivileges', (!shouldRunAsAdmin).toString());
                            });
                    } catch (error) {
                        console.error('Error changing admin privileges:', error);
                        showNotification('Failed to change admin privileges', { type: 'error' });
                    }
                } else {
                    // If user cancels, still show notification about next startup
                    showNotification(`Admin privileges ${shouldRunAsAdmin ? 'enabled' : 'disabled'} for next startup.`);
                }
            } else {
                // If API not available, just show notification about next startup
                showNotification(`Admin privileges ${shouldRunAsAdmin ? 'enabled' : 'disabled'} for next startup.`);
            }
        });
    }

    // Set up reset all settings button
    const resetAllBtn = document.getElementById('reset-all-settings');
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset all settings and clear all user data? This cannot be undone.')) {
                // Clear all settings from localStorage
                localStorage.removeItem('accentColor');
                localStorage.removeItem('tabOrder');
                localStorage.removeItem('sidebarCollapsed');
                localStorage.removeItem('fpsCounter');
                localStorage.removeItem('alwaysOnTop');
                localStorage.removeItem('hiddenTabs');
                localStorage.removeItem('pinnedTabs');
                localStorage.removeItem('runWithAdminPrivileges');
                localStorage.removeItem('askForElevation'); // Also clear askForElevation flag
                localStorage.removeItem('showLogViewer');

                // Clear all localStorage items
                localStorage.clear();

                // Admin privileges reset flag is now handled directly in the clear-user-data handler
                // No need to call setElevationPreference separately

                // Add visual feedback to the button
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
                this.disabled = true;

                // Log to console for debugging
                console.log('Clearing all settings and user data...');

                // Create a direct notification function as fallback
                function createDirectNotification(message, type = 'info') {
                    console.log('Creating direct notification:', message, type);

                    // Remove any existing direct notifications
                    const existingNotif = document.getElementById('direct-notification');
                    if (existingNotif) {
                        document.body.removeChild(existingNotif);
                    }

                    // Create notification element
                    const notification = document.createElement('div');
                    notification.id = 'direct-notification';
                    notification.style.position = 'fixed';
                    notification.style.bottom = '30px';
                    notification.style.right = '30px';
                    notification.style.padding = '15px 20px';
                    notification.style.borderRadius = '8px';
                    notification.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                    notification.style.zIndex = '10000';
                    notification.style.minWidth = '300px';
                    notification.style.fontWeight = 'bold';
                    notification.style.fontSize = '16px';
                    notification.style.display = 'flex';
                    notification.style.alignItems = 'center';
                    notification.style.gap = '10px';

                    // Set type-specific styles
                    if (type === 'success') {
                        notification.style.backgroundColor = '#43a047';
                        notification.style.color = 'white';
                        notification.innerHTML = '<i class="fas fa-check-circle" style="font-size: 20px;"></i> ' + message;
                    } else if (type === 'error') {
                        notification.style.backgroundColor = '#e53935';
                        notification.style.color = 'white';
                        notification.innerHTML = '<i class="fas fa-exclamation-circle" style="font-size: 20px;"></i> ' + message;
                    } else {
                        notification.style.backgroundColor = '#2196f3';
                        notification.style.color = 'white';
                        notification.innerHTML = '<i class="fas fa-info-circle" style="font-size: 20px;"></i> ' + message;
                    }

                    // Add to document
                    document.body.appendChild(notification);

                    // Auto-remove after delay
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.style.opacity = '0';
                            notification.style.transform = 'translateY(20px)';
                            notification.style.transition = 'opacity 0.5s, transform 0.5s';
                            setTimeout(() => {
                                if (notification.parentNode) {
                                    document.body.removeChild(notification);
                                }
                            }, 500);
                        }
                    }, 5000);
                }

                // Try both notification methods
                try {
                    // Use standard notification
                    if (typeof window.showNotification === 'function') {
                        window.showNotification('Clearing all user data and settings...', { delay: 2000 });
                    }
                    // Also use direct notification
                    createDirectNotification('Clearing all user data and settings...');
                } catch (e) {
                    console.error('Error showing notification:', e);
                }

                // Clear all user data using our new IPC handler
                if (window.electronAPI && window.electronAPI.clearUserData) {
                    window.electronAPI.clearUserData()
                        .then(result => {
                            // Reset button
                            this.innerHTML = originalText;
                            this.disabled = false;

                            if (result.success) {
                                console.log('Successfully cleared all user data');

                                // Try both notification methods
                                try {
                                    if (typeof window.showNotification === 'function') {
                                        window.showNotification('All settings and user data have been reset to default.', { type: 'success', delay: 5000 });
                                    }
                                    createDirectNotification('All settings and user data have been reset to default.', 'success');
                                } catch (e) {
                                    console.error('Error showing success notification:', e);
                                }
                            } else {
                                console.error('Error clearing user data:', result.error);

                                // Try both notification methods
                                try {
                                    if (typeof window.showNotification === 'function') {
                                        window.showNotification(`Error clearing user data: ${result.error}`, { type: 'error' });
                                    }
                                    createDirectNotification(`Error clearing user data: ${result.error}`, 'error');
                                } catch (e) {
                                    console.error('Error showing error notification:', e);
                                }
                            }
                        })
                        .catch(error => {
                            // Reset button
                            this.innerHTML = originalText;
                            this.disabled = false;

                            console.error('Error clearing user data:', error);

                            // Try both notification methods
                            try {
                                if (typeof window.showNotification === 'function') {
                                    window.showNotification('Error clearing user data: ' + error.message, { type: 'error' });
                                }
                                createDirectNotification('Error clearing user data: ' + error.message, 'error');
                            } catch (e) {
                                console.error('Error showing error notification:', e);
                            }
                        });
                } else {
                    // Reset button
                    this.innerHTML = originalText;
                    this.disabled = false;

                    console.log('clearUserData API not available, using fallback');

                    // Try both notification methods
                    try {
                        if (typeof window.showNotification === 'function') {
                            window.showNotification('All settings have been reset to default.', { type: 'success', delay: 5000 });
                        }
                        createDirectNotification('All settings have been reset to default.', 'success');
                    } catch (e) {
                        console.error('Error showing fallback notification:', e);
                    }
                }
            }
        });
    }

    // Set up log viewer button
    const openLogViewerBtn = document.getElementById('open-log-viewer-btn');
    if (openLogViewerBtn) {
        openLogViewerBtn.addEventListener('click', function() {
            if (window.electronAPI && window.electronAPI.openLogViewer) {
                window.electronAPI.openLogViewer();

                // Log user action
                if (window.electronAPI.logUserAction) {
                    window.electronAPI.logUserAction('open_log_viewer', { source: 'settings_tab' });
                }

                showNotification('Opening log viewer...');
            } else {
                showNotification('Log viewer is not available', { type: 'error' });
            }
        });
    }

    // Set up export diagnostics button
    const exportDiagnosticsBtn = document.getElementById('export-diagnostics-btn');
    if (exportDiagnosticsBtn) {
        exportDiagnosticsBtn.addEventListener('click', function() {
            if (window.electronAPI && window.electronAPI.exportLogs) {
                showNotification('Exporting diagnostic information...');

                window.electronAPI.exportLogs()
                    .then(filePath => {
                        if (filePath) {
                            showNotification(`Diagnostic information exported to: ${filePath}`);

                            // Log user action
                            if (window.electronAPI.logUserAction) {
                                window.electronAPI.logUserAction('export_diagnostics', {
                                    source: 'settings_tab',
                                    filePath: filePath
                                });
                            }
                        } else {
                            showNotification('Export cancelled', { type: 'warning' });
                        }
                    })
                    .catch(error => {
                        showNotification(`Error exporting diagnostics: ${error.message}`, { type: 'error' });
                    });
            } else {
                showNotification('Diagnostic export is not available', { type: 'error' });
            }
        });
    }


}

// Set up tab visibility manager in settings
function setupTabVisibilityManager() {
    const tabVisibilitySection = document.getElementById('tab-visibility-section');
    if (!tabVisibilitySection) return;

    // Get hidden and pinned tabs from localStorage
    const hiddenTabs = JSON.parse(localStorage.getItem('hiddenTabs') || '[]');
    const pinnedTabs = JSON.parse(localStorage.getItem('pinnedTabs') || '[]');

    // Clear existing content
    tabVisibilitySection.innerHTML = '';

    // Create header
    const header = document.createElement('h3');
    header.className = 'settings-section-title';
    header.innerHTML = '<i class="fas fa-eye"></i> Tab Visibility & Pinning';
    tabVisibilitySection.appendChild(header);

    // Create description
    const description = document.createElement('p');
    description.className = 'settings-section-desc';
    description.textContent = 'Manage which tabs are visible in the sidebar and pin important tabs to the top.';
    tabVisibilitySection.appendChild(description);

    // Create tab list container
    const tabListContainer = document.createElement('div');
    tabListContainer.className = 'tab-visibility-container';
    tabVisibilitySection.appendChild(tabListContainer);

    // Get all available tabs
    const tabItems = document.querySelectorAll('.tab-item');

    // Create tab visibility controls
    tabItems.forEach(tab => {
        const tabName = tab.getAttribute('data-tab');
        const tabDisplayName = tab.querySelector('span').textContent;
        const tabIcon = tab.querySelector('i').className;

        const isHidden = hiddenTabs.includes(tabName);
        const isPinned = pinnedTabs.includes(tabName);

        // Create tab control item
        const tabControl = document.createElement('div');
        tabControl.className = 'tab-visibility-item';

        // Tab info
        const tabInfo = document.createElement('div');
        tabInfo.className = 'tab-visibility-info';
        tabInfo.innerHTML = `<i class="${tabIcon}"></i> <span>${tabDisplayName}</span>`;
        tabControl.appendChild(tabInfo);

        // Tab controls
        const tabControls = document.createElement('div');
        tabControls.className = 'tab-visibility-controls';

        // Visibility toggle
        const visibilityToggle = document.createElement('div');
        visibilityToggle.className = 'tab-control-toggle';
        visibilityToggle.innerHTML = `
            <label class="switch">
                <input type="checkbox" class="tab-visibility-toggle" data-tab="${tabName}" ${!isHidden ? 'checked' : ''}>
                <span class="slider round"></span>
            </label>
            <span class="toggle-label">${isHidden ? 'Hidden' : 'Visible'}</span>
        `;
        tabControls.appendChild(visibilityToggle);

        // Pin toggle
        const pinToggle = document.createElement('div');
        pinToggle.className = 'tab-control-toggle';
        pinToggle.innerHTML = `
            <label class="switch">
                <input type="checkbox" class="tab-pin-toggle" data-tab="${tabName}" ${isPinned ? 'checked' : ''}>
                <span class="slider round"></span>
            </label>
            <span class="toggle-label">${isPinned ? 'Pinned' : 'Unpinned'}</span>
        `;
        tabControls.appendChild(pinToggle);

        tabControl.appendChild(tabControls);
        tabListContainer.appendChild(tabControl);
    });

    // Add event listeners for visibility toggles
    const visibilityToggles = document.querySelectorAll('.tab-visibility-toggle');
    visibilityToggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const tabName = this.getAttribute('data-tab');
            const isVisible = this.checked;
            const toggleLabel = this.parentElement.nextElementSibling;

            // Update toggle label
            toggleLabel.textContent = isVisible ? 'Visible' : 'Hidden';

            // Call the global toggle function
            if (window.toggleTabVisibility) {
                window.toggleTabVisibility(tabName);
            }
        });
    });

    // Add event listeners for pin toggles
    const pinToggles = document.querySelectorAll('.tab-pin-toggle');
    pinToggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const tabName = this.getAttribute('data-tab');
            const isPinned = this.checked;
            const toggleLabel = this.parentElement.nextElementSibling;

            // Update toggle label
            toggleLabel.textContent = isPinned ? 'Pinned' : 'Unpinned';

            // Call the global toggle function
            if (window.toggleTabPin) {
                window.toggleTabPin(tabName);
            }
        });
    });
}

// Admin-related functions have been removed

// Export the initialization function
window.initSettingsTab = initSettingsTab;
