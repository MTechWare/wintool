console.log('=== Processes tab JavaScript loaded! ===');

let refreshIntervalId = null;
let allProcesses = [];
let selectedPid = null;

if (tabContainer) {
    initializeProcessesTab(tabContainer);
} else {
    console.error('No container found for processes tab, cannot load data.');
}

function initializeProcessesTab(container) {
    // Check if this container is already initialized
    if (container.dataset.processesInitialized === 'true') {
        console.log('Processes tab container already initialized, skipping');
        return;
    }
    container.dataset.processesInitialized = 'true';

    const autoRefreshCheckbox = container.querySelector('#auto-refresh-checkbox');
    const refreshIntervalInput = container.querySelector('#refresh-interval-input');
    const terminateBtn = container.querySelector('#terminate-process-btn');
    const refreshBtn = container.querySelector('#refresh-processes-btn');
    const searchInput = container.querySelector('#process-search-input');

    loadProcesses(container);
    
    // Manual refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadProcesses(container);
        });
    }

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredProcesses = allProcesses.filter(p => p.name && p.name.toLowerCase().includes(searchTerm));
        renderProcessList(container, filteredProcesses);
        updateProcessCount(filteredProcesses.length);
    });

    autoRefreshCheckbox.addEventListener('change', () => {
        if (autoRefreshCheckbox.checked) {
            let interval = parseInt(refreshIntervalInput.value, 10) * 1000;
            // Minimum interval of 1 second for real-time monitoring
            if (interval < 1000) {
                interval = 1000;
                refreshIntervalInput.value = 1;
            }
            if (!isNaN(interval) && interval > 0) {
                refreshIntervalId = setInterval(() => {
                    loadProcesses(container);
                }, interval);
            }
        } else {
            if (refreshIntervalId) {
                clearInterval(refreshIntervalId);
                refreshIntervalId = null;
            }
        }
    });

    refreshIntervalInput.addEventListener('change', () => {
        if (autoRefreshCheckbox.checked) {
            if (refreshIntervalId) {
                clearInterval(refreshIntervalId);
                refreshIntervalId = null;
            }
            let interval = parseInt(refreshIntervalInput.value, 10) * 1000;
            // Minimum interval of 1 second for real-time monitoring
            if (interval < 1000) {
                interval = 1000;
                refreshIntervalInput.value = 1;
            }
            if (!isNaN(interval) && interval > 0) {
                refreshIntervalId = setInterval(() => {
                    loadProcesses(container);
                }, interval);
            }
        }
    });

    terminateBtn.addEventListener('click', async () => {
        if (selectedPid) {
            const selectedProcess = allProcesses.find(p => p.pid.toString() === selectedPid);
            const processName = selectedProcess ? selectedProcess.name : 'Unknown';
            
            // Show confirmation dialog
            const confirmed = confirm(
                `Are you sure you want to terminate process "${processName}" (PID: ${selectedPid})?\n\n` +
                'Warning: Terminating system processes may cause instability.'
            );
            
            if (!confirmed) {
                return;
            }
            
            try {
                // Convert selectedPid to number since dataset values are strings
                const pidNumber = parseInt(selectedPid, 10);
                if (isNaN(pidNumber)) {
                    throw new Error('Invalid PID format');
                }
                
                // Disable button during operation
                terminateBtn.disabled = true;
                terminateBtn.textContent = 'Terminating...';
                
                await window.electronAPI.terminateProcess(pidNumber);
                showNotification(`Process "${processName}" (${selectedPid}) terminated successfully.`, 'success');
                
                // Clear selection and refresh
                selectedPid = null;
                loadProcesses(container);
                
            } catch (error) {
                showNotification(`Error terminating process: ${error.message}`, 'error');
            } finally {
                // Reset button state
                terminateBtn.disabled = selectedPid === null;
                terminateBtn.textContent = 'Terminate Selected';
            }
        }
    });

    container.addEventListener('click', (e) => {
        const processItem = e.target.closest('.process-item');
        if (processItem) {
            selectProcess(processItem, container);
        }
    });
    
    // Add keyboard navigation
    container.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' && selectedPid) {
            terminateBtn.click();
        } else if (e.key === 'Escape' && selectedPid) {
            // Deselect current process
            const currentlySelected = container.querySelector('.process-item.selected');
            if (currentlySelected) {
                currentlySelected.classList.remove('selected');
                selectedPid = null;
                terminateBtn.disabled = true;
            }
        }
    });
    
    // Make container focusable for keyboard events
    container.setAttribute('tabindex', '0');

    // Cleanup interval when tab is unloaded or hidden
    window.addEventListener('beforeunload', () => {
        if (refreshIntervalId) {
            clearInterval(refreshIntervalId);
            refreshIntervalId = null;
        }
    });
}

async function loadProcesses(container) {
    const processTbody = container.querySelector('#process-tbody');

    try {
        // Show loading state
        if (processTbody && allProcesses.length === 0) {
            processTbody.innerHTML = '<tr><td colspan="4" class="loading-message">Loading processes...</td></tr>';
        }

        if (window && window.electronAPI) {
            const processes = await window.electronAPI.getProcesses();
            if (processes && processes.success && processes.list) {
                allProcesses = processes.list;
                const searchTerm = container.querySelector('#process-search-input').value.toLowerCase();
                const filteredProcesses = allProcesses.filter(p =>
                    p.name && p.name.toLowerCase().includes(searchTerm)
                );
                renderProcessList(container, filteredProcesses);
                updateProcessCount(filteredProcesses.length);
            } else {
                throw new Error('Invalid response from process API');
            }
        }
    } catch (error) {
        console.error('Error loading processes:', error);
        if (processTbody) {
            processTbody.innerHTML = '<tr><td colspan="4" class="error-message">Failed to load processes. Please try refreshing.</td></tr>';
        }
        // Show user-friendly notification
        if (window.showNotification) {
            showNotification('Failed to load processes', 'error');
        }
    } finally {
        if (window.markTabAsReady) {
            window.markTabAsReady(tabId);
        }
    }
}

function renderProcessList(container, processes) {
    const processTbody = container.querySelector('#process-tbody');
    if (!processTbody) return;

    processTbody.innerHTML = ''; // Clear existing rows
    processes.sort((a, b) => b.cpu - a.cpu);

    processes.forEach(p => {
        const row = createProcessRow(p);
        processTbody.appendChild(row);
    });
}

// Create a process table row
function createProcessRow(process) {
    const row = document.createElement('tr');
    row.dataset.pid = process.pid;
    row.addEventListener('click', () => {
        const container = document.querySelector('.tab-content.active');
        selectProcess(row, container);
    });

    row.innerHTML = `
        <td class="process-pid">${process.pid}</td>
        <td class="process-name" title="${escapeHtml(process.path || process.name)}">${escapeHtml(process.name)}</td>
        <td class="process-cpu">${process.cpu.toFixed(2)}%</td>
        <td class="process-memory">${process.memory ? process.memory + ' MB' : 'N/A'}</td>
    `;

    return row;
}

// Update process count display
function updateProcessCount(count) {
    const processCountElement = document.getElementById('process-count');
    if (processCountElement) {
        processCountElement.textContent = `${count} process${count !== 1 ? 'es' : ''}`;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function selectProcess(processRow, container) {
    const pid = processRow.dataset.pid;
    const terminateBtn = container.querySelector('#terminate-process-btn');

    if (selectedPid === pid) {
        // Deselect
        processRow.classList.remove('selected');
        selectedPid = null;
        terminateBtn.disabled = true;
    } else {
        // Deselect previous
        const currentlySelected = container.querySelector('tr.selected');
        if (currentlySelected) {
            currentlySelected.classList.remove('selected');
        }
        // Select new
        processRow.classList.add('selected');
        selectedPid = pid;
        terminateBtn.disabled = false;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}