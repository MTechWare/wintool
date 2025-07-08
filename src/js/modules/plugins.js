import { showNotification } from './notifications.js';


export function initPluginInstallButton() {
    const installBtn = document.getElementById('install-plugin-btn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (window.electronAPI) {
                const result = await window.electronAPI.installPlugin();
                if (result.success) {
                    showNotification(result.message, 'success');
                    
                    await renderPluginCards();
                } else {
                    showNotification(result.message, 'error');
                }
            }
        });
    }
}


export function initOpenPluginsDirButton() {
    const openDirBtn = document.getElementById('open-plugins-dir-btn');
    if (openDirBtn) {
        openDirBtn.addEventListener('click', () => {
            if (window.electronAPI) {
                window.electronAPI.openPluginsDirectory();
            }
        });
    }

    const searchInput = document.getElementById('plugin-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const pluginCards = document.querySelectorAll('.plugin-card');
            pluginCards.forEach(card => {
                const pluginName = card.querySelector('h4').textContent.toLowerCase();
                if (pluginName.includes(searchTerm)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
}


export async function renderPluginCards() {
    const activeContainer = document.getElementById('active-plugins-grid');
    const disabledContainer = document.getElementById('disabled-plugins-grid');

    if (!activeContainer || !disabledContainer) return;

    activeContainer.innerHTML = ''; 
    disabledContainer.innerHTML = ''; 

    if (!window.electronAPI) return;

    try {
        const plugins = await window.electronAPI.getAllPlugins();
        const activePlugins = plugins.filter(p => p.enabled);
        const disabledPlugins = plugins.filter(p => !p.enabled);

        if (activePlugins.length === 0) {
            activeContainer.innerHTML = '<p class="empty-plugin-message">No active plugins installed.</p>';
        } else {
            activePlugins.forEach(plugin => {
                const card = document.createElement('div');
                card.className = `feature-card plugin-card ${plugin.verified ? 'verified-plugin' : ''}`;
                card.innerHTML = `
                    <div class="plugin-card-header">
                        <i class="${plugin.icon}"></i>
                        <h4>${plugin.name}</h4>
                    </div>
                    <p>${plugin.description}</p>
                    <div class="plugin-card-actions">
                        <button class="plugin-action-btn" data-plugin-id="${plugin.id}" data-action="info" title="Plugin Info">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="plugin-action-btn" data-plugin-id="${plugin.id}" data-action="disable" title="Disable Plugin">
                            <i class="fas fa-toggle-off"></i>
                        </button>
                        <button class="plugin-action-btn delete" data-plugin-id="${plugin.id}" data-action="delete" title="Delete Plugin">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <div class="plugin-card-footer">
                        <span class="plugin-version">v${plugin.version}</span>
                        <span class="plugin-author">by ${plugin.author}</span>
                    </div>
                `;
                activeContainer.appendChild(card);
            });
        }

        if (disabledPlugins.length === 0) {
            disabledContainer.innerHTML = '<p class="empty-plugin-message">No disabled plugins.</p>';
        } else {
            disabledPlugins.forEach(plugin => {
                const card = document.createElement('div');
                card.className = `feature-card plugin-card disabled ${plugin.verified ? 'verified-plugin' : ''}`;
                card.innerHTML = `
                     <div class="plugin-card-header">
                        <i class="${plugin.icon}"></i>
                        <h4>${plugin.name} (Disabled)</h4>
                    </div>
                    <p>${plugin.description}</p>
                    <div class="plugin-card-actions">
                        <button class="plugin-action-btn" data-plugin-id="${plugin.id}" data-action="info" title="Plugin Info">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="plugin-action-btn" data-plugin-id="${plugin.id}" data-action="enable" title="Enable Plugin">
                            <i class="fas fa-toggle-on"></i>
                        </button>
                        <button class="plugin-action-btn delete" data-plugin-id="${plugin.id}" data-action="delete" title="Delete Plugin">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <div class="plugin-card-footer">
                        <span class="plugin-version">v${plugin.version}</span>
                        <span class="plugin-author">by ${plugin.author}</span>
                    </div>
                `;
                disabledContainer.appendChild(card);
            });
        }

        
        document.querySelectorAll('.plugin-action-btn').forEach(button => {
            button.addEventListener('click', handlePluginAction);
        });

    } catch (error) {
        console.error('Error rendering plugin cards:', error);
        activeContainer.innerHTML = '<p>Error loading plugin information.</p>';
    }
}

async function handlePluginAction(event) {
    const button = event.currentTarget;
    const pluginId = button.dataset.pluginId;
    const action = button.dataset.action;

    if (!pluginId || !action) return;

    if (action === 'info') {
        const plugins = await window.electronAPI.getAllPlugins();
        const plugin = plugins.find(p => p.id === pluginId);
        if (plugin) {
            showNotification(`Plugin Hash: ${plugin.hash}`, 'info');
        }
        return;
    }

    button.disabled = true;
    const originalIcon = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        let result;
        if (action === 'delete') {
            result = await window.electronAPI.deletePlugin(pluginId);
        } else {
            result = await window.electronAPI.togglePluginState(pluginId);
        }

        if (result.success) {
            if (!result.restarted) {
                await renderPluginCards();
            }
        } else {
            showNotification(`Error: ${result.message}`, 'error');
            button.disabled = false;
            button.innerHTML = originalIcon;
        }
    } catch (error) {
        showNotification(`An unexpected error occurred: ${error.message}`, 'error');
        button.disabled = false;
        button.innerHTML = originalIcon;
    }
}
