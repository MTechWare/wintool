console.log('=== Processes tab JavaScript loaded! ===');

console.log('=== Processes tab JavaScript loaded! ===');

let refreshIntervalId = null;

if (tabContainer) {
    initializeProcessesTab(tabContainer);
} else {
    console.error('No container found for processes tab, cannot load data.');
}

function initializeProcessesTab(container) {
    const autoRefreshCheckbox = container.querySelector('#auto-refresh-checkbox');
    const refreshIntervalInput = container.querySelector('#refresh-interval-input');
    const terminateBtn = container.querySelector('#terminate-process-btn');
    const searchInput = container.querySelector('#process-search-input');
    let selectedPid = null;
    let allProcesses = [];

    loadProcesses(container);

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredProcesses = allProcesses.filter(p => p.name.toLowerCase().includes(searchTerm));
        renderProcessList(container, filteredProcesses);
    });

    autoRefreshCheckbox.addEventListener('change', () => {
        if (autoRefreshCheckbox.checked) {
            let interval = parseInt(refreshIntervalInput.value, 10) * 1000;
            // Minimum interval of 5 seconds to reduce CPU usage
            if (interval < 5000) {
                interval = 5000;
                refreshIntervalInput.value = 5;
            }
            if (!isNaN(interval) && interval > 0) {
                refreshIntervalId = setInterval(() => loadProcesses(container), interval);
            }
        } else {
            clearInterval(refreshIntervalId);
        }
    });

    refreshIntervalInput.addEventListener('change', () => {
        if (autoRefreshCheckbox.checked) {
            clearInterval(refreshIntervalId);
            let interval = parseInt(refreshIntervalInput.value, 10) * 1000;
            // Minimum interval of 5 seconds to reduce CPU usage
            if (interval < 5000) {
                interval = 5000;
                refreshIntervalInput.value = 5;
            }
            if (!isNaN(interval) && interval > 0) {
                refreshIntervalId = setInterval(() => loadProcesses(container), interval);
            }
        }
    });

    terminateBtn.addEventListener('click', async () => {
        if (selectedPid) {
            try {
                await window.electronAPI.terminateProcess(selectedPid);
                showNotification(`Process ${selectedPid} terminated successfully.`, 'success');
                loadProcesses(container); // Refresh the list
            } catch (error) {
                showNotification(`Error terminating process: ${error.message}`, 'error');
            }
        }
    });

    container.addEventListener('click', (e) => {
        const processItem = e.target.closest('.process-item');
        if (processItem) {
            const pid = processItem.dataset.pid;
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
    });
}

async function loadProcesses(container) {
    try {
        if (window && window.electronAPI) {
            const processes = await window.electronAPI.getProcesses();
            if (processes && processes.list) {
                allProcesses = processes.list;
                const searchTerm = container.querySelector('#process-search-input').value.toLowerCase();
                const filteredProcesses = allProcesses.filter(p => p.name.toLowerCase().includes(searchTerm));
                renderProcessList(container, filteredProcesses);
            }
        }
    } catch (error) {
        console.error('Error loading processes:', error);
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
        memory.textContent = p.mem_rss ? formatBytes(p.mem_rss) : 'N/A';

        processItem.appendChild(pid);
        processItem.appendChild(name);
        processItem.appendChild(cpu);
        processItem.appendChild(memory);

        processList.appendChild(processItem);
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}