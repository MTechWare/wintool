// Event Viewer - Modern Implementation
(function() {
    'use strict';

    // Private state - encapsulated to prevent conflicts
    const EventViewer = {
        initialized: false,
        liveTailInterval: null,
        liveTailEnabled: false,
        notificationsEnabled: false,
        allEvents: [],
        filteredEvents: [],
        selectedEvent: null,
        isRefreshing: false,
        isExporting: false
    };

    // Initialize function - only runs once
    EventViewer.init = async function() {
        if (this.initialized) {
            console.log('Event Viewer already initialized');
            return;
        }

        // Check if we're in the right context
        if (!document.getElementById('event-table-body')) {
            console.log('Event Viewer DOM not found, skipping initialization');
            return;
        }

        console.log('Initializing Event Viewer...');
        this.initialized = true;

        this.setupEventListeners();
        await this.loadSettings();
        this.updateLastRefreshTime();
        this.refreshEvents();

        if (window.markTabAsReady) {
            window.markTabAsReady('event-viewer');
        }
    };

    // Setup event listeners with proper binding
    EventViewer.setupEventListeners = function() {
        const self = this;

        // Remove any existing event listeners first
        if (this.clickHandler) {
            document.removeEventListener('click', this.clickHandler, { capture: true });
        }

        // Create a bound click handler
        this.clickHandler = function(e) {
            const target = e.target.closest('button, .action-btn');
            if (!target) return;

            // Only handle Event Viewer buttons
            const eventViewerContainer = target.closest('.modern-event-viewer, .tab-header');
            if (!eventViewerContainer) return;

            // Prevent default and stop propagation immediately
            e.preventDefault();
            e.stopPropagation();

            const id = target.id;

            switch(id) {
                case 'refresh-events-btn-header':
                    self.refreshEvents();
                    break;
                case 'export-events-btn':
                case 'export-events-btn-header':
                    self.exportEvents();
                    break;
                case 'clear-events-btn':
                    self.clearEvents();
                    break;
                case 'clear-search':
                    self.clearSearch();
                    break;
                case 'close-detail-panel':
                    self.closeDetailPanel();
                    break;
                case 'reset-filters-btn':
                    self.resetFilters();
                    break;
            }
        };

        // Add the event listener
        document.addEventListener('click', this.clickHandler, { capture: true });

        // Handle form controls separately
        const logNameSelect = document.getElementById('log-name-select');
        const levelFilterSelect = document.getElementById('level-filter-select');
        const searchInput = document.getElementById('event-search');

        if (logNameSelect && !logNameSelect.dataset.eventViewerBound) {
            logNameSelect.addEventListener('change', () => self.refreshEvents());
            logNameSelect.dataset.eventViewerBound = 'true';
        }

        if (levelFilterSelect && !levelFilterSelect.dataset.eventViewerBound) {
            levelFilterSelect.addEventListener('change', () => self.applyFilters());
            levelFilterSelect.dataset.eventViewerBound = 'true';
        }

        if (searchInput && !searchInput.dataset.eventViewerBound) {
            searchInput.addEventListener('input', (e) => self.handleSearchInput(e));
            searchInput.addEventListener('keydown', (e) => self.handleSearchKeydown(e));
            searchInput.dataset.eventViewerBound = 'true';
        }

        // Handle toggles
        const toggles = ['live-tail-toggle', 'notifications-toggle'];
        toggles.forEach(toggleId => {
            const toggle = document.getElementById(toggleId);
            if (toggle && !toggle.dataset.eventViewerBound) {
                toggle.addEventListener('change', (e) => {
                    switch(toggleId) {
                        case 'live-tail-toggle':
                            self.toggleLiveTail();
                            break;
                        case 'notifications-toggle':
                            self.toggleNotifications();
                            break;
                    }
                });
                toggle.dataset.eventViewerBound = 'true';
            }
        });
    };

    // Refresh events function
    EventViewer.refreshEvents = async function(isLiveTailUpdate = false) {
        if (this.isRefreshing && !isLiveTailUpdate) {
            console.log('Refresh already in progress');
            return;
        }

        this.isRefreshing = true;

        try {
            const logNameSelect = document.getElementById('log-name-select');
            const logName = logNameSelect ? logNameSelect.value : 'Application';
            const loadingEl = document.getElementById('event-loading');
            const tableBody = document.getElementById('event-table-body');
            const emptyState = document.getElementById('empty-state');

            if (!isLiveTailUpdate) {
                if (loadingEl) loadingEl.style.display = 'flex';
                if (emptyState) emptyState.style.display = 'none';
                if (tableBody) tableBody.innerHTML = '';
            }

            const events = await window.electronAPI.getEventLogs(logName);
            this.allEvents = events || [];

            if (!isLiveTailUpdate) {
                this.updateLastRefreshTime();
            }

            this.applyFilters();

            if (this.notificationsEnabled && events && events.length > 0) {
                this.checkForCriticalEvents(events);
            }

            this.updateEventCounts();

        } catch (error) {
            console.error('Error loading event logs:', error);
            this.showNotification('Error loading events: ' + error.message, 'error');
        } finally {
            const loadingEl = document.getElementById('event-loading');
            if (loadingEl && !isLiveTailUpdate) {
                loadingEl.style.display = 'none';
            }
            this.isRefreshing = false;
        }
    };

    // Apply filters function
    EventViewer.applyFilters = function() {
        const levelFilter = document.getElementById('level-filter-select');
        const searchInput = document.getElementById('event-search');

        const levelValue = levelFilter ? levelFilter.value : '';
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        this.filteredEvents = this.allEvents.filter(event => {
            if (levelValue && event.LevelDisplayName !== levelValue) {
                return false;
            }

            if (searchTerm) {
                const searchableText = [
                    event.LevelDisplayName || '',
                    event.ProviderName || '',
                    event.Message || '',
                    event.Id || ''
                ].join(' ').toLowerCase();

                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }

            return true;
        });

        this.populateEventTable();
        this.updateEventCounts();
    };

function applyFilters() {
    const levelFilter = document.getElementById('level-filter-select').value;
    const searchTerm = document.getElementById('event-search').value.toLowerCase();
    
    filteredEvents = allEvents.filter(event => {
        // Level filter
        if (levelFilter && event.LevelDisplayName !== levelFilter) {
            return false;
        }
        
        // Search filter
        if (searchTerm) {
            const searchableText = [
                event.LevelDisplayName || '',
                event.ProviderName || '',
                event.Message || '',
                event.Id || ''
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
    
    populateEventTable();
    updateEventCounts();
}

    // Populate event table
    EventViewer.populateEventTable = function() {
        const tableBody = document.getElementById('event-table-body');
        const emptyState = document.getElementById('empty-state');

        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (this.filteredEvents.length === 0) {
            this.showEmptyState();
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        this.filteredEvents.forEach((event, index) => {
            const row = this.createEventRow(event, index);
            tableBody.appendChild(row);
        });
    };

function createEventRow(event, index) {
    const row = document.createElement('tr');
    const levelDisplayName = event.LevelDisplayName || 'Information';
    row.className = `level-${levelDisplayName.toLowerCase()}`;
    row.dataset.eventIndex = index;
    
    // Format timestamp
    const timestamp = new Date(event.TimeCreated);
    const formattedTime = timestamp.toLocaleString();
    
    // Truncate message for table display
    const message = (event.Message || '').split('\n')[0];
    const truncatedMessage = message.length > 80 ? message.substring(0, 80) + '...' : message;
    
    row.innerHTML = `
        <td class="level-${levelDisplayName.toLowerCase()}">${levelDisplayName}</td>
        <td>${formattedTime}</td>
        <td>${event.ProviderName || 'N/A'}</td>
        <td>${event.Id || 'N/A'}</td>
        <td title="${message}">${truncatedMessage}</td>
    `;
    
    row.addEventListener('click', () => showEventDetails(event, row));
    
    return row;
}

function showEventDetails(event, row) {
    // Update selected row
    document.querySelectorAll('.modern-events-table tbody tr').forEach(tr => {
        tr.classList.remove('selected');
    });
    row.classList.add('selected');
    
    selectedEvent = event;
    
    // Populate detail panel
    const detailPanel = document.getElementById('event-detail-panel');
    const detailLevel = document.getElementById('detail-level');
    const detailId = document.getElementById('detail-id');
    const detailSource = document.getElementById('detail-source');
    const detailTime = document.getElementById('detail-time');
    const detailMessage = document.getElementById('detail-message-content');
    const detailRaw = document.getElementById('detail-raw-content');
    
    if (detailLevel) {
        detailLevel.textContent = event.LevelDisplayName || 'Information';
        detailLevel.className = `detail-value level-${(event.LevelDisplayName || 'information').toLowerCase()}`;
    }
    if (detailId) detailId.textContent = event.Id || 'N/A';
    if (detailSource) detailSource.textContent = event.ProviderName || 'N/A';
    if (detailTime) detailTime.textContent = new Date(event.TimeCreated).toLocaleString();
    if (detailMessage) detailMessage.textContent = event.Message || 'No message available';
    if (detailRaw) detailRaw.textContent = JSON.stringify(event, null, 2);
    
    // Show detail panel
    if (detailPanel) detailPanel.style.display = 'block';
}

function closeDetailPanel() {
    const detailPanel = document.getElementById('event-detail-panel');
    if (detailPanel) detailPanel.style.display = 'none';
    
    // Clear selected row
    document.querySelectorAll('.modern-events-table tbody tr').forEach(tr => {
        tr.classList.remove('selected');
    });
    
    selectedEvent = null;
}

function showEmptyState(message = null) {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        if (message) {
            const emptyContent = emptyState.querySelector('.empty-content p');
            if (emptyContent) {
                emptyContent.textContent = message;
            }
        }
        emptyState.style.display = 'flex';
    }
}

function updateEventCounts() {
    const totalCount = document.getElementById('total-events-count');
    const filteredCount = document.getElementById('filtered-events-count');
    
    if (totalCount) {
        totalCount.textContent = `${allEvents.length} events`;
    }
    
    if (filteredCount) {
        if (filteredEvents.length !== allEvents.length) {
            filteredCount.textContent = `${filteredEvents.length} filtered`;
            filteredCount.style.display = 'inline';
        } else {
            filteredCount.style.display = 'none';
        }
    }
}

function updateLastRefreshTime() {
    const lastRefreshEl = document.getElementById('last-refresh-time');
    if (lastRefreshEl) {
        lastRefreshEl.textContent = new Date().toLocaleTimeString();
    }
}

// Search functionality
function handleSearchInput(event) {
    const searchTerm = event.target.value;
    const clearBtn = document.getElementById('clear-search');
    
    if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'block' : 'none';
    }
    
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
        applyFilters();
    }, 300);
}

function handleSearchKeydown(event) {
    if (event.key === 'Escape') {
        clearSearch();
    }
}

function clearSearch() {
    const searchInput = document.getElementById('event-search');
    const clearBtn = document.getElementById('clear-search');
    
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    applyFilters();
}

// Toggle functions
async function toggleLiveTail() {
    const toggle = document.getElementById('live-tail-toggle');
    const liveStatus = document.getElementById('live-status');
    
    liveTailEnabled = toggle.checked;
    
    if (liveStatus) {
        liveStatus.style.display = liveTailEnabled ? 'flex' : 'none';
    }
    
    if (liveTailEnabled) {
        startLiveTail();
        showNotification('Live monitoring enabled', 'success');
    } else {
        stopLiveTail();
        showNotification('Live monitoring disabled', 'info');
    }
    
    await saveEventViewerSettings();
}

async function toggleNotifications() {
    const toggle = document.getElementById('notifications-toggle');
    notificationsEnabled = toggle.checked;
    
    showNotification(
        notificationsEnabled ? 'Notifications enabled' : 'Notifications disabled',
        'info'
    );
    
    await saveEventViewerSettings();
}

async function toggleAutoScroll() {
    const toggle = document.getElementById('auto-scroll-toggle');
    autoScrollEnabled = toggle.checked;
    
    showNotification(
        autoScrollEnabled ? 'Auto-scroll enabled' : 'Auto-scroll disabled',
        'info'
    );
}

// Live tail functionality
function startLiveTail() {
    if (liveTailInterval) {
        clearInterval(liveTailInterval);
    }

    liveTailInterval = setInterval(() => {
        refreshEvents(true);
    }, 5000); // Check every 5 seconds
}

function stopLiveTail() {
    if (liveTailInterval) {
        clearInterval(liveTailInterval);
        liveTailInterval = null;
    }
}

// Settings management
async function loadEventViewerSettings() {
    try {
        if (window.electronAPI) {
            liveTailEnabled = await window.electronAPI.getSetting('eventViewer.liveTailEnabled', false);
            notificationsEnabled = await window.electronAPI.getSetting('eventViewer.notificationsEnabled', false);
            autoScrollEnabled = await window.electronAPI.getSetting('eventViewer.autoScrollEnabled', true);

            // Apply settings to UI
            const liveTailToggle = document.getElementById('live-tail-toggle');
            const notificationsToggle = document.getElementById('notifications-toggle');
            const autoScrollToggle = document.getElementById('auto-scroll-toggle');

            if (liveTailToggle) liveTailToggle.checked = liveTailEnabled;
            if (notificationsToggle) notificationsToggle.checked = notificationsEnabled;
            if (autoScrollToggle) autoScrollToggle.checked = autoScrollEnabled;

            // Start live tail if enabled
            if (liveTailEnabled) {
                startLiveTail();
                const liveStatus = document.getElementById('live-status');
                if (liveStatus) liveStatus.style.display = 'flex';
            }
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
            await window.electronAPI.setSetting('eventViewer.autoScrollEnabled', autoScrollEnabled);
        }
    } catch (error) {
        console.error('Error saving Event Viewer settings:', error);
    }
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function checkForCriticalEvents(events) {
    const criticalEvents = events.filter(event =>
        event.LevelDisplayName === 'Critical' || event.LevelDisplayName === 'Error'
    );

    if (criticalEvents.length > 0 && notificationsEnabled) {
        criticalEvents.slice(0, 3).forEach(event => {
            showDesktopNotification(event);
        });
    }
}

function showDesktopNotification(event) {
    const level = event.LevelDisplayName || 'Error';
    const source = event.ProviderName || 'Unknown';
    const message = (event.Message || '').split('\n')[0];
    const truncatedMessage = message.length > 100 ? message.substring(0, 100) + '...' : message;

    const title = `${level} Event - ${source}`;
    const body = `Event ID: ${event.Id || 'N/A'}\n${truncatedMessage}`;

    if (window.electronAPI && window.electronAPI.showNotification) {
        window.electronAPI.showNotification({
            title: title,
            body: body,
            type: level.toLowerCase() === 'critical' ? 'error' : 'warning',
        });
    }
}

// Action functions
let isExporting = false;

async function exportEvents() {
    // Prevent multiple simultaneous exports
    if (isExporting) {
        console.log('Export already in progress, skipping...');
        return;
    }

    isExporting = true;

    try {
        const eventsToExport = filteredEvents.length > 0 ? filteredEvents : allEvents;

        if (eventsToExport.length === 0) {
            showNotification('No events to export', 'warning');
            return;
        }

        const csvContent = convertEventsToCSV(eventsToExport);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `event-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification(`Exported ${eventsToExport.length} events`, 'success');
    } catch (error) {
        console.error('Error exporting events:', error);
        showNotification('Failed to export events', 'error');
    } finally {
        isExporting = false;
    }
}

function convertEventsToCSV(events) {
    const headers = ['Level', 'Timestamp', 'Source', 'Event ID', 'Message'];
    const csvRows = [headers.join(',')];

    events.forEach(event => {
        const row = [
            event.LevelDisplayName || '',
            new Date(event.TimeCreated).toISOString(),
            event.ProviderName || '',
            event.Id || '',
            (event.Message || '').replace(/"/g, '""').replace(/\n/g, ' ')
        ];
        csvRows.push(row.map(field => `"${field}"`).join(','));
    });

    return csvRows.join('\n');
}

function clearEvents() {
    if (confirm('Are you sure you want to clear all events from the display?')) {
        allEvents = [];
        filteredEvents = [];
        populateEventTable();
        updateEventCounts();
        closeDetailPanel();
        showNotification('Events cleared', 'info');
    }
}

function resetFilters() {
    const levelFilter = document.getElementById('level-filter-select');
    const searchInput = document.getElementById('event-search');
    const clearBtn = document.getElementById('clear-search');

    if (levelFilter) levelFilter.value = '';
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';

    applyFilters();
    showNotification('Filters reset', 'info');
}



    // Essential utility functions
    EventViewer.createEventRow = function(event, index) {
        const row = document.createElement('tr');
        const levelDisplayName = event.LevelDisplayName || 'Information';
        row.className = `level-${levelDisplayName.toLowerCase()}`;
        row.dataset.eventIndex = index;

        const timestamp = new Date(event.TimeCreated);
        const formattedTime = timestamp.toLocaleString();
        const message = (event.Message || '').split('\n')[0];
        const truncatedMessage = message.length > 80 ? message.substring(0, 80) + '...' : message;

        row.innerHTML = `
            <td class="level-${levelDisplayName.toLowerCase()}">${levelDisplayName}</td>
            <td>${formattedTime}</td>
            <td>${event.ProviderName || 'N/A'}</td>
            <td>${event.Id || 'N/A'}</td>
            <td title="${message}">${truncatedMessage}</td>
        `;

        row.addEventListener('click', () => this.showEventDetails(event, row));
        return row;
    };

    EventViewer.showEventDetails = function(event, row) {
        document.querySelectorAll('.modern-events-table tbody tr').forEach(tr => {
            tr.classList.remove('selected');
        });
        row.classList.add('selected');

        const detailPanel = document.getElementById('event-detail-panel');
        if (detailPanel) detailPanel.style.display = 'block';
    };

    EventViewer.closeDetailPanel = function() {
        const detailPanel = document.getElementById('event-detail-panel');
        if (detailPanel) detailPanel.style.display = 'none';

        document.querySelectorAll('.modern-events-table tbody tr').forEach(tr => {
            tr.classList.remove('selected');
        });
    };

    EventViewer.showEmptyState = function() {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.style.display = 'flex';
    };

    EventViewer.updateEventCounts = function() {
        const totalCount = document.getElementById('total-events-count');
        const filteredCount = document.getElementById('filtered-events-count');

        if (totalCount) totalCount.textContent = `${this.allEvents.length} events`;
        if (filteredCount) {
            if (this.filteredEvents.length !== this.allEvents.length) {
                filteredCount.textContent = `${this.filteredEvents.length} filtered`;
                filteredCount.style.display = 'inline';
            } else {
                filteredCount.style.display = 'none';
            }
        }
    };

    EventViewer.updateLastRefreshTime = function() {
        const lastRefreshEl = document.getElementById('last-refresh-time');
        if (lastRefreshEl) lastRefreshEl.textContent = new Date().toLocaleTimeString();
    };

    EventViewer.handleSearchInput = function(event) {
        const searchTerm = event.target.value;
        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) clearBtn.style.display = searchTerm ? 'block' : 'none';

        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.applyFilters(), 300);
    };

    EventViewer.handleSearchKeydown = function(event) {
        if (event.key === 'Escape') this.clearSearch();
    };

    EventViewer.clearSearch = function() {
        const searchInput = document.getElementById('event-search');
        const clearBtn = document.getElementById('clear-search');

        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        if (clearBtn) clearBtn.style.display = 'none';
        this.applyFilters();
    };

    EventViewer.exportEvents = function() {
        if (this.isExporting) return;
        this.isExporting = true;

        try {
            const eventsToExport = this.filteredEvents.length > 0 ? this.filteredEvents : this.allEvents;
            if (eventsToExport.length === 0) {
                this.showNotification('No events to export', 'warning');
                return;
            }

            const csvContent = this.convertEventsToCSV(eventsToExport);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `event-logs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification(`Exported ${eventsToExport.length} events`, 'success');
        } catch (error) {
            this.showNotification('Failed to export events', 'error');
        } finally {
            this.isExporting = false;
        }
    };

    EventViewer.convertEventsToCSV = function(events) {
        const headers = ['Level', 'Timestamp', 'Source', 'Event ID', 'Message'];
        const csvRows = [headers.join(',')];

        events.forEach(event => {
            const row = [
                event.LevelDisplayName || '',
                new Date(event.TimeCreated).toISOString(),
                event.ProviderName || '',
                event.Id || '',
                (event.Message || '').replace(/"/g, '""').replace(/\n/g, ' ')
            ];
            csvRows.push(row.map(field => `"${field}"`).join(','));
        });

        return csvRows.join('\n');
    };

    EventViewer.clearEvents = function() {
        if (confirm('Are you sure you want to clear all events from the display?')) {
            this.allEvents = [];
            this.filteredEvents = [];
            this.populateEventTable();
            this.updateEventCounts();
            this.closeDetailPanel();
            this.showNotification('Events cleared', 'info');
        }
    };

    EventViewer.resetFilters = function() {
        const levelFilter = document.getElementById('level-filter-select');
        const searchInput = document.getElementById('event-search');
        const clearBtn = document.getElementById('clear-search');

        if (levelFilter) levelFilter.value = '';
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';

        this.applyFilters();
        this.showNotification('Filters reset', 'info');
    };

    EventViewer.toggleLiveTail = function() {
        const toggle = document.getElementById('live-tail-toggle');
        this.liveTailEnabled = toggle ? toggle.checked : false;

        const liveStatus = document.getElementById('live-status');
        if (liveStatus) liveStatus.style.display = this.liveTailEnabled ? 'flex' : 'none';

        if (this.liveTailEnabled) {
            this.startLiveTail();
            this.showNotification('Live monitoring enabled', 'success');
        } else {
            this.stopLiveTail();
            this.showNotification('Live monitoring disabled', 'info');
        }
    };

    EventViewer.toggleNotifications = function() {
        const toggle = document.getElementById('notifications-toggle');
        this.notificationsEnabled = toggle ? toggle.checked : false;
        this.showNotification(
            this.notificationsEnabled ? 'Notifications enabled' : 'Notifications disabled',
            'info'
        );
    };



    EventViewer.startLiveTail = function() {
        if (this.liveTailInterval) clearInterval(this.liveTailInterval);
        this.liveTailInterval = setInterval(() => this.refreshEvents(true), 5000);
    };

    EventViewer.stopLiveTail = function() {
        if (this.liveTailInterval) {
            clearInterval(this.liveTailInterval);
            this.liveTailInterval = null;
        }
    };

    EventViewer.loadSettings = async function() {
        try {
            if (window.electronAPI) {
                this.liveTailEnabled = await window.electronAPI.getSetting('eventViewer.liveTailEnabled', false);
                this.notificationsEnabled = await window.electronAPI.getSetting('eventViewer.notificationsEnabled', false);

                const liveTailToggle = document.getElementById('live-tail-toggle');
                const notificationsToggle = document.getElementById('notifications-toggle');

                if (liveTailToggle) liveTailToggle.checked = this.liveTailEnabled;
                if (notificationsToggle) notificationsToggle.checked = this.notificationsEnabled;

                if (this.liveTailEnabled) {
                    this.startLiveTail();
                    const liveStatus = document.getElementById('live-status');
                    if (liveStatus) liveStatus.style.display = 'flex';
                }
            }
        } catch (error) {
            console.error('Error loading Event Viewer settings:', error);
        }
    };

    EventViewer.showNotification = function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    };

    EventViewer.checkForCriticalEvents = function(events) {
        const criticalEvents = events.filter(event =>
            event.LevelDisplayName === 'Critical' || event.LevelDisplayName === 'Error'
        );

        if (criticalEvents.length > 0 && this.notificationsEnabled) {
            criticalEvents.slice(0, 3).forEach(event => {
                this.showDesktopNotification(event);
            });
        }
    };

    EventViewer.showDesktopNotification = function(event) {
        const level = event.LevelDisplayName || 'Error';
        const source = event.ProviderName || 'Unknown';
        const message = (event.Message || '').split('\n')[0];
        const truncatedMessage = message.length > 100 ? message.substring(0, 100) + '...' : message;

        if (window.electronAPI && window.electronAPI.showNotification) {
            window.electronAPI.showNotification({
                title: `${level} Event - ${source}`,
                body: `Event ID: ${event.Id || 'N/A'}\n${truncatedMessage}`,
                type: level.toLowerCase() === 'critical' ? 'error' : 'warning',
            });
        }
    };

    // Global functions for compatibility
    window.initEventViewerTab = function() {
        EventViewer.init();
    };

    window.refreshEvents = function() {
        EventViewer.refreshEvents();
    };

    window.exportEvents = function() {
        EventViewer.exportEvents();
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => EventViewer.init());
    } else {
        EventViewer.init();
    }

})(); // End of IIFE
