let editorInstance;

function initEditorTab() {
    console.log('Initializing Editor tab with CodeMirror...');
    
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer.CodeMirror) {
        // Already initialized
        return;
    }

    editorInstance = CodeMirror.fromTextArea(editorContainer, {
        lineNumbers: true,
        mode: 'powershell',
        theme: 'dracula',
        autofocus: true
    });

    setupEditorEventListeners();
    
    if (window.markTabAsReady) {
        window.markTabAsReady(tabId);
    }
}

function setupEditorEventListeners() {
    const resizeHandle = document.getElementById('resize-handle');
    if (resizeHandle) {
        resizeHandle.addEventListener('mousedown', initResize, false);
    }

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', (event) => {
            const selectedTheme = event.target.value;
            if (editorInstance) {
                editorInstance.setOption('theme', selectedTheme);
            }
        });
    }
}

let startY;
let startHeight;

function initResize(e) {
    startY = e.clientY;
    const outputContainer = document.querySelector('.output-container');
    startHeight = parseInt(document.defaultView.getComputedStyle(outputContainer).height, 10);
    window.addEventListener('mousemove', resize, false);
    window.addEventListener('mouseup', stopResize, false);
    document.body.classList.add('resizing');
}

function resize(e) {
    const outputContainer = document.querySelector('.output-container');
    const newHeight = startHeight - (e.clientY - startY);
    if (newHeight > 40) { // Minimum height
        outputContainer.style.height = newHeight + 'px';
    }
}

function stopResize(e) {
    window.removeEventListener('mousemove', resize, false);
    window.removeEventListener('mouseup', stopResize, false);
    document.body.classList.remove('resizing');
}

async function runScript() {
    const shellSelect = document.getElementById('shell-select');
    const outputEl = document.getElementById('output');

    const script = editorInstance.getValue();
    const shell = shellSelect.value;
    outputEl.textContent = 'Executing...';

    try {
        const result = await window.electronAPI.executeScript(script, shell);
        let output = '';
        if (result.stdout) {
            output += `STDOUT:\n${result.stdout}\n`;
        }
        if (result.stderr) {
            output += `STDERR:\n${result.stderr}\n`;
        }
        outputEl.textContent = output;
    } catch (error) {
        outputEl.textContent = `Error: ${error.message}`;
    }
}

function clearEditor() {
    editorInstance.setValue('');
    const outputEl = document.getElementById('output');
    outputEl.textContent = '';
}

async function openScriptFile() {
    const outputEl = document.getElementById('output');
    try {
        const result = await window.electronAPI.openFileDialog();
        if (result && result.filePath) {
            editorInstance.setValue(result.content);
            const extension = result.filePath.split('.').pop();
            let language = 'powershell';
            switch (extension) {
                case 'bat':
                case 'cmd':
                    language = 'shell';
                    break;
                case 'sh':
                    language = 'shell';
                    break;
                case 'js':
                    language = 'javascript';
                    break;
            }
            editorInstance.setOption('mode', language);
        }
    } catch (error) {
        outputEl.textContent = `Error: ${error.message}`;
    }
}

async function saveScriptFile() {
    const outputEl = document.getElementById('output');
    try {
        const result = await window.electronAPI.showSaveDialog({
            title: 'Save Script',
            defaultPath: 'script.ps1',
            filters: [
                { name: 'PowerShell Scripts', extensions: ['ps1'] },
                { name: 'Batch Scripts', extensions: ['bat', 'cmd'] },
                { name: 'Shell Scripts', extensions: ['sh'] },
                { name: 'JavaScript Files', extensions: ['js'] },
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (!result.canceled && result.filePath) {
            await window.electronAPI.writeFile(result.filePath, editorInstance.getValue());
            outputEl.textContent = `File saved to: ${result.filePath}`;
        }
    } catch (error) {
        outputEl.textContent = `Error: ${error.message}`;
    }
}

function zoomIn() {
    const cm = document.querySelector('.CodeMirror');
    let fontSize = window.getComputedStyle(cm, null).getPropertyValue('font-size');
    fontSize = parseFloat(fontSize);
    cm.style.fontSize = (fontSize + 1) + 'px';
    editorInstance.refresh();
}

function zoomOut() {
    const cm = document.querySelector('.CodeMirror');
    let fontSize = window.getComputedStyle(cm, null).getPropertyValue('font-size');
    fontSize = parseFloat(fontSize);
    cm.style.fontSize = (fontSize - 1) + 'px';
    editorInstance.refresh();
}

window.runScript = runScript;
window.clearEditor = clearEditor;
window.openScriptFile = openScriptFile;
window.saveScriptFile = saveScriptFile;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;

// Initialize when the script is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditorTab);
} else {
    initEditorTab();
}