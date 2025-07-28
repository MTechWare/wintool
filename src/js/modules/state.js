
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
    'system-info',        // 1. Start with system overview
    'system-health',      // 2. Check system health status
    'tweaks',            // 3. Apply system optimizations
    'cleanup',           // 4. Clean up system files
    'processes',         // 5. Monitor running processes
    'services',          // 6. Manage system services
    'packages',          // 7. Install/manage software
    'appx-packages',     // 8. Manage Windows Store apps
    'networking',        // 9. Network configuration/monitoring
    'environment-variables', // 10. System configuration
    'system-utilities',  // 11. Access Windows tools
    'event-viewer',      // 12. Troubleshooting and logs
    'script-editor',     // 13. Advanced scripting
    'windows-unattend',  // 14. Advanced deployment
    'about'             // 15. Always last
];


export const DEFAULT_SHORTCUTS = {
    'show-help': 'F1',
    'command-palette': 'Ctrl+K',
    'focus-search': 'Ctrl+F',
    'refresh-tab': 'Ctrl+R',
    'refresh-system': 'F5',
    'open-settings': 'Ctrl+S',
    'close-modal': 'Escape',
    'quit-app': 'Ctrl+Q'
};


export let currentShortcuts = { ...DEFAULT_SHORTCUTS };
export function setCurrentShortcuts(newShortcuts) {
    // We need to modify the object, not reassign the import reference.
    Object.keys(currentShortcuts).forEach(key => delete currentShortcuts[key]);
    Object.assign(currentShortcuts, newShortcuts);
}

export const THEMES = {
    'classic-dark': {
        name: 'Classic Dark',
        description: 'Deep black theme with orange accents',
        category: 'dark',
        '--primary-color': '#ff6b35',
        '--primary-dark': '#e55a2b',
        '--primary-darker': '#cc4a1f',
        '--primary-rgb': '255, 107, 53',
        '--background-dark': '#0f0f0f',
        '--background-light': '#1a1a1a',
        '--background-card': '#252525',
        '--border-color': '#333333',
        '--hover-color': '#2a2a2a',
        '--background-content': '#1a1a1a',
        '--text-primary': '#ffffff',
        '--text-secondary': '#b0b0b0',
        '--success-color': '#4caf50',
        '--error-color': '#f44336',
        '--warning-color': '#ff9800'
    },
    'modern-gray': {
        name: 'Modern Gray',
        description: 'Sleek gray theme with warm orange highlights',
        category: 'dark',
        '--primary-color': '#ff6b35',
        '--primary-dark': '#e55a2b',
        '--primary-darker': '#cc4a1f',
        '--primary-rgb': '255, 107, 53',
        '--background-dark': '#1c1c1e',
        '--background-light': '#2c2c2e',
        '--background-card': '#3a3a3c',
        '--border-color': '#444444',
        '--hover-color': '#4f4f52',
        '--background-content': '#2c2c2e',
        '--text-primary': '#ffffff',
        '--text-secondary': '#b0b0b0',
        '--success-color': '#4caf50',
        '--error-color': '#f44336',
        '--warning-color': '#ff9800'
    },
    'cyber-blue': {
        name: 'Cyber Blue',
        description: 'Futuristic blue theme with electric accents',
        category: 'dark',
        '--primary-color': '#00d4ff',
        '--primary-dark': '#00b8e6',
        '--primary-darker': '#009cc7',
        '--primary-rgb': '0, 212, 255',
        '--background-dark': '#0a0e1a',
        '--background-light': '#1a1f2e',
        '--background-card': '#252a3a',
        '--border-color': '#3a4a5a',
        '--hover-color': '#2a3545',
        '--background-content': '#1a1f2e',
        '--text-primary': '#e0f4ff',
        '--text-secondary': '#8bb8d4',
        '--success-color': '#00ff88',
        '--error-color': '#ff4757',
        '--warning-color': '#ffa502'
    },
    'matrix-green': {
        name: 'Matrix Green',
        description: 'Digital rain inspired green on black',
        category: 'dark',
        '--primary-color': '#00ff41',
        '--primary-dark': '#00e63a',
        '--primary-darker': '#00cc33',
        '--primary-rgb': '0, 255, 65',
        '--background-dark': '#000000',
        '--background-light': '#0a0f0a',
        '--background-card': '#0f1f0f',
        '--border-color': '#1a3d1a',
        '--hover-color': '#152815',
        '--background-content': '#0a0f0a',
        '--text-primary': '#00ff41',
        '--text-secondary': '#00cc33',
        '--success-color': '#00ff88',
        '--error-color': '#ff0040',
        '--warning-color': '#ffff00'
    },
    'purple-haze': {
        name: 'Purple Haze',
        description: 'Deep purple theme with violet highlights',
        category: 'dark',
        '--primary-color': '#8b5cf6',
        '--primary-dark': '#7c3aed',
        '--primary-darker': '#6d28d9',
        '--primary-rgb': '139, 92, 246',
        '--background-dark': '#1a0f2e',
        '--background-light': '#2d1b4e',
        '--background-card': '#3d2b5e',
        '--border-color': '#4d3b6e',
        '--hover-color': '#3a2858',
        '--background-content': '#2d1b4e',
        '--text-primary': '#f3e8ff',
        '--text-secondary': '#c4b5fd',
        '--success-color': '#10b981',
        '--error-color': '#ef4444',
        '--warning-color': '#f59e0b'
    },
    'sunset-orange': {
        name: 'Sunset Orange',
        description: 'Warm sunset colors with deep orange tones',
        category: 'warm',
        '--primary-color': '#ff8c42',
        '--primary-dark': '#ff7518',
        '--primary-darker': '#e55a00',
        '--primary-rgb': '255, 140, 66',
        '--background-dark': '#2a1810',
        '--background-light': '#3d2418',
        '--background-card': '#4a2d20',
        '--border-color': '#5a3d30',
        '--hover-color': '#453025',
        '--background-content': '#3d2418',
        '--text-primary': '#fff5f0',
        '--text-secondary': '#d4a574',
        '--success-color': '#22c55e',
        '--error-color': '#dc2626',
        '--warning-color': '#eab308'
    },
    'arctic-white': {
        name: 'Arctic White',
        description: 'Clean light theme with blue accents',
        category: 'light',
        '--primary-color': '#2563eb',
        '--primary-dark': '#1d4ed8',
        '--primary-darker': '#1e40af',
        '--primary-rgb': '37, 99, 235',
        '--background-dark': '#ffffff',
        '--background-light': '#f8fafc',
        '--background-card': '#f1f5f9',
        '--border-color': '#e2e8f0',
        '--hover-color': '#e2e8f0',
        '--background-content': '#f8fafc',
        '--text-primary': '#0f172a',
        '--text-secondary': '#475569',
        '--success-color': '#059669',
        '--error-color': '#dc2626',
        '--warning-color': '#d97706'
    },
    'custom': {}
};


export const commandRegistry = [];
export let activeCommandIndex = -1;
export function setActiveCommandIndex(index) {
    activeCommandIndex = index;
}
