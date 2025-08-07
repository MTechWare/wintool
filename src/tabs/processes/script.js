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
        const filteredProcesses = allProcesses.filter(p => p.name.toLowerCase().includes(searchTerm));
        renderProcessList(container, filteredProcesses);
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
    const processList = container.querySelector('.process-list');
    
    try {
        // Show loading state
        if (processList && allProcesses.length === 0) {
            processList.innerHTML = '<div class="loading-message">Loading processes...</div>';
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
            } else {
                throw new Error('Invalid response from process API');
            }
        }
    } catch (error) {
        console.error('Error loading processes:', error);
        if (processList) {
            processList.innerHTML = '<div class="error-message">Failed to load processes. Please try refreshing.</div>';
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
    const processList = container.querySelector('.process-list');
    if (!processList) return;

    processList.innerHTML = ''; // Clear existing list
    processes.sort((a, b) => b.cpu - a.cpu);

    processes.forEach(p => {
        const processItem = document.createElement('div');
        processItem.classList.add('process-item');
        processItem.dataset.pid = p.pid;

        const pid = document.createElement('div');
        pid.classList.add('pid');
        pid.textContent = p.pid;

        const name = document.createElement('div');
        name.classList.add('name');
        name.textContent = p.name;
        name.title = p.path;

        const cpu = document.createElement('div');
        cpu.classList.add('cpu');
        cpu.textContent = p.cpu.toFixed(2);

        const memory = document.createElement('div');
        memory.classList.add('memory');
        memory.textContent = p.memory ? p.memory + ' MB' : 'N/A';

        processItem.appendChild(pid);
        processItem.appendChild(name);
        processItem.appendChild(cpu);
        processItem.appendChild(memory);

        processList.appendChild(processItem);
    });
}

function selectProcess(processItem, container) {
    const pid = processItem.dataset.pid;
    const terminateBtn = container.querySelector('#terminate-process-btn');
    
    if (selectedPid === pid) {
        // Deselect
        processItem.classList.remove('selected');
        selectedPid = null;
        terminateBtn.disabled = true;
    } else {
        // Deselect previous
        const currentlySelected = container.querySelector('.process-item.selected');
        if (currentlySelected) {
            currentlySelected.classList.remove('selected');
        }
        // Select new
        processItem.classList.add('selected');
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