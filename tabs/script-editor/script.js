let currentFile = null;
let isModified = false;
let textEditor = null;
let settings = {
    fontSize: 14,
    tabSize: 4,
    wordWrap: false,
    autoSave: true,
    theme: 'dark',
    language: 'javascript',
};

function loadSettings() {
    try {
        const saved = localStorage.getItem('scriptEditor.settings');
        if (saved) {
            settings = { ...settings, ...JSON.parse(saved) };
        }
    } catch (error) {
        // Settings loading failed, use defaults
    }
}

function saveSettings() {
    try {
        localStorage.setItem('scriptEditor.settings', JSON.stringify(settings));
    } catch (error) {
        // Settings saving failed
    }
}

function initializeTextEditor(container) {
    console.log('initializeTextEditor called'); // Debug log
    const editorElement = container.querySelector('#code-editor');
    console.log('Editor element found:', !!editorElement); // Debug log

    if (!editorElement || textEditor) {
        console.log('Editor element not found or already initialized'); // Debug log
        return;
    }

    // Create a styled textarea that matches the app theme
    console.log('Creating themed text editor'); // Debug log
    const textarea = document.createElement('textarea');
    textarea.className = 'themed-text-editor';
    textarea.id = 'script-textarea';
    textarea.value = '// Start typing your code here...\n';

    // Apply comprehensive styling
    Object.assign(textarea.style, {
        width: '100%',
        height: '400px',
        minHeight: '300px',
        fontFamily: 'Consolas, "Courier New", Monaco, monospace',
        fontSize: settings.fontSize + 'px',
        lineHeight: '1.5',
        padding: '15px',
        border: '1px solid #444',
        borderRadius: '8px',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        outline: 'none',
        resize: 'vertical',
        tabSize: settings.tabSize,
        whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre',
        overflowWrap: settings.wordWrap ? 'break-word' : 'normal',
        scrollbarWidth: 'thin',
        scrollbarColor: '#555 #2d2d2d'
    });

    // Add focus and blur effects
    textarea.addEventListener('focus', () => {
        textarea.style.borderColor = '#007acc';
        textarea.style.boxShadow = '0 0 0 2px rgba(0, 122, 204, 0.2)';
    });

    textarea.addEventListener('blur', () => {
        textarea.style.borderColor = '#444';
        textarea.style.boxShadow = 'none';
    });

    // Handle tab key for proper indentation
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const spaces = ' '.repeat(settings.tabSize);

            textarea.value = textarea.value.substring(0, start) + spaces + textarea.value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + settings.tabSize;
        }
    });

    // Set up change listener
    textarea.addEventListener('input', () => onContentChange(container));

    // Clear the editor element and add our textarea
    editorElement.innerHTML = '';
    editorElement.appendChild(textarea);

    textEditor = textarea;
    console.log('Text editor created successfully:', !!textEditor); // Debug log
}

// Simple language detection for syntax highlighting hints (visual only)
function getLanguageDisplayName(language) {
    const nameMap = {
        javascript: 'JavaScript',
        python: 'Python',
        powershell: 'PowerShell',
        shell: 'Shell Script',
        batch: 'Batch File',
        html: 'HTML',
        css: 'CSS',
        json: 'JSON',
        xml: 'XML',
        markdown: 'Markdown',
        text: 'Plain Text',
    };
    return nameMap[language] || 'Plain Text';
}

// Update language display in the UI
function updateLanguageDisplay(container) {
    // This could be used to show the current language in the UI
    // For now, it's just a placeholder for future enhancements
    console.log('Current language:', getLanguageDisplayName(settings.language));
}

// Detect language from file extension
function detectLanguageFromExtension(extension) {
    const extensionMap = {
        js: 'javascript',
        py: 'python',
        ps1: 'powershell',
        sh: 'shell',
        bash: 'shell',
        sql: 'sql',
        html: 'html',
        htm: 'html',
        css: 'css',
        json: 'json',
        xml: 'xml',
        yaml: 'yaml',
        yml: 'yaml',
        md: 'markdown',
        txt: 'text',
    };
    return extensionMap[extension] || 'text';
}

// Apply settings to the editor
function applySettings(container) {
    if (textEditor) {
        textEditor.style.fontSize = settings.fontSize + 'px';
        textEditor.style.tabSize = settings.tabSize;
        textEditor.style.whiteSpace = settings.wordWrap ? 'pre-wrap' : 'pre';
        textEditor.style.overflowWrap = settings.wordWrap ? 'break-word' : 'normal';

        // Apply theme
        if (settings.theme === 'light') {
            textEditor.style.backgroundColor = '#ffffff';
            textEditor.style.color = '#333333';
            textEditor.style.borderColor = '#cccccc';
        } else {
            textEditor.style.backgroundColor = '#1e1e1e';
            textEditor.style.color = '#d4d4d4';
            textEditor.style.borderColor = '#444444';
        }
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

// Get editor content
function getEditorContent(container) {
    if (textEditor) {
        return textEditor.value;
    }
    // Fallback - try to find any textarea in the editor
    const textarea = container.querySelector('#script-textarea') || container.querySelector('textarea');
    return textarea ? textarea.value : '';
}

// Set editor content
function setEditorContent(container, content) {
    console.log('setEditorContent called with content length:', content ? content.length : 'null/undefined'); // Debug log
    console.log('textEditor exists:', !!textEditor); // Debug log
    if (textEditor) {
        console.log('Setting text editor content'); // Debug log
        textEditor.value = content;
    } else {
        console.log('Using fallback textarea'); // Debug log
        // Fallback - try to find any textarea in the editor
        const textarea = container.querySelector('#script-textarea') || container.querySelector('textarea');
        console.log('Textarea found:', !!textarea); // Debug log
        if (textarea) textarea.value = content;
    }
}

// New file function
function newFile(container) {
    if (
        isModified &&
        !confirm('You have unsaved changes. Are you sure you want to create a new file?')
    ) {
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
        if (window.electronAPI && window.electronAPI.openFileDialog) {
            const result = await window.electronAPI.openFileDialog();
            console.log('Open file result:', result); // Debug log
            if (result && result.content !== undefined) {
                console.log('Setting editor content:', result.content.substring(0, 100) + '...'); // Debug log
                // Set the content in the text editor
                setEditorContent(container, result.content);

                // Auto-detect language from file extension
                const extension = result.filePath.split('.').pop().toLowerCase();
                const language = detectLanguageFromExtension(extension);
                if (language) {
                    settings.language = language;
                    const languageSelect = container.querySelector('#language-select');
                    if (languageSelect) languageSelect.value = language;
                    // Update the language display
                    updateLanguageDisplay(container);
                }

                currentFile = result.filePath;
                isModified = false;
                updateFileInfo(container);
                addToOutput(container, `File opened: ${result.filePath}`);
            } else {
                console.log('No file selected or file content is undefined'); // Debug log
                addToOutput(container, 'No file selected.');
            }
        } else {
            // Fallback for browser mode
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.js,.py,.ps1,.bat,.html,.css,.json,.xml,.md,.txt';
            input.onchange = e => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = e => {
                        // Set the content in the text editor
                        setEditorContent(container, e.target.result);

                        // Auto-detect language from file extension
                        const extension = file.name.split('.').pop().toLowerCase();
                        const language = detectLanguageFromExtension(extension);
                        if (language) {
                            settings.language = language;
                            const languageSelect = container.querySelector('#language-select');
                            if (languageSelect) languageSelect.value = language;
                            updateLanguageDisplay(container);
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
        addToOutput(container, `Error opening file: ${error.message}`);
    }
}

// Save file function
async function saveFile(container) {
    const content = getEditorContent(container);
    if (!content && content !== '') return;

    try {
        if (window.electronAPI && window.electronAPI.saveFile) {
            const options = {
                title: 'Save Script File',
                defaultPath: currentFile || 'script.js',
                filters: [
                    { name: 'Scripts', extensions: ['ps1', 'bat', 'cmd', 'sh', 'js'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            };
            const result = await window.electronAPI.saveFile(content, options);
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
        addToOutput(container, `Error saving file: ${error.message}`);
    }
}

// Run script function
async function runScript(container) {
    const languageSelect = container.querySelector('#language-select');

    if (!languageSelect) return;

    const content = getEditorContent(container).trim();
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
                    // JavaScript execution not supported for security reasons
                    addToOutput(container, 'JavaScript execution is disabled for security reasons.');
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
            addToOutput(
                container,
                'Script execution not available in browser mode.'
            );
        }
    } catch (error) {
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

/**
 * Setup event listeners for the script editor
 *
 * This function demonstrates the comprehensive event handler setup pattern
 * for complex interactive components. It registers handlers for all user
 * interactions in the script editor interface.
 *
 * User Interactions Handled:
 * 1. File Operations - New, Open, Save file actions
 * 2. Script Execution - Run script with output capture
 * 3. Theme Selection - Dynamic theme switching
 * 4. Settings Management - Auto-save and editor preferences
 * 5. Language Selection - Syntax highlighting mode changes
 *
 * Business Logic:
 * The script editor provides a full-featured code editing environment
 * with syntax highlighting, file management, and script execution
 * capabilities. Each interaction is designed to provide immediate
 * feedback and maintain user workflow continuity.
 *
 * @param {HTMLElement} container - The container element for the script editor
 * @returns {void}
 */
function setupEventListeners(container) {
    // Remove any existing event listeners first to prevent duplicates
    if (container.scriptEditorClickHandler) {
        document.removeEventListener('click', container.scriptEditorClickHandler, { capture: true });
    }

    // Create a bound click handler for the Script Editor
    container.scriptEditorClickHandler = function(e) {
        console.log('Script editor click handler triggered', e.target); // Debug log
        const target = e.target.closest('button');
        console.log('Button target found:', target, target ? target.id : 'none'); // Debug log
        if (!target) return;

        // Only handle Script Editor buttons within this container
        if (!container.contains(target)) {
            console.log('Button not within container, ignoring'); // Debug log
            return;
        }

        // Prevent default and stop propagation immediately
        e.preventDefault();
        e.stopPropagation();

        const id = target.id;
        console.log('Handling button click for:', id); // Debug log

        switch(id) {
            case 'new-file-btn':
                console.log('Calling newFile'); // Debug log
                newFile(container);
                break;
            case 'open-file-btn':
                console.log('Calling openFile'); // Debug log
                openFile(container);
                break;
            case 'save-file-btn':
                console.log('Calling saveFile'); // Debug log
                saveFile(container);
                break;
            case 'run-btn':
                console.log('Calling runScript'); // Debug log
                runScript(container);
                break;
            case 'clear-output-btn':
                console.log('Calling clearOutput'); // Debug log
                clearOutput(container);
                break;
            case 'editor-settings-btn':
                console.log('Calling showSettings'); // Debug log
                showSettings(container);
                break;
            default:
                console.log('Unknown button ID:', id); // Debug log
        }

        // Handle modal close
        if (target.classList.contains('modal-close')) {
            hideSettings(container);
        }
    };

    // Add the event listener
    document.addEventListener('click', container.scriptEditorClickHandler, { capture: true });

    // Handle form controls separately to prevent duplicates
    const formControls = [
        { selector: '#language-select', event: 'change', handler: (e) => {
            settings.language = e.target.value;
            updateLanguageDisplay(container);
            saveSettings();
        }},
        { selector: '#theme-select', event: 'change', handler: (e) => {
            settings.theme = e.target.value;
            applySettings(container);
            saveSettings();
        }},
        { selector: '#font-size-input', event: 'change', handler: (e) => {
            settings.fontSize = parseInt(e.target.value);
            applySettings(container);
            saveSettings();
        }},
        { selector: '#tab-size-input', event: 'change', handler: (e) => {
            settings.tabSize = parseInt(e.target.value);
            applySettings(container);
            saveSettings();
        }},
        { selector: '#word-wrap-checkbox', event: 'change', handler: (e) => {
            settings.wordWrap = e.target.checked;
            applySettings(container);
            saveSettings();
        }},
        { selector: '#auto-save-checkbox', event: 'change', handler: (e) => {
            settings.autoSave = e.target.checked;
            saveSettings();
        }}
    ];

    // Remove existing form control listeners and add new ones
    formControls.forEach(({ selector, event, handler }) => {
        const element = container.querySelector(selector);
        if (element) {
            // Remove existing listener if it exists
            if (element.scriptEditorHandler) {
                element.removeEventListener(event, element.scriptEditorHandler);
            }
            // Add new listener and store reference
            element.scriptEditorHandler = handler;
            element.addEventListener(event, handler);
        }
    });
}

function initializeScriptEditor(container) {
    loadSettings();
    initializeTextEditor(container);
    applySettings(container);
    setupEventListeners(container);

    if (window.markTabAsReady) {
        window.markTabAsReady('script-editor');
    }
}

// Main initialization
if (tabContainer) {
    initializeScriptEditor(tabContainer);
} else {
    // Fallback: wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.folder-tab-container[data-tab="script-editor"]');
        if (container) {
            initializeScriptEditor(container);
        }
    });
}
