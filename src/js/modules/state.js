export let currentTab = 'welcome';
export function setCurrentTab(tabId) {
  currentTab = tabId;
  window.tabEventManager.dispatchEvent(new CustomEvent('tabChanged', { detail: { tabId } }));
}

export let tabs = new Map();

export let hiddenTabs = [];
export function setHiddenTabs(newHiddenTabs) {
  hiddenTabs = newHiddenTabs;
}

export let tabLoader = null;
export function setTabLoader(newTabLoader) {
  tabLoader = newTabLoader;
}

export let rainbowAnimationId = null;
export function setRainbowAnimationId(id) {
  rainbowAnimationId = id;
}
window.tabEventManager = new EventTarget();

export const DEFAULT_TAB_ORDER = [
  'system-info', // 1. Start with system overview
  'system-health', // 2. Check system health status
  'tweaks', // 3. Apply system optimizations
  'cleanup', // 4. Clean up system files
  'processes', // 5. Monitor running processes
  'services', // 6. Manage system services
  'packages', // 7. Install/manage software
  'appx-packages', // 8. Manage Windows Store apps
  'networking', // 9. Network configuration/monitoring
  'environment-variables', // 10. System configuration
  'system-utilities', // 11. Access Windows tools
  'event-viewer', // 12. Troubleshooting and logs
  'script-editor', // 13. Advanced scripting
  'windows-unattend', // 14. Advanced deployment
  'about', // 15. Always last
];

export const DEFAULT_SHORTCUTS = {
  'show-help': 'F1',
  'command-palette': 'Ctrl+K',
  'focus-search': 'Ctrl+F',
  'refresh-tab': 'Ctrl+R',
  'refresh-system': 'F5',
  'open-settings': 'Ctrl+S',
  'close-modal': 'Escape',
  'quit-app': 'Ctrl+Q',
};

export let currentShortcuts = { ...DEFAULT_SHORTCUTS };
export function setCurrentShortcuts(newShortcuts) {
  // We need to modify the object, not reassign the import reference.
  Object.keys(currentShortcuts).forEach(key => delete currentShortcuts[key]);
  Object.assign(currentShortcuts, newShortcuts);
}

export const THEMES = {
  'classic-dark': {
    '--primary-color': '#ff9800',
    '--primary-dark': '#f57c00',
    '--primary-darker': '#e65100',
    '--primary-rgb': '255, 152, 0',
    '--background-dark': '#0a0a0c',
    '--background-light': '#111113',
    '--background-card': '#1a1a1c',
    '--border-color': '#333333',
    '--hover-color': '#23232a',
    '--background-content': '#0a0a0c',
  },
  'modern-gray': {
    '--primary-color': '#3498db',
    '--primary-dark': '#2980b9',
    '--primary-darker': '#2c3e50',
    '--primary-rgb': '52, 152, 219',
    '--background-dark': '#1c1c1e',
    '--background-light': '#2c2c2e',
    '--background-card': '#3a3a3c',
    '--border-color': '#444444',
    '--hover-color': '#4f4f52',
    '--background-content': '#1c1c1e',
  },
  custom: {},
};

export const commandRegistry = [];
export let activeCommandIndex = -1;
export function setActiveCommandIndex(index) {
  activeCommandIndex = index;
}
