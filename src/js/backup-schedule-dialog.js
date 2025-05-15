/**
 * Backup Schedule Dialog
 * Provides UI for configuring automatic backup schedules
 */

// Create and show the backup schedule dialog
function showBackupScheduleDialog() {
    console.log('Showing backup schedule dialog');
    const dialog = document.getElementById('backup-schedule-dialog') || createBackupScheduleDialog();
    showDialog(dialog);

    // Get current schedule
    getCurrentSchedule().then(schedule => {
        populateScheduleForm(schedule);
        updateNextBackupTime();
    }).catch(error => {
        console.error('Error getting current schedule:', error);
        populateScheduleForm(getDefaultSchedule());
        updateNextBackupTime();
    });
}

// Create the backup schedule dialog
function createBackupScheduleDialog() {
    console.log('Creating backup schedule dialog');

    // Create dialog HTML
    const dialogHTML = `
    <div id="backup-schedule-dialog" class="dialog-container" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.7); z-index: 9999; align-items: center; justify-content: center; overflow: auto; padding: 20px;">
        <div class="dialog" style="background-color: #1e1e24; border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); width: 550px; max-width: 90%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #2e2e36; animation: slideIn 0.3s ease-out;">
            <div class="dialog-header" style="display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; background-color: #27272f; border-bottom: 1px solid #2e2e36;">
                <h2 style="font-size: 1.2rem; font-weight: 600; color: #f0f0f0; margin: 0; display: flex; align-items: center;"><i class="fas fa-calendar-alt" style="margin-right: 10px; color: var(--primary, #ff9800);"></i> Configure Backup Schedule</h2>
                <button class="dialog-close-btn" style="background: none; border: none; color: #a0a0a0; font-size: 1.2rem; cursor: pointer; padding: 5px;"><i class="fas fa-times"></i></button>
            </div>
            <div class="dialog-content" style="padding: 20px; overflow-y: auto; max-height: calc(90vh - 130px);">
                <div class="dialog-section">
                    <h3 style="font-size: 1.1rem; color: #e0e0e0; margin-top: 0; margin-bottom: 15px;">Schedule Settings</h3>

                    <div class="form-group" style="margin-bottom: 15px;">
                        <label for="backup-frequency" style="display: block; font-weight: 500; color: #e0e0e0; margin-bottom: 5px;">Backup Frequency</label>
                        <select id="backup-frequency" class="form-control" style="width: 100%; padding: 8px 12px; background-color: #27272f; border: 1px solid #3e3e46; border-radius: 4px; color: #e0e0e0;">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>

                    <div class="form-group" id="day-of-week-group" style="margin-bottom: 15px;">
                        <label for="backup-day-of-week" style="display: block; font-weight: 500; color: #e0e0e0; margin-bottom: 5px;">Day of Week</label>
                        <select id="backup-day-of-week" class="form-control" style="width: 100%; padding: 8px 12px; background-color: #27272f; border: 1px solid #3e3e46; border-radius: 4px; color: #e0e0e0;">
                            <option value="0">Sunday</option>
                            <option value="1">Monday</option>
                            <option value="2">Tuesday</option>
                            <option value="3">Wednesday</option>
                            <option value="4">Thursday</option>
                            <option value="5">Friday</option>
                            <option value="6">Saturday</option>
                        </select>
                    </div>

                    <div class="form-group" id="day-of-month-group" style="margin-bottom: 15px; display: none;">
                        <label for="backup-day-of-month" style="display: block; font-weight: 500; color: #e0e0e0; margin-bottom: 5px;">Day of Month</label>
                        <select id="backup-day-of-month" class="form-control" style="width: 100%; padding: 8px 12px; background-color: #27272f; border: 1px solid #3e3e46; border-radius: 4px; color: #e0e0e0;">
                            <!-- Will be populated with days 1-31 -->
                        </select>
                        <span class="form-hint" style="display: block; font-size: 0.85rem; color: #a0a0a0; margin-top: 5px;">If the selected day doesn't exist in a month (e.g., February 30), the backup will run on the last day of the month.</span>
                    </div>

                    <div class="form-group" style="margin-bottom: 15px;">
                        <label for="backup-time" style="display: block; font-weight: 500; color: #e0e0e0; margin-bottom: 5px;">Time</label>
                        <div class="time-picker" style="display: flex; align-items: center; gap: 5px;">
                            <select id="backup-hour" class="form-control" style="width: auto; padding: 8px 12px; background-color: #27272f; border: 1px solid #3e3e46; border-radius: 4px; color: #e0e0e0;">
                                <!-- Will be populated with hours 0-23 -->
                            </select>
                            <span style="font-size: 1.2rem; color: #e0e0e0;">:</span>
                            <select id="backup-minute" class="form-control" style="width: auto; padding: 8px 12px; background-color: #27272f; border: 1px solid #3e3e46; border-radius: 4px; color: #e0e0e0;">
                                <!-- Will be populated with minutes 0-59 in 5-minute increments -->
                            </select>
                        </div>
                        <span class="form-hint" style="display: block; font-size: 0.85rem; color: #a0a0a0; margin-top: 5px;">Backups are scheduled in 24-hour format. Choose a time when your computer is likely to be on but not in heavy use.</span>
                    </div>

                    <div class="form-group" style="margin-bottom: 15px;">
                        <label for="backup-keep-count" style="display: block; font-weight: 500; color: #e0e0e0; margin-bottom: 5px;">Keep Last</label>
                        <div class="input-with-label" style="display: flex; align-items: center; gap: 10px;">
                            <input type="number" id="backup-keep-count" class="form-control" min="1" max="50" value="5" style="width: 80px; padding: 8px 12px; background-color: #27272f; border: 1px solid #3e3e46; border-radius: 4px; color: #e0e0e0;">
                            <span style="color: #e0e0e0;">backups</span>
                        </div>
                        <span class="form-hint" style="display: block; font-size: 0.85rem; color: #a0a0a0; margin-top: 5px;">Older automatic backups will be deleted to save disk space.</span>
                    </div>

                    <div class="info-box" style="background-color: #27272f; border-radius: 4px; padding: 10px 15px; border: 1px solid #3e3e46; margin-top: 20px;">
                        <div class="info-row" style="display: flex; margin-bottom: 5px;">
                            <span class="info-label" style="font-weight: 500; color: #a0a0a0; width: 100px;">Next Backup:</span>
                            <span class="info-value" id="schedule-next-backup" style="color: #e0e0e0; flex: 1;">-</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="dialog-footer" style="display: flex; justify-content: flex-end; padding: 15px 20px; background-color: #27272f; border-top: 1px solid #2e2e36; gap: 10px;">
                <button class="btn btn-secondary dialog-cancel-btn" style="padding: 8px 16px; background-color: #23232a; color: #fff; border: 1px solid #3f3f46; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button class="btn btn-primary" id="save-backup-schedule-btn" style="padding: 8px 16px; background-color: var(--primary, #ff9800); color: #fff; border: none; border-radius: 4px; cursor: pointer;">Save Schedule</button>
            </div>
        </div>
    </div>
    `;

    // Create a temporary container
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = dialogHTML;

    // Append dialog to body
    while (tempContainer.firstChild) {
        document.body.appendChild(tempContainer.firstChild);
    }

    // Get dialog element
    const dialog = document.getElementById('backup-schedule-dialog');

    if (!dialog) {
        console.error('Failed to create backup schedule dialog');
        return null;
    }

    console.log('Backup schedule dialog created successfully');

    // Set up event listeners
    setupDialogEventListeners();

    // Populate select elements
    populateSelectElements();

    return dialog;
}

// Set up dialog event listeners
function setupDialogEventListeners() {
    try {
        // Close buttons
        document.querySelectorAll('#backup-schedule-dialog .dialog-close-btn, #backup-schedule-dialog .dialog-cancel-btn').forEach(button => {
            button.addEventListener('click', function() {
                console.log('Close/Cancel button clicked');
                hideDialog(document.getElementById('backup-schedule-dialog'));
            });
        });

        // Save button
        const saveBtn = document.getElementById('save-backup-schedule-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                console.log('Save button clicked');
                saveBackupSchedule();
            });
        }

        // Frequency change
        const frequencySelect = document.getElementById('backup-frequency');
        if (frequencySelect) {
            frequencySelect.addEventListener('change', function() {
                console.log('Frequency changed to:', this.value);
                updateScheduleUI();
            });
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

// Populate select elements
function populateSelectElements() {
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
}

// Get current schedule
async function getCurrentSchedule() {
    if (window.electronAPI && window.electronAPI.getBackupSchedule) {
        try {
            const result = await window.electronAPI.getBackupSchedule();
            if (result.success) {
                return result.schedule;
            } else {
                throw new Error(result.error || 'Failed to get backup schedule');
            }
        } catch (error) {
            console.error('Error getting backup schedule:', error);
            throw error;
        }
    } else {
        // Fallback to localStorage
        const scheduleJson = localStorage.getItem('backupSchedule');
        if (scheduleJson) {
            try {
                return JSON.parse(scheduleJson);
            } catch (error) {
                console.error('Error parsing backup schedule from localStorage:', error);
                throw error;
            }
        } else {
            return getDefaultSchedule();
        }
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
                    hideDialog(document.getElementById('backup-schedule-dialog'));

                    // Update auto backup toggle
                    if (autoBackupToggle) {
                        autoBackupToggle.checked = schedule.enabled;
                    }
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
        hideDialog(document.getElementById('backup-schedule-dialog'));

        // Update auto backup toggle
        if (autoBackupToggle) {
            autoBackupToggle.checked = schedule.enabled;
        }
    }
}

// Show dialog
function showDialog(dialog) {
    if (!dialog) return;
    dialog.style.display = 'flex';
}

// Hide dialog
function hideDialog(dialog) {
    if (!dialog) return;
    dialog.style.display = 'none';
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

// Export the function
window.showBackupScheduleDialog = showBackupScheduleDialog;
