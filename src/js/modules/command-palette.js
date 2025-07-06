import { commandRegistry, activeCommandIndex, setActiveCommandIndex, tabs } from './state.js';
import { showSettings } from './settings.js';
import { refreshCurrentTab, switchToTab } from './tabs.js';
import { closeModal } from './modals.js';
import { showNotification } from './notifications.js';


export function initCommandPalette() {
    const input = document.getElementById('command-palette-input');
    const resultsList = document.getElementById('command-palette-results');
    const modal = document.getElementById('command-palette-modal');

    if (!input || !resultsList || !modal) return;

    input.addEventListener('input', () => {
        renderCommands(input.value);
    });

    input.addEventListener('keydown', (e) => {
        const items = resultsList.querySelectorAll('.command-palette-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveCommandIndex((activeCommandIndex + 1) % items.length);
            updateActiveCommand();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveCommandIndex((activeCommandIndex - 1 + items.length) % items.length);
            updateActiveCommand();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const activeItem = resultsList.querySelector('.command-palette-item.active');
            if (activeItem) {
                const commandId = activeItem.dataset.commandId;
                executeCommand(commandId);
            }
        } else if (e.key === 'Escape') {
            closeCommandPalette();
        }
    });

    resultsList.addEventListener('click', (e) => {
        const item = e.target.closest('.command-palette-item');
        if (item) {
            const commandId = item.dataset.commandId;
            executeCommand(commandId);
        }
    });
}

export function showCommandPalette() {
    const modal = document.getElementById('command-palette-modal');
    const input = document.getElementById('command-palette-input');
    if (modal && input) {
        modal.style.display = 'flex';
        input.value = '';
        renderCommands('');
        input.focus();
    }
}

function closeCommandPalette() {
    const modal = document.getElementById('command-palette-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function renderCommands(filter = '') {
    const resultsList = document.getElementById('command-palette-results');
    if (!resultsList) return;

    resultsList.innerHTML = '';
    const lowerCaseFilter = filter.toLowerCase();

    const filteredCommands = commandRegistry.filter(cmd =>
        cmd.title.toLowerCase().includes(lowerCaseFilter) ||
        cmd.category.toLowerCase().includes(lowerCaseFilter)
    );

    filteredCommands.forEach(cmd => {
        const item = document.createElement('li');
        item.className = 'command-palette-item';
        item.dataset.commandId = cmd.id;
        item.innerHTML = `
            <i class="command-palette-item-icon ${cmd.icon}"></i>
            <div class="command-palette-item-text">
                <div class="command-palette-item-title">${cmd.title}</div>
                <div class="command-palette-item-category">${cmd.category}</div>
            </div>
        `;
        resultsList.appendChild(item);
    });

    setActiveCommandIndex(0);
    updateActiveCommand();
}

function updateActiveCommand() {
    const resultsList = document.getElementById('command-palette-results');
    if (!resultsList) return;

    const items = resultsList.querySelectorAll('.command-palette-item');
    items.forEach((item, index) => {
        if (index === activeCommandIndex) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

function executeCommand(commandId) {
    const command = commandRegistry.find(cmd => cmd.id === commandId);
    if (command && command.action) {
        command.action();
        closeCommandPalette();
    }
}

export function registerCommand(command) {
    commandRegistry.push(command);
}

export function registerDefaultCommands(loadedTabs) {
    
    const allTabs = new Map([...tabs, ...loadedTabs]);

    
    allTabs.forEach((tab, id) => {
        
        const name = tab.config ? tab.config.name : tab.name;
        const icon = tab.config ? tab.config.icon : tab.icon;

        
        if (name) {
            registerCommand({
                id: `navigate-${id}`,
                title: `Go to ${name}`,
                category: 'Navigation',
                icon: icon,
                action: () => switchToTab(id)
            });
        }
    });
    
    
    registerCommand({
        id: 'show-help',
        title: 'Show Help',
        category: 'Application',
        icon: 'fas fa-question-circle',
        action: showHelpModal
    });
    registerCommand({
        id: 'open-settings',
        title: 'Open Settings',
        category: 'Application',
        icon: 'fas fa-cog',
        action: showSettings
    });

    registerCommand({
        id: 'refresh-tab',
        title: 'Refresh Current Tab',
        category: 'Application',
        icon: 'fas fa-sync-alt',
        action: refreshCurrentTab
    });

    
    registerCommand({
        id: 'open-cmd',
        title: 'Open Command Prompt',
        category: 'System',
        icon: 'fas fa-terminal',
        action: () => window.electronAPI.runCommand('start cmd')
    });

    registerCommand({
        id: 'open-powershell',
        title: 'Open PowerShell',
        category: 'System',
        icon: 'fab fa-windows',
        action: () => window.electronAPI.runCommand('start powershell')
    });

    registerCommand({
        id: 'sfc-scannow',
        title: 'Run SFC Scan',
        category: 'System Repair',
        icon: 'fas fa-first-aid',
        action: () => window.electronAPI.runCommand('sfc /scannow', true)
    });

    registerCommand({
        id: 'dism-cleanup',
        title: 'Run DISM Cleanup',
        category: 'System Repair',
        icon: 'fas fa-medkit',
        action: () => window.electronAPI.runCommand('Dism /Online /Cleanup-Image /RestoreHealth', true)
    });

    registerCommand({
        id: 'open-app-dir',
        title: 'Open App Directory',
        category: 'Application',
        icon: 'fas fa-folder-open',
        action: () => window.electronAPI.openAppDirectory()
    });
    
    
    
    
    registerCommand({
        id: 'toggle-dev-tools',
        title: 'Toggle Developer Tools',
        category: 'Application',
        icon: 'fas fa-code',
        action: () => window.electronAPI.toggleDevTools()
    });
    registerCommand({
        id: 'restart-app',
        title: 'Restart Application',
        category: 'Application',
        icon: 'fas fa-redo',
        action: () => window.electronAPI.restartApplication()
    });
    registerCommand({
        id: 'quit-app',
        title: 'Quit Application',
        category: 'Application',
        icon: 'fas fa-power-off',
        action: () => window.electronAPI.quitApp()
    });

    
    registerCommand({
        id: 'launch-resmon',
        title: 'Launch Resource Monitor',
        category: 'System Utilities',
        icon: 'fas fa-chart-line',
        action: () => window.electronAPI.launchSystemUtility('resmon')
    });
    registerCommand({
        id: 'launch-msinfo32',
        title: 'Launch System Information',
        category: 'System Utilities',
        icon: 'fas fa-info-circle',
        action: () => window.electronAPI.launchSystemUtility('msinfo32')
    });
    registerCommand({
        id: 'launch-control-panel',
        title: 'Launch Control Panel',
        category: 'System Utilities',
        icon: 'fas fa-sliders-h',
        action: () => window.electronAPI.launchSystemUtility('control')
    });

    
     registerCommand({
        id: 'install-plugin',
        title: 'Install Plugin from File...',
        category: 'Plugin Management',
        icon: 'fas fa-plus',
        action: () => {
            const installBtn = document.getElementById('install-plugin-btn');
            if(installBtn) installBtn.click();
        }
    });
    registerCommand({
        id: 'open-plugins-dir',
        title: 'Open Plugins Folder',
        category: 'Plugin Management',
        icon: 'fas fa-folder-open',
        action: () => window.electronAPI.openPluginsDirectory()
    });

    
    registerCommand({
        id: 'open-temp-folder',
        title: 'Open Temp Folder',
        category: 'Folders',
        icon: 'fas fa-folder',
        action: () => window.electronAPI.openSpecialFolder('temp')
    });
    registerCommand({
        id: 'open-startup-folder',
        title: 'Open Startup Folder',
        category: 'Folders',
        icon: 'fas fa-folder',
        action: () => window.electronAPI.openSpecialFolder('startup')
    });
    registerCommand({
        id: 'open-hosts-folder',
        title: 'Open Hosts File Folder',
        category: 'Folders',
        icon: 'fas fa-folder',
        action: () => window.electronAPI.openSpecialFolder('hosts')
    });

    
    registerCommand({
        id: 'cleanup-temp',
        title: 'Clean Temporary Files',
        category: 'System Cleanup',
        icon: 'fas fa-broom',
        action: () => {
            window.electronAPI.executeCleanup('temp').then(result => {
                showNotification(`Cleaned temporary files. Space freed: ${(result.sizeFreed / 1024 / 1024).toFixed(2)} MB`, 'success');
            }).catch(err => showNotification(`Cleanup failed: ${err.message}`, 'error'));
        }
    });

    
    if (window.electronAPI && window.electronAPI.getApplicationsData) {
        window.electronAPI.getApplicationsData().then(packages => {
            Object.keys(packages).forEach(pkgKey => {
                const pkg = packages[pkgKey];
                registerCommand({
                    id: `install-${pkgKey}`,
                    title: `Install ${pkg.content}`,
                    category: 'Package Management',
                    icon: 'fas fa-download',
                    action: () => window.installPackage(pkgKey)
                });
                registerCommand({
                    id: `uninstall-${pkgKey}`,
                    title: `Uninstall ${pkg.content}`,
                    category: 'Package Management',
                    icon: 'fas fa-trash',
                    action: () => window.uninstallPackage(pkgKey)
                });
            });
        });
    }
}

export function registerServiceControlCommands(services) {
    if (!services || !Array.isArray(services)) {
        console.warn('Could not register service commands, service list is invalid.');
        return;
    }

    services.forEach(service => {
        const serviceId = service.Name;
        
        const serviceName = service.DisplayName || service.Name;
        
        ['start', 'stop', 'restart'].forEach(action => {
            registerCommand({
                id: `${action}-${serviceId}-service`,
                title: `${action.charAt(0).toUpperCase() + action.slice(1)}: ${serviceName}`,
                category: 'Service Control',
                icon: 'fas fa-cogs',
                action: () => {
                    window.electronAPI.controlService(serviceId, action)
                        .then(() => showNotification(`${serviceName} service ${action}ed successfully.`, 'success'))
                        .catch(err => showNotification(`Failed to ${action} ${serviceName}: ${err.message}`, 'error'));
                }
            });
        });
    });
    console.log(`Registered start/stop/restart commands for ${services.length} services.`);
}

export function showHelpModal() {
    const modal = document.getElementById('help-modal');
    if (!modal) return;

    const commandList = document.getElementById('help-command-list');
    const searchInput = document.getElementById('help-search-input');
    const commandsPerLoad = 15;
    let serviceCommandsRendered = 0;
    let packageCommandsRendered = 0;

    
    commandList.onclick = function(e) {
        const commandItem = e.target.closest('.help-command-item');
        if (commandItem && commandItem.dataset.commandId) {
            executeCommand(commandItem.dataset.commandId);
            const modal = document.getElementById('help-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        const loadMoreBtn = e.target.closest('.load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.onclick(); 
        }
    };

    const renderHelpList = (filter = '', loadMore = false) => {
        const lowerCaseFilter = filter.toLowerCase();

        if (!loadMore) {
            commandList.innerHTML = '';
            serviceCommandsRendered = 0;
            packageCommandsRendered = 0;
        }

        const groupedCommands = commandRegistry.reduce((acc, cmd) => {
            if (!acc[cmd.category]) acc[cmd.category] = [];
            acc[cmd.category].push(cmd);
            return acc;
        }, {});

        for (const category in groupedCommands) {
            let categoryDiv = commandList.querySelector(`.help-category[data-category="${category}"]`);
            if (!categoryDiv && !loadMore) {
                categoryDiv = document.createElement('div');
                categoryDiv.className = 'help-category';
                categoryDiv.dataset.category = category;
                categoryDiv.innerHTML = `<h4>${category}</h4>`;
                commandList.appendChild(categoryDiv);
            } else if (!categoryDiv && loadMore) {
                continue;
            }

            const existingLoadMoreBtn = categoryDiv.querySelector('.load-more-btn');
            if (existingLoadMoreBtn) existingLoadMoreBtn.remove();

            const filteredCommands = groupedCommands[category].filter(cmd =>
                cmd.title.toLowerCase().includes(lowerCaseFilter)
            );

            const lazyLoadCategories = {
                'Service Control': {
                    rendered: serviceCommandsRendered,
                    updateRendered: (count) => serviceCommandsRendered = count
                },
                'Package Management': {
                    rendered: packageCommandsRendered,
                    updateRendered: (count) => packageCommandsRendered = count
                }
            };

            if (lazyLoadCategories[category] && filter === '') {
                const lazyLoader = lazyLoadCategories[category];
                const commandsToRender = filteredCommands.slice(lazyLoader.rendered, lazyLoader.rendered + commandsPerLoad);

                commandsToRender.forEach(cmd => {
                    const item = document.createElement('div');
                    item.className = 'help-command-item';
                    item.dataset.commandId = cmd.id;
                    item.style.cursor = 'pointer';
                    item.innerHTML = `<i class="${cmd.icon}"></i><span class="help-command-title">${cmd.title}</span>`;
                    categoryDiv.appendChild(item);
                });

                let newRenderedCount = lazyLoader.rendered + commandsToRender.length;
                lazyLoader.updateRendered(newRenderedCount);

                if (newRenderedCount < filteredCommands.length) {
                    const loadMoreBtn = document.createElement('button');
                    loadMoreBtn.textContent = `Load More (${filteredCommands.length - newRenderedCount} remaining)`;
                    loadMoreBtn.className = 'btn btn-secondary load-more-btn';
                    loadMoreBtn.onclick = () => renderHelpList('', true);
                    categoryDiv.appendChild(loadMoreBtn);
                }
            } else {
                if (!loadMore) {
                    filteredCommands.forEach(cmd => {
                        const item = document.createElement('div');
                        item.className = 'help-command-item';
                        item.dataset.commandId = cmd.id;
                        item.style.cursor = 'pointer'; 
                        item.innerHTML = `<i class="${cmd.icon}"></i><span class="help-command-title">${cmd.title}</span>`;
                        categoryDiv.appendChild(item);
                    });
                }
            }
            if (categoryDiv && categoryDiv.childElementCount <= 1 && !categoryDiv.querySelector('.load-more-btn')) {
                categoryDiv.remove();
            }
        }
    };
    
    searchInput.oninput = (e) => renderHelpList(e.target.value);

    renderHelpList();
    modal.style.display = 'flex';
}
