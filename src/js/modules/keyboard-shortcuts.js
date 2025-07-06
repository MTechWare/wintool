import { DEFAULT_SHORTCUTS, currentShortcuts, setCurrentShortcuts } from './state.js';
import { closeModal } from './modals.js';
import { showSettings } from './settings.js';
import { showCommandPalette, showHelpModal } from './command-palette.js';
import { refreshCurrentTab, refreshSystemInformation } from './tabs.js';


export function initGlobalKeyboardShortcuts() {
    
    loadCustomShortcuts();

    document.addEventListener('keydown', (e) => {
        
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            
            if (matchesShortcut(e, currentShortcuts['close-modal'])) {
                const openModal = document.querySelector('.modal[style*="flex"]');
                if (openModal) {
                    e.preventDefault();
                    closeModal(openModal.id);
                }
            }
            return;
        }

        
        if (matchesShortcut(e, currentShortcuts['show-help'])) {
            e.preventDefault();
            showHelpModal();
        } else if (matchesShortcut(e, currentShortcuts['command-palette'])) {
            e.preventDefault();
            showCommandPalette();
        } else if (matchesShortcut(e, currentShortcuts['focus-search'])) {
            e.preventDefault();
            const searchInput = document.getElementById('tab-search');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        } else if (matchesShortcut(e, currentShortcuts['refresh-tab'])) {
            e.preventDefault();
            refreshCurrentTab();
        } else if (matchesShortcut(e, currentShortcuts['open-settings'])) {
            e.preventDefault();
            showSettings();
        } else if (matchesShortcut(e, currentShortcuts['refresh-system'])) {
            e.preventDefault();
            refreshSystemInformation();
        } else if (matchesShortcut(e, currentShortcuts['close-modal'])) {
            const openModal = document.querySelector('.modal[style*="flex"]');
            if (openModal) {
                e.preventDefault();
                closeModal(openModal.id);
            }
        }
    });
}


function matchesShortcut(event, shortcutString) {
    if (!shortcutString) return false;

    const parts = shortcutString.split('+').map(part => part.trim());
    const key = parts[parts.length - 1].toLowerCase();
    const modifiers = parts.slice(0, -1).map(mod => mod.toLowerCase());

    
    const eventKey = event.key.toLowerCase();
    if (eventKey !== key.toLowerCase() && event.code.toLowerCase() !== key.toLowerCase()) {
        return false;
    }

    
    const hasCtrl = modifiers.includes('ctrl');
    const hasAlt = modifiers.includes('alt');
    const hasShift = modifiers.includes('shift');
    const hasMeta = modifiers.includes('meta') || modifiers.includes('cmd');

    return event.ctrlKey === hasCtrl &&
           event.altKey === hasAlt &&
           event.shiftKey === hasShift &&
           event.metaKey === hasMeta;
}


export async function loadCustomShortcuts() {
    try {
        if (window.electronAPI) {
            const savedShortcuts = await window.electronAPI.getSetting('keyboardShortcuts', DEFAULT_SHORTCUTS);
            setCurrentShortcuts({ ...DEFAULT_SHORTCUTS, ...savedShortcuts });
        }
    } catch (error) {
        console.error('Error loading custom shortcuts:', error);
        setCurrentShortcuts({ ...DEFAULT_SHORTCUTS });
    }
}


export async function loadKeyboardShortcutsSettings() {
    try {
        if (window.electronAPI) {
            const savedShortcuts = await window.electronAPI.getSetting('keyboardShortcuts', DEFAULT_SHORTCUTS);

            
            Object.keys(DEFAULT_SHORTCUTS).forEach(key => {
                const input = document.getElementById(`shortcut-${key}`);
                if (input) {
                    input.value = savedShortcuts[key] || DEFAULT_SHORTCUTS[key];
                }
            });

            
            initShortcutInputs();
        }
    } catch (error) {
        console.error('Error loading keyboard shortcuts settings:', error);
    }
}


function initShortcutInputs() {
    Object.keys(DEFAULT_SHORTCUTS).forEach(key => {
        const input = document.getElementById(`shortcut-${key}`);
        if (input) {
            input.addEventListener('focus', () => startRecordingShortcut(input, key));
            input.addEventListener('blur', () => stopRecordingShortcut(input));
        }
    });
}


function startRecordingShortcut(input, shortcutKey) {
    input.classList.add('recording');
    input.value = 'Press keys...';

    const recordKeydown = (e) => {
        e.preventDefault();
        e.stopPropagation();

        
        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Meta');

        
        let key = e.key;
        if (key === ' ') key = 'Space';
        else if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
            return; 
        }

        parts.push(key);
        const shortcutString = parts.join('+');

        
        const conflict = checkShortcutConflict(shortcutString, shortcutKey);
        if (conflict) {
            input.classList.add('shortcut-conflict');
            input.value = `${shortcutString} (conflicts with ${conflict})`;
        } else {
            input.classList.remove('shortcut-conflict');
            input.value = shortcutString;
        }

        
        document.removeEventListener('keydown', recordKeydown, true);
        input.classList.remove('recording');
    };

    document.addEventListener('keydown', recordKeydown, true);
}


function stopRecordingShortcut(input) {
    input.classList.remove('recording');
    if (input.value === 'Press keys...') {
        
        const shortcutKey = input.id.replace('shortcut-', '');
        input.value = currentShortcuts[shortcutKey] || DEFAULT_SHORTCUTS[shortcutKey];
    }
}


function checkShortcutConflict(shortcutString, excludeKey) {
    for (const [key, value] of Object.entries(currentShortcuts)) {
        if (key !== excludeKey && value === shortcutString) {
            return key.replace('-', ' ');
        }
    }
    return null;
}


export async function saveKeyboardShortcuts() {
    try {
        if (window.electronAPI) {
            const shortcuts = {};

            Object.keys(DEFAULT_SHORTCUTS).forEach(key => {
                const input = document.getElementById(`shortcut-${key}`);
                if (input && input.value && !input.classList.contains('shortcut-conflict')) {
                    shortcuts[key] = input.value;
                }
            });

            await window.electronAPI.setSetting('keyboardShortcuts', shortcuts);
            setCurrentShortcuts({ ...DEFAULT_SHORTCUTS, ...shortcuts });

            console.log('Keyboard shortcuts saved:', shortcuts);
        }
    } catch (error) {
        console.error('Error saving keyboard shortcuts:', error);
    }
}


export function resetShortcut(shortcutKey) {
    const input = document.getElementById(`shortcut-${shortcutKey}`);
    if (input) {
        input.value = DEFAULT_SHORTCUTS[shortcutKey];
        input.classList.remove('shortcut-conflict');
    }
}


export function resetAllShortcuts() {
    if (confirm('Are you sure you want to reset all keyboard shortcuts to their defaults?')) {
        Object.keys(DEFAULT_SHORTCUTS).forEach(key => {
            resetShortcut(key);
        });
    }
}


export async function exportShortcuts() {
    try {
        const shortcuts = {};
        Object.keys(DEFAULT_SHORTCUTS).forEach(key => {
            const input = document.getElementById(`shortcut-${key}`);
            if (input) {
                shortcuts[key] = input.value;
            }
        });

        const dataStr = JSON.stringify(shortcuts, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'wintool-shortcuts.json';
        link.click();

        console.log('Shortcuts exported successfully');
    } catch (error) {
        console.error('Error exporting shortcuts:', error);
    }
}


export function importShortcuts() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const shortcuts = JSON.parse(e.target.result);

                    
                    Object.keys(DEFAULT_SHORTCUTS).forEach(key => {
                        if (shortcuts[key]) {
                            const input = document.getElementById(`shortcut-${key}`);
                            if (input) {
                                input.value = shortcuts[key];
                            }
                        }
                    });

                    console.log('Shortcuts imported successfully');
                } catch (error) {
                    console.error('Error importing shortcuts:', error);
                    alert('Error importing shortcuts: Invalid file format');
                }
            };
            reader.readAsText(file);
        }
    };

    input.click();
}
