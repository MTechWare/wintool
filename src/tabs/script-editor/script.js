// Simple Script Editor
console.log('=== SCRIPT EDITOR JAVASCRIPT FILE LOADING ===');

// Global variables for script editor
let currentFile = null;
let isModified = false;
let settings = {
    fontSize: 14,
    tabSize: 4,
    wordWrap: false,
    autoSave: true
};

// Load settings from localStorage
function loadSettings() {
    try {
        const saved = localStorage.getItem('scriptEditor.settings');
        if (saved) {
            settings = { ...settings, ...JSON.parse(saved) };
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save settings to localStorage
function saveSettings() {
    try {
        localStorage.setItem('scriptEditor.settings', JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Apply settings to the editor
function applySettings(container) {
    const editor = container.querySelector('#code-editor');
    if (editor) {
        editor.style.fontSize = `${settings.fontSize}px`;
        editor.style.whiteSpace = settings.wordWrap ? 'pre-wrap' : 'pre';
        editor.style.tabSize = settings.tabSize;
    }

    // Update settings modal inputs
    const fontSizeInput = container.querySelector('#font-size-input');
    const tabSizeInput = container.querySelector('#tab-size-input');
    const wordWrapCheckbox = container.querySelector('#word-wrap-checkbox');
    const autoSaveCheckbox = container.querySelector('#auto-save-checkbox');

    if (fontSizeInput) fontSizeInput.value = settings.fontSize;
    if (tabSizeInput) tabSizeInput.value = settings.tabSize;
    if (wordWrapCheckbox) wordWrapCheckbox.checked = settings.wordWrap;
    if (autoSaveCheckbox) autoSaveCheckbox.checked = settings.autoSave;
}

// New file function
function newFile(container) {
    if (isModified && !confirm('You have unsaved changes. Are you sure you want to create a new file?')) {
        return;
    }

    const editor = container.querySelector('#code-editor');
    if (editor) {
        editor.value = '';
    }

    currentFile = null;
    isModified = false;
    updateFileInfo(container);
    addToOutput(container, 'New file created.');
}

// Open file function
async function openFile(container) {
    try {
        if (window.electronAPI && window.electronAPI.openFile) {
            const result = await window.electronAPI.openFile();
            if (result && result.content !== undefined) {
                const editor = container.querySelector('#code-editor');
                if (editor) {
                    editor.value = result.content;
                }
                currentFile = result.filePath;
                isModified = false;
                updateFileInfo(container);
                addToOutput(container, `File opened: ${result.filePath}`);
            }
        } else {
            // Fallback for browser mode
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.js,.py,.ps1,.bat,.html,.css,.json,.xml,.md,.txt';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const editor = container.querySelector('#code-editor');
                        if (editor) {
                            editor.value = e.target.result;
                        }
                        currentFile = file.name;
                        isModified = false;
                        updateFileInfo(container);
                        addToOutput(container, `File opened: ${file.name}`);
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        }
    } catch (error) {
        console.error('Error opening file:', error);
        addToOutput(container, `Error opening file: ${error.message}`);
    }
}

// Save file function
async function saveFile(container) {
    const editor = container.querySelector('#code-editor');
    if (!editor) return;

    const content = editor.value;

    try {
        if (window.electronAPI && window.electronAPI.saveFile) {
            const result = await window.electronAPI.saveFile(currentFile, content);
            if (result && result.filePath) {
                currentFile = result.filePath;
                isModified = false;
                updateFileInfo(container);
                addToOutput(container, `File saved: ${result.filePath}`);
            }
        } else {
            // Fallback for browser mode - download file
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentFile || 'script.txt';
            a.click();
            URL.revokeObjectURL(url);
            addToOutput(container, `File downloaded: ${currentFile || 'script.txt'}`);
        }
    } catch (error) {
        console.error('Error saving file:', error);
        addToOutput(container, `Error saving file: ${error.message}`);
    }
}

// Run script function
async function runScript(container) {
    const editor = container.querySelector('#code-editor');
    const languageSelect = container.querySelector('#language-select');

    if (!editor || !languageSelect) return;

    const content = editor.value.trim();
    const language = languageSelect.value;

    if (!content) {
        addToOutput(container, 'No code to run.');
        return;
    }

    addToOutput(container, `Running ${language} script...`);

    try {
        if (window.electronAPI && window.electronAPI.runScript) {
            const result = await window.electronAPI.runScript(content, language);
            addToOutput(container, result.output || 'Script completed.');
            if (result.error) {
                addToOutput(container, `Error: ${result.error}`);
            }
        } else {
            // Browser mode - limited execution
            if (language === 'javascript') {
                try {
                    const result = eval(content);
                    addToOutput(container, `Result: ${result}`);
                } catch (error) {
                    addToOutput(container, `JavaScript Error: ${error.message}`);
                }
            } else {
                addToOutput(container, 'Script execution not available in browser mode.');
            }
        }
    } catch (error) {
        console.error('Error running script:', error);
        addToOutput(container, `Error: ${error.message}`);
    }
}

// Clear output function
function clearOutput(container) {
    const output = container.querySelector('#script-output');
    if (output) {
        output.textContent = 'Ready to run scripts...';
    }
}

// Add message to output
function addToOutput(container, message) {
    const output = container.querySelector('#script-output');
    if (output) {
        const timestamp = new Date().toLocaleTimeString();
        const currentText = output.textContent;
        if (currentText === 'Ready to run scripts...') {
            output.textContent = `[${timestamp}] ${message}`;
        } else {
            output.textContent += `\n[${timestamp}] ${message}`;
        }
        output.scrollTop = output.scrollHeight;
    }
}

// Handle content change
function onContentChange(container) {
    if (!isModified) {
        isModified = true;
        updateFileInfo(container);
    }
}

// Update file info display
function updateFileInfo(container) {
    const fileNameElement = container.querySelector('#current-file-name');
    const modifiedElement = container.querySelector('#file-modified');

    if (fileNameElement) {
        fileNameElement.textContent = currentFile || 'Untitled';
    }

    if (modifiedElement) {
        modifiedElement.style.display = isModified ? 'inline' : 'none';
    }
}

// Show settings modal
function showSettings(container) {
    const modal = container.querySelector('#editor-settings-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Hide settings modal
function hideSettings(container) {
    const modal = container.querySelector('#editor-settings-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Setup event listeners for the script editor
function setupEventListeners(container) {
    console.log('Setting up event listeners for script editor...');
    console.log('Container:', container);

    // File operations
    const newBtn = container.querySelector('#new-file-btn');
    const openBtn = container.querySelector('#open-file-btn');
    const saveBtn = container.querySelector('#save-file-btn');

    console.log('Found buttons:', { newBtn, openBtn, saveBtn });

    if (newBtn) {
        newBtn.addEventListener('click', () => {
            console.log('New file button clicked!');
            newFile(container);
        });
    }
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            console.log('Open file button clicked!');
            openFile(container);
        });
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            console.log('Save file button clicked!');
            saveFile(container);
        });
    }

    // Run script
    const runBtn = container.querySelector('#run-btn');
    console.log('Found run button:', runBtn);
    if (runBtn) {
        runBtn.addEventListener('click', () => {
            console.log('Run button clicked!');
            runScript(container);
        });
    }

    // Clear output
    const clearBtn = container.querySelector('#clear-output-btn');
    console.log('Found clear button:', clearBtn);
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            console.log('Clear output button clicked!');
            clearOutput(container);
        });
    }

    // Settings
    const settingsBtn = container.querySelector('#editor-settings-btn');
    console.log('Found settings button:', settingsBtn);
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            console.log('Settings button clicked!');
            showSettings(container);
        });
    }

    // Modal close
    const modalClose = container.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => hideSettings(container));
    }

    // Editor content change
    const editor = container.querySelector('#code-editor');
    if (editor) {
        editor.addEventListener('input', () => onContentChange(container));
    }

    // Settings inputs
    const fontSizeInput = container.querySelector('#font-size-input');
    if (fontSizeInput) {
        fontSizeInput.addEventListener('change', (e) => {
            settings.fontSize = parseInt(e.target.value);
            applySettings(container);
            saveSettings();
        });
    }

    const tabSizeInput = container.querySelector('#tab-size-input');
    if (tabSizeInput) {
        tabSizeInput.addEventListener('change', (e) => {
            settings.tabSize = parseInt(e.target.value);
            applySettings(container);
            saveSettings();
        });
    }

    const wordWrapCheckbox = container.querySelector('#word-wrap-checkbox');
    if (wordWrapCheckbox) {
        wordWrapCheckbox.addEventListener('change', (e) => {
            settings.wordWrap = e.target.checked;
            applySettings(container);
            saveSettings();
        });
    }

    const autoSaveCheckbox = container.querySelector('#auto-save-checkbox');
    if (autoSaveCheckbox) {
        autoSaveCheckbox.addEventListener('change', (e) => {
            settings.autoSave = e.target.checked;
            saveSettings();
        });
    }
}

// Initialize script editor
function initializeScriptEditor(container) {
    console.log('Initializing Script Editor with container:', container);

    // Load settings
    loadSettings();

    // Apply settings
    applySettings(container);

    // Setup event listeners
    setupEventListeners(container);

    console.log('Script Editor initialized successfully');

    // Signal that this tab is ready
    if (window.markTabAsReady && typeof tabId !== 'undefined') {
        console.log('Marking script-editor tab as ready');
        window.markTabAsReady(tabId);
    }
}

// Main initialization
console.log('Script Editor tab initializing...');

if (tabContainer) {
    console.log('Using provided tabContainer:', tabContainer);
    initializeScriptEditor(tabContainer);
} else {
    console.error('No container found for script editor tab, cannot initialize.');
}