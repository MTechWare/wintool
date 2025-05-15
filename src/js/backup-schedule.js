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

    // Load dialog HTML
    loadScheduleDialog();

    // Get DOM elements
    configureBackupScheduleBtn = document.getElementById('configure-backup-schedule-btn');
    backupScheduleInfo = document.getElementById('backup-schedule-info');
    backupFrequencyInfo = document.getElementById('backup-frequency-info');
    nextBackupInfo = document.getElementById('next-backup-info');
    lastBackupInfo = document.getElementById('last-backup-info');

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

// Load backup schedule dialog
async function loadScheduleDialog() {
    try {
        if (document.getElementById('backup-schedule-dialog')) {
            return;
        }

        // Fetch dialog HTML - try multiple possible paths
        let response;
        const possiblePaths = [
            '../html/dialogs/backup-schedule-dialog.html',
            'html/dialogs/backup-schedule-dialog.html',
            './html/dialogs/backup-schedule-dialog.html',
            '/html/dialogs/backup-schedule-dialog.html',
            'src/html/dialogs/backup-schedule-dialog.html'
        ];

        let lastError = '';
        for (const dialogPath of possiblePaths) {
            try {
                console.log(`Trying to load schedule dialog from: ${dialogPath}`);
                response = await fetch(dialogPath);
                if (response.ok) {
                    console.log(`Successfully loaded schedule dialog from: ${dialogPath}`);
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
            console.warn('All paths failed to load schedule dialog HTML. Creating dialog directly.');
            return createScheduleDialogDirectly();
        }

        let html;
        try {
            html = await response.text();
        } catch (error) {
            console.error('Error reading response text:', error);
            return createScheduleDialogDirectly();
        }

        // Create a temporary container
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = html;

        // Append dialog to body
        while (tempContainer.firstChild) {
            document.body.appendChild(tempContainer.firstChild);
        }

        // Get dialog element
        backupScheduleDialog = document.getElementById('backup-schedule-dialog');

        // Set up dialog event listeners
        setupDialogEventListeners();
    } catch (error) {
        console.error('Error loading backup schedule dialog:', error);
        showNotification('Failed to load backup schedule dialog', { type: 'error' });
    }
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
        if (dayOfMonthSelect) {
            for (let i = 1; i <= 31; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                dayOfMonthSelect.appendChild(option);
            }
        }

        // Populate hour select
        const hourSelect = document.getElementById('backup-hour');
        if (hourSelect) {
            for (let i = 0; i < 24; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i.toString().padStart(2, '0');
                hourSelect.appendChild(option);
            }
        }

        // Populate minute select
        const minuteSelect = document.getElementById('backup-minute');
        if (minuteSelect) {
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
    if (!backupScheduleDialog) {
        console.error('Backup schedule dialog not found');
        return;
    }

    // Get current schedule
    if (window.electronAPI && window.electronAPI.getBackupSchedule) {
        window.electronAPI.getBackupSchedule()
            .then(schedule => {
                populateScheduleForm(schedule);
                showDialog(backupScheduleDialog);
            })
            .catch(error => {
                console.error('Error getting backup schedule:', error);
                showNotification('Failed to get backup schedule', { type: 'error' });
            });
    } else {
        // Fallback to default schedule
        populateScheduleForm({
            enabled: false,
            frequency: 'weekly',
            dayOfWeek: 0,
            dayOfMonth: 1,
            hour: 3,
            minute: 0,
            keepCount: 5
        });
        showDialog(backupScheduleDialog);
    }
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
                    showNotification(`Failed to save backup schedule: ${result.error}`, { type: 'error' });
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
            .then(schedule => {
                updateScheduleInfoDisplay(schedule);
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
        frequencyText = `Weekly (${day})`;
    } else if (schedule.frequency === 'monthly') {
        frequencyText = `Monthly (Day ${schedule.dayOfMonth})`;
    }

    // Add time
    const hour = schedule.hour.toString().padStart(2, '0');
    const minute = schedule.minute.toString().padStart(2, '0');
    frequencyText += ` at ${hour}:${minute}`;

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

// Function to create schedule dialog HTML directly
function createScheduleDialogDirectly() {
    console.log('Creating backup schedule dialog HTML directly');

    // Create backup schedule dialog HTML
    const scheduleDialogHTML = `
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
    `;

    // Add CSS styles
    const dialogStyles = `
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
    `;

    return scheduleDialogHTML + dialogStyles;
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
window.initBackupSchedule = initBackupSchedule;
