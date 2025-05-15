/**
 * WinTool - Log Viewer
 * Displays and filters application logs
 */

// DOM Elements
const logOutput = document.getElementById('log-output');
const logLevelSelect = document.getElementById('log-level');
const logCategorySelect = document.getElementById('log-category');
const logSearchInput = document.getElementById('log-search');
const refreshLogsButton = document.getElementById('refresh-logs');
const clearFiltersButton = document.getElementById('clear-filters');
const exportLogsButton = document.getElementById('export-logs');
const clearLogsButton = document.getElementById('clear-logs');

// Current filters
const filters = {
    level: parseInt(logLevelSelect.value),
    category: logCategorySelect.value,
    search: logSearchInput.value
};

// Initialize the log viewer
function initLogViewer() {
    // Set up event listeners
    logLevelSelect.addEventListener('change', updateFilters);
    logCategorySelect.addEventListener('change', updateFilters);
    logSearchInput.addEventListener('input', updateFilters);
    refreshLogsButton.addEventListener('click', refreshLogs);
    clearFiltersButton.addEventListener('click', clearFilters);
    exportLogsButton.addEventListener('click', exportLogs);
    clearLogsButton.addEventListener('click', clearLogDisplay);

    // Initial log load
    refreshLogs();
}

// Update filters and refresh logs
function updateFilters() {
    filters.level = parseInt(logLevelSelect.value);
    filters.category = logCategorySelect.value;
    filters.search = logSearchInput.value;
    refreshLogs();
}

// Clear all filters
function clearFilters() {
    logLevelSelect.value = '0'; // DEBUG
    logCategorySelect.value = '';
    logSearchInput.value = '';
    updateFilters();
}

// Refresh logs with current filters
function refreshLogs() {
    try {
        if (window.electronAPI && window.electronAPI.getFilteredLogs) {
            // Show loading indicator in the log output
            logOutput.innerHTML = '<div class="log-entry">Loading logs...</div>';

            window.electronAPI.getFilteredLogs(filters)
                .then(logs => {
                    displayLogs(logs);
                })
                .catch(error => {
                    console.error('Error fetching logs:', error);
                    showNotification(`Error fetching logs: ${error.message}`, {
                        type: 'error',
                        timeout: 5000
                    });
                    showError(`Error fetching logs: ${error.message}`);
                });
        } else {
            showNotification('Log API not available', {
                type: 'error',
                timeout: 5000
            });
            showError('Log API not available');
        }
    } catch (error) {
        console.error('Error in refreshLogs function:', error);
        showNotification(`Unexpected error: ${error.message}`, {
            type: 'error',
            timeout: 5000
        });
        showError(`Unexpected error: ${error.message}`);
    }
}

// Display logs in the log output element
function displayLogs(logs) {
    // Clear current logs
    logOutput.innerHTML = '';

    if (!logs || logs.length === 0) {
        logOutput.innerHTML = '<div class="log-entry">No logs found matching the current filters.</div>';
        return;
    }

    // Sort logs by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Create log entries
    logs.forEach(log => {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-level-${log.levelName}`;

        // Format timestamp to be more readable
        const timestamp = new Date(log.timestamp);
        const formattedTime = timestamp.toLocaleTimeString() + '.' +
                             timestamp.getMilliseconds().toString().padStart(3, '0');

        // Create timestamp element
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'log-timestamp';
        timestampSpan.textContent = formattedTime;

        // Create category element
        const categorySpan = document.createElement('span');
        categorySpan.className = `log-category log-category-${log.category}`;
        categorySpan.textContent = log.category;

        // Create message element
        const messageSpan = document.createElement('span');
        messageSpan.className = 'log-message';
        messageSpan.textContent = log.message;

        // Assemble log entry
        logEntry.appendChild(timestampSpan);
        logEntry.appendChild(categorySpan);
        logEntry.appendChild(messageSpan);

        logOutput.appendChild(logEntry);
    });

    // Scroll to bottom
    logOutput.scrollTop = logOutput.scrollHeight;
}

// Export logs to a file
function exportLogs() {
    try {
        if (window.electronAPI && window.electronAPI.exportLogs) {
            // Show notification that export is starting
            showNotification('Exporting logs...', { timeout: 2000 });

            window.electronAPI.exportLogs(filters)
                .then(filePath => {
                    if (filePath) {
                        showNotification(`Logs exported to: ${filePath}`, {
                            type: 'success',
                            timeout: 5000
                        });
                    } else {
                        showNotification('Export cancelled', {
                            type: 'warning',
                            timeout: 3000
                        });
                    }
                })
                .catch(error => {
                    console.error('Error exporting logs:', error);
                    showNotification(`Error exporting logs: ${error.message}`, {
                        type: 'error',
                        timeout: 5000
                    });
                    showError(`Error exporting logs: ${error.message}`);
                });
        } else {
            showNotification('Export API not available', {
                type: 'error',
                timeout: 5000
            });
            showError('Export API not available');
        }
    } catch (error) {
        console.error('Error in exportLogs function:', error);
        showNotification(`Unexpected error: ${error.message}`, {
            type: 'error',
            timeout: 5000
        });
        showError(`Unexpected error: ${error.message}`);
    }
}

// Clear the log display
function clearLogDisplay() {
    logOutput.innerHTML = '';
    showNotification('Log display cleared', { type: 'success' });
}

// Show an error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'log-entry log-level-ERROR';
    errorDiv.textContent = message;
    logOutput.appendChild(errorDiv);
}

// Show a notification
function showNotification(message, options = {}) {
    // Get notification container
    const container = document.getElementById('notification-container');
    if (!container) return;

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';

    // Add type class if specified
    if (options.type) {
        notification.classList.add(options.type);
    }

    // Create notification content
    const content = document.createElement('div');
    content.className = 'notification-content';
    content.textContent = message;
    notification.appendChild(content);

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    });
    notification.appendChild(closeButton);

    // Add notification to container
    container.appendChild(notification);

    // Show notification with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Auto-hide notification after timeout
    const timeout = options.timeout || 3000;
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    container.removeChild(notification);
                }
            }, 300);
        }
    }, timeout);
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initLogViewer);

// Log user actions for this page
function logAction(action, details = {}) {
    if (window.electronAPI && window.electronAPI.logUserAction) {
        window.electronAPI.logUserAction(action, details);
    }
}

// Log page load
logAction('log_viewer_opened');

// Add action logging to buttons
refreshLogsButton.addEventListener('click', () => logAction('refresh_logs', filters));
clearFiltersButton.addEventListener('click', () => logAction('clear_filters'));
exportLogsButton.addEventListener('click', () => logAction('export_logs', filters));
clearLogsButton.addEventListener('click', () => logAction('clear_log_display'));
