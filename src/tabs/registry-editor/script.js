// Registry root keys - defined at top level to avoid initialization issues
const REGISTRY_ROOTS = {
    'HKEY_CLASSES_ROOT': 'HKCR',
    'HKEY_CURRENT_USER': 'HKCU',
    'HKEY_LOCAL_MACHINE': 'HKLM',
    'HKEY_USERS': 'HKU',
    'HKEY_CURRENT_CONFIG': 'HKCC'
};

// Environment detection
const isElectronEnvironment = () => {
    return typeof window !== 'undefined' && 
           window.electronAPI && 
           typeof window.electronAPI === 'object';
};

// Check if we're in a supported environment
const isRegistrySupported = () => {
    return isElectronEnvironment() && 
           window.electronAPI.getRegistrySubkeys &&
           window.electronAPI.getRegistryValues;
};

// Registry Editor State
let registryState = {
    currentPath: '',
    history: [],
    historyIndex: -1,
    selectedKey: null,
    recentChanges: []
};

// Initialize registry editor with error handling
(function initializeRegistryEditor() {
    try {
        const lazyHelper = new LazyLoadingHelper('registry-editor');
        if (!lazyHelper.shouldInitialize()) {
            lazyHelper.markTabReady();
            return;
        }

        lazyHelper.markScriptExecuted();
        let container = null;

        if (typeof tabContainer !== 'undefined') {
            container = tabContainer;
        }
        if (!container) {
            container = document.querySelector('[data-tab="registry-editor"]');
        }

        if (container) {
            setupRegistryEditor(container);
            loadRegistryTree(container);
        } else {
            throw new Error('No container found for registry editor tab');
        }
    } catch (error) {
        if (window.electronAPI && window.electronAPI.logError) {
            window.electronAPI.logError(
                `Failed to initialize registry editor: ${error.message}`,
                'RegistryEditorTab'
            );
        }
        console.error('Registry Editor initialization failed:', error);

        // Mark as ready even on failure to prevent hanging
        if (typeof LazyLoadingHelper !== 'undefined') {
            const lazyHelper = new LazyLoadingHelper('registry-editor');
            lazyHelper.markTabReady();
        }
    }
})();

function setupRegistryEditor(container) {
    try {
        // Setup navigation buttons
        setupNavigationButtons(container);

        // Setup search functionality
        setupSearchFunctionality(container);

        // Setup action buttons
        setupActionButtons(container);

        // Setup tree interaction
        setupTreeInteraction(container);

        // Setup values panel
        setupValuesPanel(container);

        if (window.electronAPI && window.electronAPI.logInfo) {
            window.electronAPI.logInfo('Registry editor initialized successfully', 'RegistryEditorTab');
        }
    } catch (error) {
        if (window.electronAPI && window.electronAPI.logError) {
            window.electronAPI.logError(
                `Error setting up registry editor: ${error.message}`,
                'RegistryEditorTab'
            );
        }
        console.error('Registry Editor setup error:', error);
    }
}

function setupNavigationButtons(container) {
    const backBtn = container.querySelector('#registry-back-btn');
    const forwardBtn = container.querySelector('#registry-forward-btn');
    const upBtn = container.querySelector('#registry-up-btn');
    const goBtn = container.querySelector('#registry-go-btn');
    const pathInput = container.querySelector('#registry-path-input');

    if (backBtn) {
        backBtn.addEventListener('click', () => navigateBack());
    }

    if (forwardBtn) {
        forwardBtn.addEventListener('click', () => navigateForward());
    }

    if (upBtn) {
        upBtn.addEventListener('click', () => navigateUp());
    }

    if (goBtn && pathInput) {
        goBtn.addEventListener('click', () => {
            const path = pathInput.value.trim();
            if (path) {
                navigateToPath(path);
            }
        });

        pathInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const path = pathInput.value.trim();
                if (path) {
                    navigateToPath(path);
                }
            }
        });
    }
}

function setupSearchFunctionality(container) {
    const searchInput = container.querySelector('#registry-search-input');
    const searchBtn = container.querySelector('#registry-search-btn');

    if (searchBtn && searchInput) {
        const performSearch = () => {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                performQuickSearch(searchTerm);
            }
        };

        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

function setupActionButtons(container) {
    const refreshBtn = container.querySelector('#refresh-registry-btn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => refreshRegistryView());
    }
}

function setupTreeInteraction(container) {
    const treeContainer = container.querySelector('#registry-tree');

    if (treeContainer) {
        treeContainer.addEventListener('click', (e) => {
            const keyElement = e.target.closest('.registry-key');
            if (keyElement) {
                const keyPath = keyElement.dataset.path;
                if (keyPath) {
                    selectRegistryKey(keyPath);
                }
            }

            const expandBtn = e.target.closest('.expand-btn');
            if (expandBtn) {
                e.stopPropagation();
                const keyElement = expandBtn.closest('.registry-key');
                if (keyElement) {
                    toggleKeyExpansion(keyElement);
                }
            }
        });
    }
}

function setupValuesPanel(container) {
    const addValueBtn = container.querySelector('#add-value-btn');
    const addKeyBtn = container.querySelector('#add-key-btn');
    const removeKeyBtn = container.querySelector('#remove-key-btn');
    const valuesList = container.querySelector('#registry-values-list');

    if (addValueBtn) {
        addValueBtn.addEventListener('click', () => openValueEditor());
    }

    if (addKeyBtn) {
        addKeyBtn.addEventListener('click', () => createNewKey());
    }

    if (removeKeyBtn) {
        removeKeyBtn.addEventListener('click', () => removeSelectedKey());
    }

    if (valuesList) {
        valuesList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-value-btn');
            if (editBtn) {
                const valueRow = editBtn.closest('.value-row');
                if (valueRow) {
                    editRegistryValue(valueRow);
                }
            }

            const deleteBtn = e.target.closest('.delete-value-btn');
            if (deleteBtn) {
                const valueRow = deleteBtn.closest('.value-row');
                if (valueRow) {
                    deleteRegistryValue(valueRow);
                }
            }
        });
    }
}

async function loadRegistryTree(container) {
    try {
        const treeContainer = container.querySelector('#registry-tree');
        if (!treeContainer) return;

        // Check if registry operations are supported
        if (!isRegistrySupported()) {
            treeContainer.innerHTML = `
                <div class="registry-loading">
                    <i class="fas fa-exclamation-triangle" style="color: #f39c12;"></i>
                    <span>Registry Editor requires the desktop version of WinTool</span>
                </div>
            `;
            
            // Mark tab as ready
            if (typeof LazyLoadingHelper !== 'undefined') {
                const lazyHelper = new LazyLoadingHelper('registry-editor');
                lazyHelper.markTabReady();
            }
            return;
        }

        treeContainer.innerHTML = '<div class="registry-loading"><i class="fas fa-spinner fa-spin"></i><span>Loading registry structure...</span></div>';

        // Load root keys
        const rootKeys = Object.keys(REGISTRY_ROOTS);
        let treeHTML = '';

        for (const rootKey of rootKeys) {
            treeHTML += `
                <div class="registry-key root-key" data-path="${rootKey}">
                    <div class="key-content">
                        <button class="expand-btn" title="Expand">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <i class="fas fa-folder key-icon"></i>
                        <span class="key-name">${rootKey}</span>
                    </div>
                    <div class="key-children" style="display: none;"></div>
                </div>
            `;
        }

        treeContainer.innerHTML = treeHTML;

        // Set initial path
        updatePathInput('');
        updateNavigationButtons();

        // Mark tab as ready
        if (typeof LazyLoadingHelper !== 'undefined') {
            const lazyHelper = new LazyLoadingHelper('registry-editor');
            lazyHelper.markTabReady();
        }
    } catch (error) {
        if (window.electronAPI && window.electronAPI.logError) {
            window.electronAPI.logError(
                `Error loading registry tree: ${error.message}`,
                'RegistryEditorTab'
            );
        }
        console.error('Registry tree loading error:', error);
        
        const treeContainer = container.querySelector('#registry-tree');
        if (treeContainer) {
            treeContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Failed to load registry structure</span>
                </div>
            `;
        }
        
        // Mark tab as ready even on error
        if (typeof LazyLoadingHelper !== 'undefined') {
            const lazyHelper = new LazyLoadingHelper('registry-editor');
            lazyHelper.markTabReady();
        }
    }
}

async function toggleKeyExpansion(keyElement) {
    try {
        const expandBtn = keyElement.querySelector('.expand-btn');
        const childrenContainer = keyElement.querySelector('.key-children');
        const keyPath = keyElement.dataset.path;

        if (!expandBtn || !childrenContainer) return;

        const isExpanded = childrenContainer.style.display !== 'none';

        if (isExpanded) {
            // Collapse
            childrenContainer.style.display = 'none';
            expandBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        } else {
            // Expand
            expandBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                const subKeys = await getRegistrySubKeys(keyPath);
                let childrenHTML = '';

                for (const subKey of subKeys) {
                    const fullPath = keyPath ? `${keyPath}\\${subKey}` : subKey;
                    childrenHTML += `
                        <div class="registry-key" data-path="${fullPath}">
                            <div class="key-content">
                                <button class="expand-btn" title="Expand">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                                <i class="fas fa-folder key-icon"></i>
                                <span class="key-name">${subKey}</span>
                            </div>
                            <div class="key-children" style="display: none;"></div>
                        </div>
                    `;
                }

                childrenContainer.innerHTML = childrenHTML;
                childrenContainer.style.display = 'block';
                expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
            } catch (error) {
                expandBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                if (window.electronAPI && window.electronAPI.logError) {
                    window.electronAPI.logError(
                        `Error expanding registry key ${keyPath}: ${error.message}`,
                        'RegistryEditorTab'
                    );
                }
                console.error('Registry key expansion error:', error);
                showNotification('Failed to load registry subkeys', 'error');
            }
        }
    } catch (error) {
        if (window.electronAPI && window.electronAPI.logError) {
            window.electronAPI.logError(
                `Error toggling key expansion: ${error.message}`,
                'RegistryEditorTab'
            );
        }
        console.error('Key expansion toggle error:', error);
    }
}

async function selectRegistryKey(keyPath) {
    try {
        registryState.selectedKey = keyPath;

        // Add to history
        if (registryState.history[registryState.historyIndex] !== keyPath) {
            registryState.history = registryState.history.slice(0, registryState.historyIndex + 1);
            registryState.history.push(keyPath);
            registryState.historyIndex = registryState.history.length - 1;
        }

        // Update UI
        updatePathInput(keyPath);
        updateNavigationButtons();

        // Load values for this key
        await loadRegistryValues(keyPath);

        // Highlight selected key in tree
        highlightSelectedKey(keyPath);

    } catch (error) {
        if (window.electronAPI && window.electronAPI.logError) {
            window.electronAPI.logError(
                `Error selecting registry key: ${error.message}`,
                'RegistryEditorTab'
            );
        }
        console.error('Registry key selection error:', error);
    }
}

async function loadRegistryValues(keyPath) {
    try {
        const valuesContainer = document.querySelector('#registry-values-list');
        if (!valuesContainer) return;

        // Check if registry operations are supported
        if (!isRegistrySupported()) {
            valuesContainer.innerHTML = `
                <div class="registry-loading">
                    <i class="fas fa-exclamation-triangle" style="color: #f39c12;"></i>
                    <span>Registry access requires desktop version</span>
                </div>
            `;
            return;
        }

        valuesContainer.innerHTML = '<div class="registry-loading"><i class="fas fa-spinner fa-spin"></i><span>Loading registry values...</span></div>';

        const values = await getRegistryValues(keyPath);
        let valuesHTML = '';

        if (values && values.length > 0) {
            for (const value of values) {
                valuesHTML += `
                    <div class="value-row" data-name="${value.name}" data-type="${value.type}">
                        <div class="value-column name-column">
                            <i class="fas fa-tag value-icon"></i>
                            <span class="value-name">${value.name || '(Default)'}</span>
                        </div>
                        <div class="value-column type-column">
                            <span class="value-type">${value.type}</span>
                        </div>
                        <div class="value-column data-column">
                            <span class="value-data" title="${value.data}">${truncateText(value.data, 50)}</span>
                        </div>
                        <div class="value-column actions-column">
                            <button class="btn btn-small edit-value-btn" title="Edit Value">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-small btn-danger delete-value-btn" title="Delete Value">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }
        } else {
            valuesHTML = '<div class="no-values">No values found in this registry key</div>';
        }

        valuesContainer.innerHTML = valuesHTML;
    } catch (error) {
        const valuesContainer = document.querySelector('#registry-values-list');
        if (valuesContainer) {
            if (error.message.includes('Electron environment')) {
                valuesContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Registry access requires desktop version</span>
                    </div>
                `;
            } else {
                valuesContainer.innerHTML = '<div class="error-message">Error loading registry values: ' + error.message + '</div>';
            }
        }
        if (window.electronAPI && window.electronAPI.logError) {
            window.electronAPI.logError(
                `Error loading registry values: ${error.message}`,
                'RegistryEditorTab'
            );
        }
        console.error('Registry values loading error:', error);
        
        if (!error.message.includes('Electron environment')) {
            showNotification('Failed to load registry values: ' + error.message, 'error');
        }
    }
}

// Registry operations using Electron IPC
async function getRegistrySubKeys(keyPath) {
    try {
        if (!isRegistrySupported()) {
            throw new Error('Registry operations require Electron environment');
        }

        return await window.electronAPI.getRegistrySubkeys(keyPath);
    } catch (error) {
        if (window.electronAPI && window.electronAPI.logError) {
            window.electronAPI.logError(`Error getting registry subkeys: ${error.message}`, 'RegistryEditorTab');
        }
        console.error('Get registry subkeys error:', error);
        throw error;
    }
}

async function getRegistryValues(keyPath) {
    try {
        if (!isRegistrySupported()) {
            throw new Error('Registry operations require Electron environment');
        }

        return await window.electronAPI.getRegistryValues(keyPath);
    } catch (error) {
        if (window.electronAPI && window.electronAPI.logError) {
            window.electronAPI.logError(`Error getting registry values: ${error.message}`, 'RegistryEditorTab');
        }
        console.error('Get registry values error:', error);
        return [];
    }
}

// Navigation functions
function navigateBack() {
    if (registryState.historyIndex > 0) {
        registryState.historyIndex--;
        const path = registryState.history[registryState.historyIndex];
        selectRegistryKey(path);
    }
}

function navigateForward() {
    if (registryState.historyIndex < registryState.history.length - 1) {
        registryState.historyIndex++;
        const path = registryState.history[registryState.historyIndex];
        selectRegistryKey(path);
    }
}

function navigateUp() {
    if (registryState.selectedKey) {
        const pathParts = registryState.selectedKey.split('\\');
        if (pathParts.length > 1) {
            pathParts.pop();
            const parentPath = pathParts.join('\\');
            selectRegistryKey(parentPath);
        }
    }
}

function navigateToPath(path) {
    selectRegistryKey(path);
}

// UI Helper functions
function updatePathInput(path) {
    const pathInput = document.querySelector('#registry-path-input');
    if (pathInput) {
        pathInput.value = path;
        registryState.currentPath = path;
    }
}

function updateNavigationButtons() {
    const backBtn = document.querySelector('#registry-back-btn');
    const forwardBtn = document.querySelector('#registry-forward-btn');
    const upBtn = document.querySelector('#registry-up-btn');

    if (backBtn) {
        backBtn.disabled = registryState.historyIndex <= 0;
    }

    if (forwardBtn) {
        forwardBtn.disabled = registryState.historyIndex >= registryState.history.length - 1;
    }

    if (upBtn) {
        const hasParent = registryState.selectedKey && registryState.selectedKey.includes('\\');
        upBtn.disabled = !hasParent;
    }
}

function highlightSelectedKey(keyPath) {
    // Remove previous selection
    const previousSelected = document.querySelector('.registry-key.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }

    // Highlight new selection
    const keyElement = document.querySelector(`[data-path="${keyPath}"]`);
    if (keyElement) {
        keyElement.classList.add('selected');
    }
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Registry Operations
function refreshRegistryView() {
    const container = document.querySelector('[data-tab="registry-editor"]');
    if (container) {
        loadRegistryTree(container);
        if (registryState.selectedKey) {
            loadRegistryValues(registryState.selectedKey);
        }
    }
}



// Search functions
function performQuickSearch(searchTerm) {
    // Open advanced search with the term pre-filled
    openAdvancedSearch(searchTerm);
}

function openAdvancedSearch(searchTerm = '') {
    const modal = document.querySelector('#registry-search-modal');
    const searchInput = document.querySelector('#search-term');

    if (modal && searchInput) {
        if (searchTerm) {
            searchInput.value = searchTerm;
        }
        modal.style.display = 'block';
    }
}

function closeRegistrySearchModal() {
    if (window.closeModal) {
        window.closeModal('registry-search-modal');
    } else {
        const modal = document.querySelector('#registry-search-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

async function performAdvancedSearch() {
    try {
        const searchTerm = document.querySelector('#search-term').value.trim();
        const searchKeys = document.querySelector('#search-keys').checked;
        const searchValues = document.querySelector('#search-values').checked;
        const searchData = document.querySelector('#search-data').checked;
        const searchRoot = document.querySelector('#search-root').value;
        const caseSensitive = document.querySelector('#search-case-sensitive').checked;
        const wholeWord = document.querySelector('#search-whole-word').checked;

        if (!searchTerm) {
            showNotification('Please enter a search term', 'warning');
            return;
        }

        closeRegistrySearchModal();

        // Show search results modal
        const resultsModal = document.querySelector('#registry-search-results-modal');
        const resultsContainer = document.querySelector('#search-results-list');
        const resultsCount = document.querySelector('#search-results-count');

        if (resultsModal && resultsContainer && resultsCount) {
            resultsModal.style.display = 'block';
            resultsContainer.innerHTML = '<div class="registry-loading"><i class="fas fa-spinner fa-spin"></i><span>Searching registry...</span></div>';
            resultsCount.textContent = 'Searching...';

            // Check if registry operations are supported
            if (!isRegistrySupported()) {
                showEnvironmentError('Registry search');
                closeRegistrySearchModal();
                return;
            }

            // Perform actual registry search
            try {
                const searchOptions = {
                    searchKeys,
                    searchValues,
                    searchData,
                    searchRoot,
                    caseSensitive,
                    wholeWord
                };

                const results = await window.electronAPI.searchRegistry(searchTerm, searchOptions);
                displaySearchResults(results);
            } catch (searchError) {
                if (window.electronAPI && window.electronAPI.logError) {
                    window.electronAPI.logError(`Registry search error: ${searchError.message}`, 'RegistryEditorTab');
                }
                console.error('Registry search error:', searchError);
                displaySearchResults([]);
                showNotification('Search failed', 'error');
            }
        }
    } catch (error) {
        if (window.electronAPI && window.electronAPI.logError) {
            window.electronAPI.logError(
                `Error performing advanced search: ${error.message}`,
                'RegistryEditorTab'
            );
        }
        console.error('Advanced search error:', error);
        showNotification('Search failed', 'error');
    }
}

function displaySearchResults(results) {
    const resultsContainer = document.querySelector('#search-results-list');
    const resultsCount = document.querySelector('#search-results-count');

    if (!resultsContainer || !resultsCount) return;

    resultsCount.textContent = `${results.length} result(s) found`;

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
        return;
    }

    let resultsHTML = '';
    for (const result of results) {
        resultsHTML += `
            <div class="search-result-item" onclick="navigateToSearchResult('${result.path}')">
                <div class="result-icon">
                    <i class="fas ${result.type === 'Key' ? 'fa-folder' : 'fa-tag'}"></i>
                </div>
                <div class="result-content">
                    <div class="result-path">${result.path}</div>
                    <div class="result-details">
                        ${result.type === 'Key' ? 'Registry Key' : `Value: ${result.name}`}
                        ${result.match ? ` - Match: "${result.match}"` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    resultsContainer.innerHTML = resultsHTML;
}

function navigateToSearchResult(path) {
    closeSearchResultsModal();
    selectRegistryKey(path);
}

function closeSearchResultsModal() {
    if (window.closeModal) {
        window.closeModal('registry-search-results-modal');
    } else {
        const modal = document.querySelector('#registry-search-results-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Value editing functions
function openValueEditor(valueName = '', valueType = 'REG_SZ', valueData = '') {
    const modal = document.querySelector('#registry-value-modal');
    const nameInput = document.querySelector('#registry-value-name');
    const typeSelect = document.querySelector('#registry-value-type');
    const dataTextarea = document.querySelector('#registry-value-data');
    const modalTitle = document.querySelector('#registry-value-modal-title');

    if (modal && nameInput && typeSelect && dataTextarea && modalTitle) {
        modalTitle.textContent = valueName ? 'Edit Registry Value' : 'Add Registry Value';
        nameInput.value = valueName;
        typeSelect.value = valueType;
        dataTextarea.value = valueData;
        modal.style.display = 'block';
    }
}

function closeRegistryValueModal() {
    if (window.closeModal) {
        window.closeModal('registry-value-modal');
    } else {
        const modal = document.querySelector('#registry-value-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

async function saveRegistryValue() {
    try {
        // Check if registry operations are supported
        if (!isRegistrySupported()) {
            showEnvironmentError('Registry value modification');
            closeRegistryValueModal();
            return;
        }

        const name = document.querySelector('#registry-value-name').value.trim();
        const type = document.querySelector('#registry-value-type').value;
        const data = document.querySelector('#registry-value-data').value;

        // Input validation
        if (!name) {
            showNotification('Please enter a value name', 'warning');
            return;
        }

        if (name.length > 255) {
            showNotification('Value name cannot exceed 255 characters', 'warning');
            return;
        }

        if (!registryState.selectedKey) {
            showNotification('Please select a registry key first', 'warning');
            return;
        }

        // Call the main process to save the registry value
        await window.electronAPI.setRegistryValue(registryState.selectedKey, name, data, type);
        showNotification('Registry value saved successfully', 'success');

        closeRegistryValueModal();

        // Refresh values list
        if (registryState.selectedKey) {
            loadRegistryValues(registryState.selectedKey);
        }

        // Add to recent changes
        registryState.recentChanges.unshift({
            action: 'setValue',
            path: registryState.selectedKey,
            name: name,
            type: type,
            data: data,
            timestamp: new Date()
        });

    } catch (error) {
        if (window.electronAPI && window.electronAPI.logError) {
            window.electronAPI.logError(
                `Error saving registry value: ${error.message}`,
                'RegistryEditorTab'
            );
        }
        console.error('Save registry value error:', error);
        showNotification('Failed to save registry value', 'error');
    }
}

function editRegistryValue(valueRow) {
    const name = valueRow.dataset.name;
    const type = valueRow.dataset.type;
    const dataElement = valueRow.querySelector('.value-data');
    const data = dataElement ? dataElement.textContent : '';

    openValueEditor(name, type, data);
}

async function deleteRegistryValue(valueRow) {
    // Check if registry operations are supported
    if (!isRegistrySupported()) {
        showEnvironmentError('Registry value deletion');
        return;
    }

    const name = valueRow.dataset.name;

    if (confirm(`Are you sure you want to delete the registry value "${name}"?`)) {
        try {
            if (!registryState.selectedKey) {
                showNotification('Please select a registry key first', 'warning');
                return;
            }

            // Call the main process to delete the registry value
            await window.electronAPI.deleteRegistryValue(registryState.selectedKey, name);
            showNotification('Registry value deleted successfully', 'success');

            // Refresh values list
            if (registryState.selectedKey) {
                loadRegistryValues(registryState.selectedKey);
            }

            // Add to recent changes
            registryState.recentChanges.unshift({
                action: 'deleteValue',
                path: registryState.selectedKey,
                name: name,
                timestamp: new Date()
            });

        } catch (error) {
            if (window.electronAPI && window.electronAPI.logError) {
                window.electronAPI.logError(
                    `Error deleting registry value: ${error.message}`,
                    'RegistryEditorTab'
                );
            }
            console.error('Delete registry value error:', error);
            showNotification('Failed to delete registry value', 'error');
        }
    }
}

async function removeSelectedKey() {
    try {
        if (!registryState.selectedKey) {
            showNotification('Please select a registry key to remove', 'warning');
            return;
        }

        // Check if registry operations are supported
        if (!isRegistrySupported()) {
            showEnvironmentError('Registry key removal');
            return;
        }

        // Prevent removal of root keys
        const rootKeys = Object.keys(REGISTRY_ROOTS);
        if (rootKeys.includes(registryState.selectedKey)) {
            showNotification('Cannot remove root registry keys', 'error');
            return;
        }

        const keyName = registryState.selectedKey.split('\\').pop();
        const confirmMessage = `Are you sure you want to delete the registry key "${keyName}" and all its subkeys and values?\n\nThis action cannot be undone and may cause system instability.`;

        if (confirm(confirmMessage)) {
            // Call the main process to delete the registry key
            await window.electronAPI.deleteRegistryKey(registryState.selectedKey);
            showNotification('Registry key removed successfully', 'success');

            // Navigate to parent key
            const pathParts = registryState.selectedKey.split('\\');
            if (pathParts.length > 1) {
                pathParts.pop();
                const parentPath = pathParts.join('\\');
                selectRegistryKey(parentPath);
            } else {
                // If no parent, refresh the tree
                refreshRegistryView();
            }

            // Add to recent changes
            registryState.recentChanges.unshift({
                action: 'deleteKey',
                path: registryState.selectedKey,
                timestamp: new Date()
            });
        }
    } catch (error) {
        if (window.electronAPI && window.electronAPI.logError) {
            window.electronAPI.logError(
                `Error removing registry key: ${error.message}`,
                'RegistryEditorTab'
            );
        }
        console.error('Remove registry key error:', error);
        showNotification('Failed to remove registry key: ' + error.message, 'error');
    }
}

async function createNewKey() {
    // Check if registry operations are supported
    if (!isRegistrySupported()) {
        showEnvironmentError('Registry key creation');
        return;
    }

    const keyName = await showSimpleInput('Enter the name for the new registry key:');
    if (keyName && keyName.trim()) {
        try {
            if (!registryState.selectedKey) {
                showNotification('Please select a parent registry key first', 'warning');
                return;
            }

            const newKeyPath = registryState.selectedKey + '\\' + keyName.trim();

            // Call the main process to create the registry key
            await window.electronAPI.createRegistryKey(newKeyPath);
            showNotification('Registry key created successfully', 'success');
            refreshRegistryView();

            // Add to recent changes
            registryState.recentChanges.unshift({
                action: 'createKey',
                path: registryState.selectedKey + '\\' + keyName.trim(),
                timestamp: new Date()
            });

        } catch (error) {
            if (window.electronAPI && window.electronAPI.logError) {
                window.electronAPI.logError(
                    `Error creating registry key: ${error.message}`,
                    'RegistryEditorTab'
                );
            }
            console.error('Create registry key error:', error);
            showNotification('Failed to create registry key: ' + error.message, 'error');
        }
    }
}

// Utility function for notifications
function showNotification(message, type = 'info') {
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Show environment-specific error message
function showEnvironmentError(operation = 'Registry operation') {
    const message = `${operation} requires the desktop version of WinTool. Please download and install the desktop application to access registry features.`;
    showNotification(message, 'warning');
    console.warn('Registry operation attempted in unsupported environment');
}

// Custom input dialog that matches the application theme
async function showSimpleInput(message) {
    return new Promise((resolve) => {
        // Create modal structure
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 10000 !important;
            background: rgba(0, 0, 0, 0.6) !important;
            backdrop-filter: blur(2px);
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: var(--background-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            position: relative;
            margin: 0;
        `;

        modalContent.innerHTML = `
            <div class="modal-header" style="padding: 24px; border-bottom: 1px solid var(--border-color); background: var(--background-card); border-radius: 12px 12px 0 0;">
                <h3 style="margin: 0; color: var(--text-primary); font-size: 18px; font-weight: 600;">
                    <i class="fas fa-plus" style="color: var(--primary-color); margin-right: 10px;"></i>
                    Create New Registry Key
                </h3>
            </div>
            <div class="modal-body" style="padding: 24px; background: var(--background-card); color: var(--text-primary);">
                <p style="margin: 0 0 15px 0; color: var(--text-primary);">${message}</p>
                <input type="text" id="input-dialog-value" class="form-input" style="
                    width: 100%; 
                    padding: 12px; 
                    border: 1px solid var(--border-color); 
                    border-radius: 8px; 
                    background: var(--background-light); 
                    color: var(--text-primary); 
                    font-size: 14px;
                    box-sizing: border-box;
                " placeholder="Enter key name...">
            </div>
            <div class="modal-footer" style="padding: 20px 24px 24px; border-top: 1px solid var(--border-color); background: var(--background-card); border-radius: 0 0 12px 12px; display: flex; justify-content: flex-end; gap: 12px;">
                <button class="btn btn-secondary" id="input-cancel-btn" style="min-width: 100px;">Cancel</button>
                <button class="btn btn-primary" id="input-ok-btn" style="min-width: 100px;">Create</button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        const input = modal.querySelector('#input-dialog-value');
        const cancelBtn = modal.querySelector('#input-cancel-btn');
        const okBtn = modal.querySelector('#input-ok-btn');

        // Focus the input
        setTimeout(() => {
            if (input) input.focus();
        }, 100);

        const cleanup = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        };

        const handleSubmit = () => {
            const value = input.value.trim();
            cleanup();
            resolve(value || null);
        };

        const handleCancel = () => {
            cleanup();
            resolve(null);
        };

        // Event listeners
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel();
                }
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', handleCancel);
        }

        if (okBtn) {
            okBtn.addEventListener('click', handleSubmit);
        }

        // Click outside to cancel
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        });
    });
}

// Export functions globally for modal handlers
(function exportGlobalFunctions() {
    const globalFunctions = {
        saveRegistryValue,
        performAdvancedSearch,
        createNewKey,
        removeSelectedKey,
        openValueEditor,
        editRegistryValue,
        deleteRegistryValue,
        openAdvancedSearch,
        closeRegistryValueModal,
        closeRegistrySearchModal,
        closeSearchResultsModal,
        navigateToSearchResult
    };

    // Only export if functions exist
    Object.keys(globalFunctions).forEach(key => {
        if (typeof globalFunctions[key] === 'function') {
            window[key] = globalFunctions[key];
        }
    });
})();

// Cleanup function for tab destruction
function cleanupRegistryEditor() {
    // Reset state
    registryState = {
        currentPath: '',
        history: [],
        historyIndex: -1,
        selectedKey: null,
        recentChanges: []
    };

    // Remove global functions
    const functionsToCleanup = [
        'saveRegistryValue', 'performAdvancedSearch', 'createNewKey', 'removeSelectedKey',
        'openValueEditor', 'editRegistryValue', 'deleteRegistryValue', 'openAdvancedSearch',
        'closeRegistryValueModal', 'closeRegistrySearchModal', 'closeSearchResultsModal',
        'navigateToSearchResult'
    ];

    functionsToCleanup.forEach(funcName => {
        if (window[funcName]) {
            delete window[funcName];
        }
    });
}

// Export cleanup function
window.cleanupRegistryEditor = cleanupRegistryEditor;

// Create global reset function for refresh functionality
try {
    if (typeof LazyLoadingHelper !== 'undefined') {
        const lazyHelper = new LazyLoadingHelper('registry-editor');
        lazyHelper.createGlobalResetFunction();
    }
} catch (error) {
    console.warn('Could not create global reset function:', error.message);
}