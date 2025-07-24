// Global variables for live tail mode and notifications
let liveTailInterval = null;
let liveTailEnabled = false;
let notificationsEnabled = false;
let lastEventTime = null;
let isInitialized = false;

async function initEventViewerTab() {
    // Prevent double initialization
    if (isInitialized) {
        console.log('Event Viewer tab already initialized, skipping...');
        return;
    }
    
    console.log('Initializing Event Viewer tab...');
    isInitialized = true;

    setupEventViewerEventListeners();

    // Load saved settings
    await loadEventViewerSettings();

    refreshEvents();

    if (window.markTabAsReady) {
        window.markTabAsReady(tabId);
    }
}

function setupEventViewerEventListeners() {
    const refreshBtn = document.querySelector('.event-viewer-controls .btn-primary');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshEvents);
    }

    const logNameSelect = document.getElementById('log-name-select');
    if (logNameSelect) {
        logNameSelect.addEventListener('change', refreshEvents);
    }

    const searchInput = document.getElementById('event-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterEvents);
    }

    const exportBtn = document.getElementById('export-events-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportEvents);
    }

    // Live tail toggle
    const liveTailToggle = document.getElementById('live-tail-toggle');
    if (liveTailToggle) {
        liveTailToggle.addEventListener('change', toggleLiveTail);
    }

    // Notifications toggle
    const notificationsToggle = document.getElementById('notifications-toggle');
    if (notificationsToggle) {
        notificationsToggle.addEventListener('change', toggleNotifications);
    }
}

async function refreshEvents(isLiveTailUpdate = false) {
    const logNameSelect = document.getElementById('log-name-select');
    const logName = logNameSelect.value;
    const loadingEl = document.getElementById('event-loading');
    const tableBody = document.getElementById('event-table-body');

    // Don't show loading spinner for live tail updates
    if (loadingEl && !isLiveTailUpdate) loadingEl.style.display = 'block';
    if (!isLiveTailUpdate) tableBody.innerHTML = '';

    try {
        const events = await window.electronAPI.getEventLogs(logName);
        populateEventTable(events, isLiveTailUpdate);

        // Check for critical events and show notifications
        if (notificationsEnabled && events && events.length > 0) {
            checkForCriticalEvents(events);
        }
    } catch (error) {
        console.error('Error loading event logs:', error);
        if (!isLiveTailUpdate) {
            tableBody.innerHTML = `<tr><td colspan="5">Error loading events: ${error.message}</td></tr>`;
        }
    } finally {
        if (loadingEl && !isLiveTailUpdate) loadingEl.style.display = 'none';
    }
}

function populateEventTable(events, isLiveTailUpdate = false) {
    const tableBody = document.getElementById('event-table-body');

    if (!isLiveTailUpdate) {
        tableBody.innerHTML = '';
    }

    if (!events || events.length === 0) {
        if (!isLiveTailUpdate) {
            tableBody.innerHTML = '<tr><td colspan="5">No events found.</td></tr>';
        }
        return;
    }

    // For live tail updates, only add new events
    let eventsToAdd = events;
    if (isLiveTailUpdate && lastEventTime) {
        eventsToAdd = events.filter(event => {
            const eventTime = new Date(event.TimeCreated);
            return eventTime > lastEventTime;
        });
    }

    // Update lastEventTime with the most recent event
    if (events.length > 0) {
        const mostRecentEvent = events.reduce((latest, current) => {
            return new Date(current.TimeCreated) > new Date(latest.TimeCreated) ? current : latest;
        });
        lastEventTime = new Date(mostRecentEvent.TimeCreated);
    }

    eventsToAdd.forEach(event => {
        const row = document.createElement('tr');
        const levelDisplayName = event.LevelDisplayName || 'Information';
        row.className = `level-${levelDisplayName.toLowerCase()}`;

        // Add animation class for new events in live tail mode
        if (isLiveTailUpdate) {
            row.classList.add('new-event');
        }

        row.innerHTML = `
            <td>${levelDisplayName}</td>
            <td>${new Date(event.TimeCreated).toLocaleString()}</td>
            <td>${event.ProviderName || 'N/A'}</td>
            <td>${event.Id || 'N/A'}</td>
            <td>${(event.Message || '').split('\n')[0]}</td>
        `;
        row.addEventListener('click', () => showEventDetails(event));

        if (isLiveTailUpdate) {
            // Insert new events at the top for live tail
            tableBody.insertBefore(row, tableBody.firstChild);
        } else {
            tableBody.appendChild(row);
        }
    });

    // Remove animation class after animation completes
    if (isLiveTailUpdate) {
        setTimeout(() => {
            document.querySelectorAll('.new-event').forEach(row => {
                row.classList.remove('new-event');
            });
        }, 1000);
    }
}

function showEventDetails(event) {
    const detailPane = document.getElementById('event-detail-pane');
    const detailContent = document.getElementById('event-detail-content');

    if (detailPane && detailContent) {
        detailContent.textContent = `Time: ${new Date(event.TimeCreated).toLocaleString()}\n` +
                                  `Level: ${event.LevelDisplayName || 'Information'}\n` +
                                  `Source: ${event.ProviderName || 'N/A'}\n` +
                                  `Event ID: ${event.Id || 'N/A'}\n\n` +
                                  `Message:\n${event.Message || ''}`;
        detailPane.style.display = 'block';
    }
}

function filterEvents() {
    const searchInput = document.getElementById('event-search');
    const filter = searchInput.value.toUpperCase();
    const table = document.querySelector('.event-table');
    const tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        let visible = false;
        const tds = tr[i].getElementsByTagName('td');
        for (let j = 0; j < tds.length; j++) {
            const td = tds[j];
            if (td) {
                if (td.innerHTML.toUpperCase().indexOf(filter) > -1) {
                    visible = true;
                    break;
                }
            }
        }
        tr[i].style.display = visible ? '' : 'none';
    }
}

async function exportEvents() {
    const table = document.querySelector('.event-table');
    const rows = table.querySelectorAll('tr');
    let csvContent = 'data:text/csv;charset=utf-8,';

    // Add headers
    const headers = Array.from(rows[0].querySelectorAll('th')).map(header => header.innerText);
    csvContent += headers.join(',') + '\r\n';

    // Add rows
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.style.display === 'none') continue; // Skip hidden rows
        const cols = Array.from(row.querySelectorAll('td')).map(td => `"${td.innerText.replace(/"/g, '""')}"`);
        csvContent += cols.join(',') + '\r\n';
    }

    try {
        const logName = document.getElementById('log-name-select').value;
        const defaultPath = `event-log-${logName}-${new Date().toISOString().slice(0, 10)}.csv`;
        const result = await window.electronAPI.saveFile(csvContent, {
            title: 'Save Event Log',
            defaultPath: defaultPath,
            filters: [
                { name: 'CSV Files', extensions: ['csv'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (result.success) {
            console.log('File saved successfully:', result.filePath);
        } else {
            console.log('File save was canceled.');
        }
    } catch (error) {
        console.error('Failed to save file:', error);
    }
}

// Settings management functions
async function loadEventViewerSettings() {
    try {
        if (window.electronAPI) {
            // Load live tail setting
            liveTailEnabled = await window.electronAPI.getSetting('eventViewer.liveTailEnabled', false);
            const liveTailToggle = document.getElementById('live-tail-toggle');
            if (liveTailToggle) {
                // Temporarily remove event listener to prevent triggering during initialization
                liveTailToggle.removeEventListener('change', toggleLiveTail);
                liveTailToggle.checked = liveTailEnabled;
                // Re-add event listener
                liveTailToggle.addEventListener('change', toggleLiveTail);
                
                if (liveTailEnabled) {
                    startLiveTail();
                }
            }

            // Load notifications setting
            notificationsEnabled = await window.electronAPI.getSetting('eventViewer.notificationsEnabled', false);
            const notificationsToggle = document.getElementById('notifications-toggle');
            if (notificationsToggle) {
                // Temporarily remove event listener to prevent triggering during initialization
                notificationsToggle.removeEventListener('change', toggleNotifications);
                notificationsToggle.checked = notificationsEnabled;
                // Re-add event listener
                notificationsToggle.addEventListener('change', toggleNotifications);
            }

            console.log('Event Viewer settings loaded:', { liveTailEnabled, notificationsEnabled });
        }
    } catch (error) {
        console.error('Error loading Event Viewer settings:', error);
    }
}

async function saveEventViewerSettings() {
    try {
        if (window.electronAPI) {
            await window.electronAPI.setSetting('eventViewer.liveTailEnabled', liveTailEnabled);
            await window.electronAPI.setSetting('eventViewer.notificationsEnabled', notificationsEnabled);
            console.log('Event Viewer settings saved:', { liveTailEnabled, notificationsEnabled });
        }
    } catch (error) {
        console.error('Error saving Event Viewer settings:', error);
    }
}

// Live tail mode functions
async function toggleLiveTail() {
    const toggle = document.getElementById('live-tail-toggle');
    liveTailEnabled = toggle.checked;

    // Save setting
    await saveEventViewerSettings();

    if (liveTailEnabled) {
        startLiveTail();
        showEventViewerNotification('Live tail mode enabled', 'info');
    } else {
        stopLiveTail();
        showEventViewerNotification('Live tail mode disabled', 'info');
    }
}

function startLiveTail() {
    if (liveTailInterval) {
        clearInterval(liveTailInterval);
    }

    // Refresh every 10 seconds instead of 5 to reduce CPU usage
    liveTailInterval = setInterval(() => {
        refreshEvents(true);
    }, 10000);

    // Update UI to show live tail is active
    const liveTailIndicator = document.getElementById('live-tail-indicator');
    if (liveTailIndicator) {
        liveTailIndicator.style.display = 'inline-block';
    }
}

function stopLiveTail() {
    if (liveTailInterval) {
        clearInterval(liveTailInterval);
        liveTailInterval = null;
    }

    // Hide live tail indicator
    const liveTailIndicator = document.getElementById('live-tail-indicator');
    if (liveTailIndicator) {
        liveTailIndicator.style.display = 'none';
    }
}

// Notifications functions
async function toggleNotifications() {
    const toggle = document.getElementById('notifications-toggle');
    notificationsEnabled = toggle.checked;

    // Save setting
    await saveEventViewerSettings();

    if (notificationsEnabled) {
        showEventViewerNotification('Critical event notifications enabled', 'success');
    } else {
        showEventViewerNotification('Critical event notifications disabled', 'info');
    }
}

function checkForCriticalEvents(events) {
    if (!events || events.length === 0) return;

    const criticalEvents = events.filter(event => {
        const level = (event.LevelDisplayName || '').toLowerCase();
        return level === 'error' || level === 'critical';
    });

    criticalEvents.forEach(event => {
        const eventTime = new Date(event.TimeCreated);

        // Only show notifications for events that are newer than our last check
        if (!lastEventTime || eventTime > lastEventTime) {
            showDesktopNotification(event);
        }
    });
}

function showDesktopNotification(event) {
    const level = event.LevelDisplayName || 'Error';
    const source = event.ProviderName || 'Unknown';
    const message = (event.Message || '').split('\n')[0];
    const truncatedMessage = message.length > 100 ? message.substring(0, 100) + '...' : message;

    const title = `${level} Event - ${source}`;
    const body = `Event ID: ${event.Id || 'N/A'}\n${truncatedMessage}`;

    // Use the existing notification system
    if (window.electronAPI && window.electronAPI.showNotification) {
        window.electronAPI.showNotification({
            title: title,
            body: body,
            type: level.toLowerCase() === 'critical' ? 'error' : 'warning'
        });
    }
}

// Utility function for in-app notifications
function showEventViewerNotification(message, type = 'info') {
    // Use the global notification system if available
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Cleanup function
async function cleanupEventViewer() {
    stopLiveTail();
    // Save settings one final time before cleanup
    await saveEventViewerSettings();
}

// Clean up when tab is hidden or page unloads
window.addEventListener('beforeunload', cleanupEventViewer);
document.addEventListener('visibilitychange', () => {
    if (document.hidden && liveTailEnabled) {
        stopLiveTail();
    } else if (!document.hidden && liveTailEnabled) {
        startLiveTail();
    }
});

// Listen for tab changes to pause/resume live tail appropriately
if (window.tabEventManager) {
    window.tabEventManager.addEventListener('tabChanged', (event) => {
        const { tabId } = event.detail;
        if (tabId === 'event-viewer' && liveTailEnabled) {
            // Tab became active, start live tail
            startLiveTail();
        } else if (tabId !== 'event-viewer' && liveTailEnabled) {
            // Tab became inactive, stop live tail to save resources
            stopLiveTail();
        }
    });
}

window.refreshEvents = refreshEvents;

// Initialize lazy loading helper
const lazyHelper = new LazyLoadingHelper('event-viewer');

// Wrap initEventViewerTab with lazy loading support
function initEventViewerTabWithLazyLoading() {
    // Check if should initialize (lazy loading support)
    if (!lazyHelper.shouldInitialize()) {
        console.log('Event Viewer script already executed, skipping initialization');
        lazyHelper.markTabReady();
        return;
    }

    // Mark script as executed
    lazyHelper.markScriptExecuted();

    // Call original initialization
    initEventViewerTab();

    // Mark tab as ready
    lazyHelper.markTabReady();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEventViewerTabWithLazyLoading);
} else {
    initEventViewerTabWithLazyLoading();
}

// Create global reset function for refresh functionality
lazyHelper.createGlobalResetFunction();