import { currentTab, setCurrentTab, tabs, hiddenTabs, tabLoader, DEFAULT_TAB_ORDER } from './state.js';
import { showNotification } from './notifications.js';


export function initTabSystem() {

    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');
            switchToTab(tabName);
        });
    });


    initTabSearch();


    initDraggableTabs();


    tabs.set('welcome', {
        name: 'Welcome',
        icon: 'fas fa-home',
        content: document.getElementById('tab-welcome').innerHTML
    });

    tabs.set('plugins', {
        name: 'Plugins',
        icon: 'fas fa-puzzle-piece',
        content: document.getElementById('tab-plugins').innerHTML
    });
}


function initTabSearch() {
    const searchInput = document.getElementById('tab-search');
    if (!searchInput) return;


    searchInput.addEventListener('input', (e) => {
        searchTabs(e.target.value);
    });


    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchTabs('');
            searchInput.blur();
        }
    });
}


function searchTabs(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const tabItems = document.querySelectorAll('.tab-item');

    tabItems.forEach(tabItem => {
        const tabName = tabItem.querySelector('span').textContent.toLowerCase();
        const isMatch = term === '' || tabName.includes(term);

        if (isMatch) {
            tabItem.classList.remove('hidden');
        } else {
            tabItem.classList.add('hidden');
        }
    });
}


async function initDraggableTabs() {
    try {

        enableDraggableTabsFunction();

    } catch (error) {
        console.error('Error initializing draggable tabs:', error);
    }
}


function enableDraggableTabsFunction() {
    const tabList = document.getElementById('tab-list');
    if (!tabList) return;


    tabList.classList.add('draggable-enabled');


    makeAllTabsDraggable();
}




function makeAllTabsDraggable() {
    const tabItems = document.querySelectorAll('.tab-item');

    tabItems.forEach(tabItem => {
        tabItem.draggable = true;
        tabItem.classList.add('draggable');
        addDragListeners(tabItem);
    });
}


function addDragListeners(tabItem) {
    tabItem.addEventListener('dragstart', handleDragStart);
    tabItem.addEventListener('dragend', handleDragEnd);
    tabItem.addEventListener('dragover', handleDragOver);
    tabItem.addEventListener('drop', handleDrop);
    tabItem.addEventListener('dragenter', handleDragEnter);
    tabItem.addEventListener('dragleave', handleDragLeave);
}



let draggedTab = null;
let dragOverTab = null;


function handleDragStart(e) {
    draggedTab = this;
    this.classList.add('dragging');


    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);


    const tabList = document.getElementById('tab-list');
    if (tabList) {
        tabList.classList.add('drag-active');
    }
}


function handleDragEnd(e) {
    this.classList.remove('dragging');


    const tabList = document.getElementById('tab-list');
    if (tabList) {
        tabList.classList.remove('drag-active');
    }


    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        item.classList.remove('drag-over', 'drag-over-bottom');
    });

    draggedTab = null;
    dragOverTab = null;
}


function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';
    return false;
}


function handleDragEnter(e) {
    if (this === draggedTab) return;

    dragOverTab = this;


    const rect = this.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if (e.clientY < midpoint) {
        this.classList.add('drag-over');
        this.classList.remove('drag-over-bottom');
    } else {
        this.classList.add('drag-over-bottom');
        this.classList.remove('drag-over');
    }
}


function handleDragLeave(e) {

    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over', 'drag-over-bottom');
    }
}


function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedTab !== this) {

        const rect = this.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const insertBefore = e.clientY < midpoint;


        const tabList = document.getElementById('tab-list');
        if (insertBefore) {
            tabList.insertBefore(draggedTab, this);
        } else {
            tabList.insertBefore(draggedTab, this.nextSibling);
        }


        saveTabOrder();
    }

    return false;
}


export async function saveTabOrder() {
    try {
        if (!window.electronAPI) return;

        const tabItems = document.querySelectorAll('.tab-item');
        const tabOrder = Array.from(tabItems).map(item => item.getAttribute('data-tab'));

        await window.electronAPI.setSetting('tabOrder', tabOrder);
        console.log('Tab order saved:', tabOrder);
    } catch (error) {
        console.error('Error saving tab order:', error);
    }
}


export async function loadTabOrder() {
    try {
        if (!window.electronAPI) return;

        const savedOrder = await window.electronAPI.getSetting('tabOrder', []);
        

        if (!savedOrder || savedOrder.length === 0) {
            console.log('No saved drag-and-drop tab order found. Using default.');
            return;
        }

        console.log('Applying saved drag-and-drop tab order.');
        const tabList = document.getElementById('tab-list');
        if (!tabList) return;


        const tabItems = document.querySelectorAll('.tab-item');
        const tabMap = new Map();
        tabItems.forEach(item => {
            const tabId = item.getAttribute('data-tab');
            tabMap.set(tabId, item);
        });


        savedOrder.forEach(tabId => {
            const tabItem = tabMap.get(tabId);
            if (tabItem) {
                tabList.appendChild(tabItem);
                tabMap.delete(tabId);
            }
        });


        tabMap.forEach(tabItem => {
            tabList.appendChild(tabItem);
        });

        console.log('Tab order loaded and applied:', savedOrder);
    } catch (error) {
        console.error('Error loading tab order:', error);
    }
}




export function makeNewTabDraggable(tabItem) {
    try {
        tabItem.draggable = true;
        tabItem.classList.add('draggable');
        addDragListeners(tabItem);
    } catch (error) {
        console.error('Error making new tab draggable:', error);
    }
}


export async function switchToTab(tabName) {
    const previousTabId = currentTab;
    if (previousTabId === tabName) return;

    console.log(`Attempting to switch to tab: ${tabName}`);


    const targetTabElement = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContentElement = document.getElementById(`tab-${tabName}`);

    if (!targetTabElement || !targetContentElement) {
        console.error(`Tab "${tabName}" not found. Available tabs:`,
            Array.from(document.querySelectorAll('.tab-item')).map(item => item.getAttribute('data-tab')));
        return;
    }

    setCurrentTab(tabName);

    // Trigger lazy loading for the tab if needed
    if (window.tabLoader && typeof window.tabLoader.executeTabJSOnDemand === 'function') {
        window.tabLoader.executeTabJSOnDemand(tabName);
    }

    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });


    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        if (content.id === `tab-${tabName}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });


    try {
        if (window.electronAPI) {
            const rememberLastTab = await window.electronAPI.getSetting('rememberLastTab', false);
            if (rememberLastTab) {
                await window.electronAPI.setSetting('lastActiveTab', tabName);
                console.log(`Saved last active tab: ${tabName}`);
            }
        }
    } catch (error) {
        console.error('Error saving last active tab:', error);
    }




    console.log(`Successfully switched to tab: ${tabName}`);
}

export async function refreshCurrentTab() {
    console.log(`Refreshing current tab: ${currentTab}`);

    try {

        const activeTabContent = document.querySelector('.tab-content.active');
        if (!activeTabContent) {
            console.warn('No active tab found to refresh');
            return;
        }


        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'refresh-indicator';
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        loadingIndicator.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: var(--primary-color);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        activeTabContent.style.position = 'relative';
        activeTabContent.appendChild(loadingIndicator);


        setTimeout(() => {
            if (loadingIndicator.parentNode) {
                loadingIndicator.remove();
            }
        }, 2000);


        if (currentTab === 'system-info' || currentTab === 'folder-system-info') {

            await refreshSystemInformation();
        } else if (currentTab === 'networking' || currentTab === 'folder-networking') {

            const container = activeTabContent;
            if (window.loadNetworkingInfo && typeof window.loadNetworkingInfo === 'function') {
                await window.loadNetworkingInfo(container);
            }
        } else if (currentTab === 'services' || currentTab === 'folder-services') {

            const refreshBtn = activeTabContent.querySelector('[id*="refresh-services"]');
            if (refreshBtn) {
                refreshBtn.click();
            }
        } else if (currentTab === 'environment-variables' || currentTab === 'folder-environment-variables') {

            if (window.refreshEnvironmentVariables && typeof window.refreshEnvironmentVariables === 'function') {
                await window.refreshEnvironmentVariables();
            }
        } else if (currentTab === 'applications' || currentTab === 'folder-applications') {

            const refreshBtn = activeTabContent.querySelector('[id*="refresh-applications"]');
            if (refreshBtn) {
                refreshBtn.click();
            }
        } else if (currentTab === 'cleanup' || currentTab === 'folder-cleanup') {

            const refreshBtn = activeTabContent.querySelector('[id*="refresh-cleanup"]');
            if (refreshBtn) {
                refreshBtn.click();
            }
        } else {

            const refreshBtn = activeTabContent.querySelector('button[id*="refresh"], .refresh-btn, [data-action="refresh"]');
            if (refreshBtn) {
                refreshBtn.click();
            } else {
                console.log(`No specific refresh handler found for tab: ${currentTab}`);
            }
        }

        console.log(`Tab ${currentTab} refreshed successfully`);
    } catch (error) {
        console.error('Error refreshing current tab:', error);
    }
}


export async function refreshSystemInformation() {
    console.log('Refreshing system information...');

    try {

        const refreshIndicator = document.createElement('div');
        refreshIndicator.className = 'global-refresh-indicator';
        refreshIndicator.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing System Information...';
        refreshIndicator.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--primary-color);
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideDown 0.3s ease-out;
        `;


        if (!document.querySelector('#refresh-animations')) {
            const style = document.createElement('style');
            style.id = 'refresh-animations';
            style.textContent = `
                @keyframes slideDown {
                    from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(refreshIndicator);


        setTimeout(() => {
            if (refreshIndicator.parentNode) {
                refreshIndicator.remove();
            }
        }, 3000);


        const systemInfoTab = document.getElementById('tab-system-info') || document.getElementById('tab-folder-system-info');
        if (systemInfoTab) {
            if (window.loadSystemInfo && typeof window.loadSystemInfo === 'function') {
                await window.loadSystemInfo(systemInfoTab);
            }
        }


        const networkingTab = document.getElementById('tab-networking') || document.getElementById('tab-folder-networking');
        if (networkingTab) {
            if (window.loadNetworkingInfo && typeof window.loadNetworkingInfo === 'function') {
                await window.loadNetworkingInfo(networkingTab);
            }
        }

        console.log('System information refreshed successfully');
    } catch (error) {
        console.error('Error refreshing system information:', error);
    }
}
