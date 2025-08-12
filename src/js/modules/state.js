/**
 * Tab System State Management Module
 *
 * This module manages the global state for the tab system including:
 * - Current active tab tracking
 * - Tab registry and metadata storage
 * - Hidden tabs management
 * - TabLoader instance reference
 * - Event management for tab changes
 * - UI state like rainbow animations
 *
 * The state management follows a centralized pattern where all tab-related
 * state is managed through this module, providing a single source of truth
 * for the tab system's current state.
 */

/**
 * Current active tab identifier
 * Tracks which tab is currently being displayed to the user
 * @type {string}
 */
export let currentTab = 'welcome';

/**
 * Set the current active tab and dispatch change event
 *
 * Updates the global current tab state and notifies all listeners
 * of the tab change through the custom event system. This enables
 * other parts of the application to react to tab changes.
 *
 * @param {string} tabId - The identifier of the tab to set as current
 * @returns {void}
 */
export function setCurrentTab(tabId) {
    currentTab = tabId;
    // Dispatch custom event to notify listeners of tab change
    window.tabEventManager.dispatchEvent(new CustomEvent('tabChanged', { detail: { tabId } }));
}

/**
 * Registry of all available tabs
 * Stores tab metadata including name, icon, and content
 * @type {Map<string, Object>}
 */
export let tabs = new Map();

/**
 * Array of hidden tab identifiers
 * Tracks which tabs should not be visible in the UI
 * @type {string[]}
 */
export let hiddenTabs = [];

/**
 * Update the list of hidden tabs
 *
 * @param {string[]} newHiddenTabs - Array of tab IDs to hide
 * @returns {void}
 */
export function setHiddenTabs(newHiddenTabs) {
    hiddenTabs = newHiddenTabs;
}

/**
 * Reference to the TabLoader instance
 * Provides access to the tab loading system from other modules
 * @type {TabLoader|null}
 */
export let tabLoader = null;

/**
 * Set the TabLoader instance reference
 *
 * @param {TabLoader} newTabLoader - The TabLoader instance to store
 * @returns {void}
 */
export function setTabLoader(newTabLoader) {
    tabLoader = newTabLoader;
}

/**
 * Animation ID for rainbow mode
 * Tracks the current rainbow animation for proper cleanup
 * @type {number|null}
 */
export let rainbowAnimationId = null;

/**
 * Set the rainbow animation ID
 *
 * @param {number|null} id - The animation ID to store
 * @returns {void}
 */
export function setRainbowAnimationId(id) {
    rainbowAnimationId = id;
}

/**
 * Global event manager for tab system events
 * Provides a centralized event system for tab-related communications
 * @type {EventTarget}
 */
window.tabEventManager = new EventTarget();

export const DEFAULT_TAB_ORDER = [
    'system-info', // 1. Start with system overview
    'system-health', // 2. Check system health status
    'tweaks', // 3. Apply system optimizations
    'cleanup', // 4. Clean up system files
    'services', // 5. Manage system services
    'packages', // 6. Install/manage software
    'appx-packages', // 7. Manage Windows Store apps
    'networking', // 8. Network configuration/monitoring
    'environment-variables', // 9. System configuration
    'system-utilities', // 10. Access Windows tools
    'event-viewer', // 11. Troubleshooting and logs
    'script-editor', // 12. Advanced scripting
    'windows-unattend', // 13. Advanced deployment
    'about', // 14. Always last
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
        name: 'Classic Dark',
        description: 'Deep black theme with orange accents',
        icon: 'fas fa-moon',
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
    },
    'modern-gray': {
        name: 'Modern Gray',
        description: 'Sleek gray theme with warm accents',
        icon: 'fas fa-desktop',
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
    },
    'ocean-blue': {
        name: 'Ocean Blue',
        description: 'Cool blue theme inspired by the ocean',
        icon: 'fas fa-water',
        category: 'blue',
        '--primary-color': '#2196f3',
        '--primary-dark': '#1976d2',
        '--primary-darker': '#1565c0',
        '--primary-rgb': '33, 150, 243',
        '--background-dark': '#0d1421',
        '--background-light': '#1a2332',
        '--background-card': '#253244',
        '--border-color': '#334155',
        '--hover-color': '#3f4f5f',
        '--background-content': '#1a2332',
    },
    'forest-green': {
        name: 'Forest Green',
        description: 'Natural green theme with earthy tones',
        icon: 'fas fa-leaf',
        category: 'green',
        '--primary-color': '#43a047',
        '--primary-dark': '#388e3c',
        '--primary-darker': '#2e7d32',
        '--primary-rgb': '67, 160, 71',
        '--background-dark': '#0f1b0f',
        '--background-light': '#1a2e1a',
        '--background-card': '#254025',
        '--border-color': '#335533',
        '--hover-color': '#2f4f2f',
        '--background-content': '#1a2e1a',
    },
    'royal-purple': {
        name: 'Royal Purple',
        description: 'Elegant purple theme with luxury feel',
        icon: 'fas fa-crown',
        category: 'purple',
        '--primary-color': '#9c27b0',
        '--primary-dark': '#7b1fa2',
        '--primary-darker': '#6a1b9a',
        '--primary-rgb': '156, 39, 176',
        '--background-dark': '#1a0f1b',
        '--background-light': '#2e1a2f',
        '--background-card': '#402540',
        '--border-color': '#553355',
        '--hover-color': '#4f2f4f',
        '--background-content': '#2e1a2f',
    },
    'crimson-red': {
        name: 'Crimson Red',
        description: 'Bold red theme with high energy',
        icon: 'fas fa-fire',
        category: 'red',
        '--primary-color': '#f44336',
        '--primary-dark': '#d32f2f',
        '--primary-darker': '#c62828',
        '--primary-rgb': '244, 67, 54',
        '--background-dark': '#1b0f0f',
        '--background-light': '#2f1a1a',
        '--background-card': '#402525',
        '--border-color': '#553333',
        '--hover-color': '#4f2f2f',
        '--background-content': '#2f1a1a',
    },
    'teal-mint': {
        name: 'Teal Mint',
        description: 'Fresh teal theme with mint accents',
        icon: 'fas fa-spa',
        category: 'teal',
        '--primary-color': '#009688',
        '--primary-dark': '#00796b',
        '--primary-darker': '#00695c',
        '--primary-rgb': '0, 150, 136',
        '--background-dark': '#0f1b1a',
        '--background-light': '#1a2e2c',
        '--background-card': '#25403e',
        '--border-color': '#335550',
        '--hover-color': '#2f4f4c',
        '--background-content': '#1a2e2c',
    },
    'sunset-orange': {
        name: 'Sunset Orange',
        description: 'Warm orange theme like a beautiful sunset',
        icon: 'fas fa-sun',
        category: 'orange',
        '--primary-color': '#ff9800',
        '--primary-dark': '#f57c00',
        '--primary-darker': '#ef6c00',
        '--primary-rgb': '255, 152, 0',
        '--background-dark': '#1b1509',
        '--background-light': '#2f2a1a',
        '--background-card': '#403e25',
        '--border-color': '#555533',
        '--hover-color': '#4f4d2f',
        '--background-content': '#2f2a1a',
    },
    'midnight-blue': {
        name: 'Midnight Blue',
        description: 'Deep blue theme for late night work',
        icon: 'fas fa-moon',
        category: 'blue',
        '--primary-color': '#3f51b5',
        '--primary-dark': '#303f9f',
        '--primary-darker': '#283593',
        '--primary-rgb': '63, 81, 181',
        '--background-dark': '#0f1019',
        '--background-light': '#1a1d2e',
        '--background-card': '#252a40',
        '--border-color': '#333855',
        '--hover-color': '#2f354f',
        '--background-content': '#1a1d2e',
    },
    custom: {},
};

export const commandRegistry = [];
export let activeCommandIndex = -1;
export function setActiveCommandIndex(index) {
    activeCommandIndex = index;
}
