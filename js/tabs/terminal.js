/**
 * WinTool - Terminal Tab
 * Handles terminal command execution and output
 */

let currentShell = 'powershell';

function initTerminalTab() {
    console.log('Initializing terminal tab');
    setupCommandButtons();
    setupShellTabs();
    setupOutputActions();
}

function setupShellTabs() {
    const tabs = document.querySelectorAll('.terminal-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentShell = tab.dataset.shell;
        });
    });
}

function setupCommandButtons() {
    const buttons = document.querySelectorAll('.command-btn');
    buttons.forEach(button => {
        button.addEventListener('click', async () => {
            const cmd = button.dataset.cmd;
            
            // Visual feedback
            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), 200);
            
            // Update output
            const output = document.getElementById('terminal-output');
            output.textContent = 'Executing command...';
            
            try {
                const result = await window.electronAPI.executeCommand(cmd, currentShell);
                output.textContent = result || 'Command executed successfully (no output)';
            } catch (error) {
                output.textContent = `Error: ${error.message}`;
                showNotification(error.message, { type: 'error' });
            }
        });
    });
}

function setupOutputActions() {
    const copyBtn = document.getElementById('copy-output');
    const clearBtn = document.getElementById('clear-output');
    const output = document.getElementById('terminal-output');
    
    copyBtn?.addEventListener('click', () => {
        navigator.clipboard.writeText(output.textContent)
            .then(() => showNotification('Output copied to clipboard', { type: 'success' }))
            .catch(err => showNotification('Failed to copy output', { type: 'error' }));
    });
    
    clearBtn?.addEventListener('click', () => {
        output.textContent = 'Terminal output will appear here...';
    });
}

// Export initialization function
window.initTerminalTab = initTerminalTab;
