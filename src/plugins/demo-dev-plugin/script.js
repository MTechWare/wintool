/**
 * Demo Development Plugin - Enhanced Script
 * Showcasing WinTool plugin capabilities and best practices
 */

console.log('=== Demo Development Plugin JavaScript loaded! ===');

// Plugin state management
let pluginState = {
    clickCount: 0,
    inputCount: 0,
    operationsCount: 0,
    sessionStartTime: Date.now(),
    activityLog: []
};

// Find the container (similar to how other tabs do it)
let container = null;
if (typeof tabContainer !== 'undefined') {
    container = tabContainer;
    console.log('Using provided tabContainer');
}
if (!container) {
    container = document.querySelector('[data-tab="demo-dev-plugin"]');
    console.log('Found container via data-tab selector');
}

if (container) {
    console.log('Container found, initializing plugin');
    initializePlugin(container);
} else {
    console.error('No container found for demo-dev-plugin, cannot initialize.');
}

function initializePlugin(container) {
    console.log('Initializing Demo Development Plugin...');

    // Initialize UI elements
    initializeElements(container);

    // Start session timer
    startSessionTimer(container);

    // Initialize activity log
    initializeActivityLog(container);

    // Log initialization
    logActivity('Plugin initialized successfully');

    // Signal that this tab is ready
    if (window.markTabAsReady && typeof tabId !== 'undefined') {
        console.log('Marking tab as ready:', tabId);
        window.markTabAsReady(tabId);
    } else {
        console.warn('window.markTabAsReady not available or tabId undefined');
    }
}

function initializeElements(container) {
    // Header action buttons
    const refreshBtn = container.querySelector('#refresh-demo-btn');
    const exportBtn = container.querySelector('#export-demo-btn');
    const settingsBtn = container.querySelector('#settings-demo-btn');

    // Text processing elements
    const textInput = container.querySelector('#text-input');
    const processBtn = container.querySelector('#process-btn');
    const clearBtn = container.querySelector('#clear-btn');
    const copyBtn = container.querySelector('#copy-btn');

    // Processing options
    const uppercaseOption = container.querySelector('#uppercase-option');
    const reverseOption = container.querySelector('#reverse-option');
    const wordCountOption = container.querySelector('#word-count-option');

    // Activity log
    const clearLogBtn = container.querySelector('#clear-log-btn');

    // Add event listeners
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            pluginState.clickCount++;
            updateStats(container);
            refreshDemoData(container);
            logActivity('Demo data refreshed');
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            pluginState.clickCount++;
            updateStats(container);
            exportDemoResults(container);
            logActivity('Demo results exported');
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            pluginState.clickCount++;
            updateStats(container);
            showDemoSettings(container);
            logActivity('Settings opened');
        });
    }

    if (textInput) {
        textInput.addEventListener('input', () => {
            pluginState.inputCount++;
            updateStats(container);
        });
    }

    if (processBtn) {
        processBtn.addEventListener('click', () => {
            pluginState.clickCount++;
            pluginState.operationsCount++;
            updateStats(container);
            processText(container);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            pluginState.clickCount++;
            updateStats(container);
            clearTextProcessing(container);
            logActivity('Text processing cleared');
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            pluginState.clickCount++;
            updateStats(container);
            copyResults(container);
        });
    }

    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', () => {
            pluginState.clickCount++;
            updateStats(container);
            clearActivityLog(container);
        });
    }
}


function processText(container) {
    const textInput = container.querySelector('#text-input');
    const uppercaseOption = container.querySelector('#uppercase-option');
    const reverseOption = container.querySelector('#reverse-option');
    const wordCountOption = container.querySelector('#word-count-option');
    const processBtn = container.querySelector('#process-btn');
    const copyBtn = container.querySelector('#copy-btn');

    if (!textInput) return;

    const inputText = textInput.value.trim();
    if (!inputText) {
        showNotification('Please enter some text to process', 'warning');
        return;
    }

    const startTime = performance.now();

    try {
        processBtn.disabled = true;
        processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        let processedText = inputText;

        // Apply transformations
        if (uppercaseOption && uppercaseOption.checked) {
            processedText = processedText.toUpperCase();
        }

        if (reverseOption && reverseOption.checked) {
            processedText = processedText.split('').reverse().join('');
        }

        // Calculate analysis
        const analysis = {
            characters: inputText.length,
            words: inputText.split(/\s+/).filter(word => word.length > 0).length,
            lines: inputText.split('\n').length,
            processTime: Math.round(performance.now() - startTime)
        };

        // Display results
        displayProcessingResults(container, processedText, analysis);

        // Show copy button
        if (copyBtn) {
            copyBtn.style.display = 'inline-flex';
        }

        logActivity(`Text processed: ${analysis.characters} chars, ${analysis.words} words`);
        showNotification('Text processed successfully!', 'success');

    } catch (error) {
        console.error('Text processing failed:', error);
        showNotification('Text processing failed: ' + error.message, 'error');
        logActivity('Text processing failed: ' + error.message);
    } finally {
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fas fa-cogs"></i> Process Text';
    }
}

function displayProcessingResults(container, processedText, analysis) {
    const resultsSection = container.querySelector('#results-section');
    const processedTextDiv = container.querySelector('#processed-text');
    const charCount = container.querySelector('#char-count');
    const wordCount = container.querySelector('#word-count');
    const lineCount = container.querySelector('#line-count');
    const processTime = container.querySelector('#process-time');

    if (processedTextDiv) {
        processedTextDiv.textContent = processedText;
    }

    if (charCount) charCount.textContent = analysis.characters;
    if (wordCount) wordCount.textContent = analysis.words;
    if (lineCount) lineCount.textContent = analysis.lines;
    if (processTime) processTime.textContent = analysis.processTime + 'ms';

    if (resultsSection) {
        resultsSection.style.display = 'block';
    }
}

function clearTextProcessing(container) {
    const textInput = container.querySelector('#text-input');
    const resultsSection = container.querySelector('#results-section');
    const copyBtn = container.querySelector('#copy-btn');

    if (textInput) textInput.value = '';
    if (resultsSection) resultsSection.style.display = 'none';
    if (copyBtn) copyBtn.style.display = 'none';
}

function copyResults(container) {
    const processedText = container.querySelector('#processed-text');
    if (processedText && processedText.textContent) {
        navigator.clipboard.writeText(processedText.textContent).then(() => {
            showNotification('Results copied to clipboard!', 'success');
            logActivity('Results copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy:', err);
            showNotification('Failed to copy to clipboard', 'error');
        });
    }
}

// Feature showcase functions (called from HTML onclick)
window.showNotificationDemo = function() {
    pluginState.clickCount++;
    updateStats(container);

    const notifications = [
        { message: 'This is an info notification', type: 'info' },
        { message: 'Success! Operation completed', type: 'success' },
        { message: 'Warning: Please check your input', type: 'warning' },
        { message: 'Error: Something went wrong', type: 'error' }
    ];

    const randomNotification = notifications[Math.floor(Math.random() * notifications.length)];
    showNotification(randomNotification.message, randomNotification.type);
    logActivity(`Notification demo: ${randomNotification.type}`);
};

window.showStorageDemo = function() {
    pluginState.clickCount++;
    updateStats(container);

    const demoData = {
        timestamp: new Date().toISOString(),
        sessionData: pluginState,
        randomValue: Math.floor(Math.random() * 1000)
    };

    // Store data using WinTool API or localStorage
    if (window.wintoolAPI && window.wintoolAPI.storage) {
        window.wintoolAPI.storage.set('demo-plugin-data', demoData);
        showNotification('Data stored using WinTool API', 'success');
    } else {
        localStorage.setItem('demo-plugin-data', JSON.stringify(demoData));
        showNotification('Data stored in localStorage', 'info');
    }

    logActivity('Storage demo executed');
};

window.showThemeDemo = function() {
    pluginState.clickCount++;
    updateStats(container);

    const isDark = document.body.classList.contains('dark-theme');
    showNotification(`Current theme: ${isDark ? 'Dark' : 'Light'} mode`, 'info');
    logActivity('Theme demo executed');
};

window.showAPIDemo = function() {
    pluginState.clickCount++;
    updateStats(container);

    if (window.wintoolAPI) {
        const apiInfo = Object.keys(window.wintoolAPI);
        showNotification(`WinTool API available: ${apiInfo.join(', ')}`, 'success');
        logActivity('API demo executed - API available');
    } else {
        showNotification('WinTool API not available in this context', 'warning');
        logActivity('API demo executed - API not available');
    }
};

// Utility functions
function updateStats(container) {
    const clickCountEl = container.querySelector('#click-count');
    const inputCountEl = container.querySelector('#input-count');
    const operationsCountEl = container.querySelector('#operations-count');

    if (clickCountEl) clickCountEl.textContent = pluginState.clickCount;
    if (inputCountEl) inputCountEl.textContent = pluginState.inputCount;
    if (operationsCountEl) operationsCountEl.textContent = pluginState.operationsCount;
}

function startSessionTimer(container) {
    const sessionTimeEl = container.querySelector('#session-time');

    if (sessionTimeEl) {
        setInterval(() => {
            const elapsed = Date.now() - pluginState.sessionStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            sessionTimeEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
}

function refreshDemoData(container) {
    // Reset some stats
    pluginState.operationsCount = 0;
    updateStats(container);

    // Clear results
    clearTextProcessing(container);

    showNotification('Demo data refreshed', 'success');
}

function exportDemoResults(container) {
    const exportData = {
        sessionStats: pluginState,
        timestamp: new Date().toISOString(),
        activityLog: pluginState.activityLog.slice(-10) // Last 10 entries
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `demo-plugin-export-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showNotification('Demo results exported', 'success');
}

function showDemoSettings(container) {
    const settings = {
        autoRefresh: false,
        notifications: true,
        darkMode: document.body.classList.contains('dark-theme')
    };

    showNotification(`Settings: ${JSON.stringify(settings)}`, 'info');
}

// Activity log functions
function initializeActivityLog(container) {
    const logTimeEl = container.querySelector('.log-entry.welcome .log-time');
    if (logTimeEl) {
        logTimeEl.textContent = formatTime(new Date());
    }
    updateLogCount(container);
}

function logActivity(message) {
    const timestamp = new Date();
    const logEntry = {
        time: timestamp,
        message: message
    };

    pluginState.activityLog.push(logEntry);

    // Keep only last 50 entries
    if (pluginState.activityLog.length > 50) {
        pluginState.activityLog = pluginState.activityLog.slice(-50);
    }

    addLogEntryToDOM(logEntry);
    updateLogCount(container);
}

function addLogEntryToDOM(logEntry) {
    const activityLog = container.querySelector('#activity-log');
    if (!activityLog) return;

    const logElement = document.createElement('div');
    logElement.className = 'log-entry';
    logElement.innerHTML = `
        <span class="log-time">${formatTime(logEntry.time)}</span>
        <span class="log-message">${logEntry.message}</span>
    `;

    activityLog.appendChild(logElement);

    // Auto-scroll to bottom
    activityLog.scrollTop = activityLog.scrollHeight;
}

function clearActivityLog(container) {
    pluginState.activityLog = [];
    const activityLog = container.querySelector('#activity-log');

    if (activityLog) {
        // Keep only the welcome message
        const welcomeEntry = activityLog.querySelector('.log-entry.welcome');
        activityLog.innerHTML = '';
        if (welcomeEntry) {
            activityLog.appendChild(welcomeEntry);
        }
    }

    updateLogCount(container);
    logActivity('Activity log cleared');
}

function updateLogCount(container) {
    const logCount = container.querySelector('.log-count');
    if (logCount) {
        const count = pluginState.activityLog.length;
        logCount.textContent = `${count} ${count === 1 ? 'entry' : 'entries'}`;
    }
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showNotification(message, type = 'info') {
    if (window.wintoolAPI && window.wintoolAPI.notifications) {
        window.wintoolAPI.notifications.show(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Fallback: show in activity log
        logActivity(`${type.toUpperCase()}: ${message}`);
    }
}

// Plugin cleanup
window.addEventListener('beforeunload', function() {
    console.log('Demo Development Plugin unloading');
    logActivity('Plugin session ended');
});