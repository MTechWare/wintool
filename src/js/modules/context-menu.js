import { currentTab, hiddenTabs } from './state.js';
import { switchToTab } from './tabs.js';
import { showNotification } from './notifications.js';

export function initContextMenu() {
  const tabContextMenu = document.getElementById('tab-context-menu');
  const sidebarContextMenu = document.getElementById('sidebar-context-menu');
  const tabList = document.getElementById('tab-list');
  const sidebar = document.querySelector('.sidebar');

  let activeTabId = null;

  tabList.addEventListener('contextmenu', e => {
    const targetTab = e.target.closest('.tab-item');
    if (targetTab) {
      e.preventDefault();
      activeTabId = targetTab.getAttribute('data-tab');

      if (activeTabId === 'welcome') return;

      tabContextMenu.style.top = `${e.clientY}px`;
      tabContextMenu.style.left = `${e.clientX}px`;
      tabContextMenu.style.display = 'block';
      sidebarContextMenu.style.display = 'none';
    }
  });

  sidebar.addEventListener('contextmenu', e => {
    if (!e.target.closest('.tab-item')) {
      e.preventDefault();
      updateHiddenTabsMenu();
      sidebarContextMenu.style.top = `${e.clientY}px`;
      sidebarContextMenu.style.left = `${e.clientX}px`;
      sidebarContextMenu.style.display = 'block';
      tabContextMenu.style.display = 'none';
    }
  });

  document.addEventListener('click', () => {
    tabContextMenu.style.display = 'none';
    sidebarContextMenu.style.display = 'none';
  });

  document.getElementById('context-menu-hide-tab').addEventListener('click', () => {
    if (activeTabId) {
      hideTab(activeTabId);
    }
  });

  document.getElementById('hidden-tabs-list').addEventListener('click', e => {
    const target = e.target.closest('.context-menu-item');
    if (target && target.dataset.tab) {
      showTab(target.dataset.tab);
    }
  });
}

async function hideTab(tabId) {
  if (hiddenTabs.includes(tabId)) return;

  const tabItem = document.querySelector(`.tab-item[data-tab="${tabId}"]`);
  if (tabItem) {
    tabItem.classList.add('is-hidden');
    hiddenTabs.push(tabId);
    await window.electronAPI.setSetting('hiddenTabs', hiddenTabs);

    if (currentTab === tabId) {
      switchToTab('welcome');
    }
    showNotification(`Tab "${tabItem.textContent.trim()}" hidden.`, 'info');
  }
}

async function showTab(tabId) {
  const index = hiddenTabs.indexOf(tabId);
  if (index === -1) return;

  const tabItem = document.querySelector(`.tab-item[data-tab="${tabId}"]`);
  if (tabItem) {
    tabItem.classList.remove('is-hidden');
    hiddenTabs.splice(index, 1);
    await window.electronAPI.setSetting('hiddenTabs', hiddenTabs);
    showNotification(`Tab "${tabItem.textContent.trim()}" restored.`, 'success');
  }
}

function updateHiddenTabsMenu() {
  const hiddenTabsList = document.getElementById('hidden-tabs-list');
  const showTabsSubmenu = document.getElementById('context-menu-show-tabs');
  hiddenTabsList.innerHTML = '';

  if (hiddenTabs.length === 0) {
    showTabsSubmenu.style.display = 'none';
  } else {
    showTabsSubmenu.style.display = 'flex';
    hiddenTabs.forEach(tabId => {
      const originalTab = document.querySelector(`.tab-item[data-tab="${tabId}"]`);
      if (originalTab) {
        const tabName = originalTab.querySelector('span').textContent;
        const tabIcon = originalTab.querySelector('i').className;

        const li = document.createElement('li');
        li.className = 'context-menu-item';
        li.dataset.tab = tabId;
        li.innerHTML = `<i class="${tabIcon}"></i> ${tabName}`;
        hiddenTabsList.appendChild(li);
      }
    });
  }
}
