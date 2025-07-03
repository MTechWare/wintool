function initEventViewerTab() {
    console.log('Initializing Event Viewer tab...');
    
    setupEventViewerEventListeners();
    
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
}

async function refreshEvents() {
    const logNameSelect = document.getElementById('log-name-select');
    const logName = logNameSelect.value;
    const loadingEl = document.getElementById('event-loading');
    const tableBody = document.getElementById('event-table-body');

    if (loadingEl) loadingEl.style.display = 'block';
    tableBody.innerHTML = '';

    try {
        const events = await window.electronAPI.getEventLogs(logName);
        populateEventTable(events);
    } catch (error) {
        console.error('Error loading event logs:', error);
        tableBody.innerHTML = `<tr><td colspan="5">Error loading events: ${error.message}</td></tr>`;
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

function populateEventTable(events) {
    const tableBody = document.getElementById('event-table-body');
    tableBody.innerHTML = '';

    if (!events || events.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No events found.</td></tr>';
        return;
    }

    events.forEach(event => {
        const row = document.createElement('tr');
        const levelDisplayName = event.LevelDisplayName || 'Information';
        row.className = `level-${levelDisplayName.toLowerCase()}`;
        
        row.innerHTML = `
            <td>${levelDisplayName}</td>
            <td>${new Date(event.TimeCreated).toLocaleString()}</td>
            <td>${event.ProviderName || 'N/A'}</td>
            <td>${event.Id || 'N/A'}</td>
            <td>${(event.Message || '').split('\n')[0]}</td>
        `;
        row.addEventListener('click', () => showEventDetails(event));
        tableBody.appendChild(row);
    });
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

window.refreshEvents = refreshEvents;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEventViewerTab);
} else {
    initEventViewerTab();
}