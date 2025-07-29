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
    custom: {},
};

export const commandRegistry = [];
export let activeCommandIndex = -1;
export function setActiveCommandIndex(index) {
    activeCommandIndex = index;
}
