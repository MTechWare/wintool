// CodeMirror Script Editor
console.log('=== SCRIPT EDITOR JAVASCRIPT FILE LOADING ===');

// Global variables for script editor
let currentFile = null;
let isModified = false;
let codeMirrorEditor = null;
let settings = {
    fontSize: 14,
    tabSize: 4,
    wordWrap: false,
    autoSave: true,
    theme: 'vs-dark',
    language: 'javascript'
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

// Initialize CodeMirror editor
function initializeCodeMirror(container) {
    const editorElement = container.querySelector('#code-editor');
    if (!editorElement || codeMirrorEditor) {
        console.log('CodeMirror init skipped - element not found or already initialized');
        return; // Already initialized or element not found
    }

    console.log('Initializing CodeMirror editor...');
    console.log('CodeMirror available:', typeof CodeMirror !== 'undefined');

    if (typeof CodeMirror === 'undefined') {
        console.error('CodeMirror is not available! Falling back to textarea.');
        // Create a fallback textarea
        const textarea = document.createElement('textarea');
        textarea.className = 'code-editor-fallback';
        textarea.style.width = '100%';
        textarea.style.height = '400px';
        textarea.style.fontFamily = 'Consolas, Monaco, monospace';
        textarea.style.fontSize = '14px';
        textarea.placeholder = 'Start typing your code here...';
        editorElement.appendChild(textarea);

        // Set up change listener for fallback
        textarea.addEventListener('input', () => onContentChange(container));
        return;
    }

    // Create CodeMirror instance
    codeMirrorEditor = CodeMirror(editorElement, {
        value: '// Start typing your code here...\n',
        mode: getCodeMirrorMode(settings.language),
        theme: settings.theme,
        lineNumbers: true,
        lineWrapping: settings.wordWrap,
        indentUnit: settings.tabSize,
        tabSize: settings.tabSize,
        autoCloseBrackets: true,
        matchBrackets: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        extraKeys: {
            "Ctrl-Space": "autocomplete",
            "F11": function(cm) {
                cm.setOption("fullScreen", !cm.getOption("fullScreen"));
            },
            "Esc": function(cm) {
                if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
            }
        }
    });

    // Set up change listener
    codeMirrorEditor.on('change', () => {
        onContentChange(container);
    });

    console.log('CodeMirror editor initialized successfully');
}

// Get CodeMirror mode for language
function getCodeMirrorMode(language) {
    const modeMap = {
        'javascript': 'javascript',
        'python': 'python',
        'powershell': 'powershell',
        'shell': 'shell',
        'sql': 'sql',
        'html': 'htmlmixed',
        'css': 'css',
        'json': { name: 'javascript', json: true },
        'xml': 'xml',
        'yaml': 'yaml',
        'markdown': 'markdown',
        'text': 'text/plain'
    };
    return modeMap[language] || 'text/plain';
}

// Detect language from file extension
function detectLanguageFromExtension(extension) {
    const extensionMap = {
        'js': 'javascript',
        'py': 'python',
        'ps1': 'powershell',
        'sh': 'shell',
        'bash': 'shell',
        'sql': 'sql',
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yaml',
        'yml': 'yaml',
        'md': 'markdown',
        'txt': 'text'
    };
    return extensionMap[extension] || 'text';
}

// Apply settings to the editor
function applySettings(container) {
    if (codeMirrorEditor) {
        codeMirrorEditor.setOption('theme', settings.theme);
        codeMirrorEditor.setOption('mode', getCodeMirrorMode(settings.language));
        codeMirrorEditor.setOption('lineWrapping', settings.wordWrap);
        codeMirrorEditor.setOption('indentUnit', settings.tabSize);
        codeMirrorEditor.setOption('tabSize', settings.tabSize);
        codeMirrorEditor.refresh();
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

    // Update language and theme selectors
    const languageSelect = container.querySelector('#language-select');
    const themeSelect = container.querySelector('#theme-select');
    if (languageSelect) languageSelect.value = settings.language;
    if (themeSelect) themeSelect.value = settings.theme;
}

// Get editor content (CodeMirror or fallback)
function getEditorContent(container) {
    if (codeMirrorEditor) {
        return codeMirrorEditor.getValue();
    }
    // Fallback to textarea
    const textarea = container.querySelector('.code-editor-fallback');
    return textarea ? textarea.value : '';
}

// Set editor content (CodeMirror or fallback)
function setEditorContent(container, content) {
    if (codeMirrorEditor) {
        codeMirrorEditor.setValue(content);
    } else {
        // Fallback to textarea
        const textarea = container.querySelector('.code-editor-fallback');
        if (textarea) textarea.value = content;
    }
}

// New file function
function newFile(container) {
    if (isModified && !confirm('You have unsaved changes. Are you sure you want to create a new file?')) {
        return;
    }

    setEditorContent(container, '');

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
                if (codeMirrorEditor) {
                    codeMirrorEditor.setValue(result.content);
                    // Auto-detect language from file extension
                    const extension = result.filePath.split('.').pop().toLowerCase();
                    const language = detectLanguageFromExtension(extension);
                    if (language) {
                        settings.language = language;
                        codeMirrorEditor.setOption('mode', getCodeMirrorMode(language));
                        const languageSelect = container.querySelector('#language-select');
                        if (languageSelect) languageSelect.value = language;
                    }
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
                        if (codeMirrorEditor) {
                            codeMirrorEditor.setValue(e.target.result);
                            // Auto-detect language from file extension
                            const extension = file.name.split('.').pop().toLowerCase();
                            const language = detectLanguageFromExtension(extension);
                            if (language) {
                                settings.language = language;
                                codeMirrorEditor.setOption('mode', getCodeMirrorMode(language));
                                const languageSelect = container.querySelector('#language-select');
                                if (languageSelect) languageSelect.value = language;
                            }
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
    if (!codeMirrorEditor) return;

    const content = codeMirrorEditor.getValue();

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
    const languageSelect = container.querySelector('#language-select');

    if (!codeMirrorEditor || !languageSelect) return;

    const content = codeMirrorEditor.getValue().trim();
    const language = languageSelect.value;

    if (!content) {
        addToOutput(container, 'No code to run.');
        return;
    }

    addToOutput(container, `Running ${language} script...`);

    try {
        if (window.electronAPI) {
            let result;

            // Map languages to appropriate execution methods
            switch (language) {
                case 'powershell':
                    result = await window.electronAPI.executePowerShell(content);
                    addToOutput(container, 'PowerShell Output:');
                    addToOutput(container, result || 'Script completed successfully.');
                    break;

                case 'shell':
                case 'batch':
                    result = await window.electronAPI.executeCmd(content);
                    addToOutput(container, 'CMD Output:');
                    addToOutput(container, result || 'Script completed successfully.');
                    break;

                case 'javascript':
                    // For JavaScript, we can use eval in the renderer process
                    try {
                        const evalResult = eval(content);
                        addToOutput(container, 'JavaScript Output:');
                        addToOutput(container, `Result: ${evalResult}`);
                    } catch (error) {
                        addToOutput(container, `JavaScript Error: ${error.message}`);
                    }
                    break;

                case 'python':
                    // For Python, we need to execute it as a script file
                    result = await window.electronAPI.executeScript(content, 'python');
                    if (result.success) {
                        addToOutput(container, 'Python Output:');
                        addToOutput(container, result.stdout || 'Script completed successfully.');
                        if (result.stderr) {
                            addToOutput(container, `Errors: ${result.stderr}`);
                        }
                    } else {
                        addToOutput(container, `Python Error: ${result.stderr}`);
                    }
                    break;

                default:
                    // For other languages, try to execute as a generic script
                    result = await window.electronAPI.executeScript(content, language);
                    if (result.success) {
                        addToOutput(container, `${language.toUpperCase()} Output:`);
                        addToOutput(container, result.stdout || 'Script completed successfully.');
                        if (result.stderr) {
                            addToOutput(container, `Errors: ${result.stderr}`);
                        }
                    } else {
                        addToOutput(container, `${language.toUpperCase()} Error: ${result.stderr}`);
                    }
                    break;
            }
        } else {
            // Browser mode - limited execution
            if (language === 'javascript') {
                try {
                    const result = eval(content);
                    addToOutput(container, `JavaScript Result: ${result}`);
                } catch (error) {
                    addToOutput(container, `JavaScript Error: ${error.message}`);
                }
            } else {
                addToOutput(container, 'Script execution not available in browser mode. Only JavaScript can be executed.');
            }
        }
    } catch (error) {
        console.error('Error running script:', error);
        addToOutput(container, `Execution Error: ${error.message}`);
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

    // Language and theme selectors
    const languageSelect = container.querySelector('#language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            settings.language = e.target.value;
            if (codeMirrorEditor) {
                codeMirrorEditor.setOption('mode', getCodeMirrorMode(settings.language));
            }
            saveSettings();
        });
    }

    const themeSelect = container.querySelector('#theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            settings.theme = e.target.value;
            if (codeMirrorEditor) {
                codeMirrorEditor.setOption('theme', settings.theme);
            }
            saveSettings();
        });
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

    // Initialize CodeMirror editor
    initializeCodeMirror(container);

    // Apply settings
    applySettings(container);

    // Setup event listeners
    setupEventListeners(container);

    console.log('Script Editor initialized successfully');

    // Signal that this tab is ready
    if (window.markTabAsReady) {
        console.log('Marking script-editor tab as ready');
        window.markTabAsReady('script-editor');
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