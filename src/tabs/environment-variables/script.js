/**
 * Environment Variables Tab Script
 * Manages system and user environment variables
 */

// Global variables for the environment variables tab
let environmentVariables = {
  user: {},
  system: {},
};
let currentEditingVariable = null;
let currentPathTarget = null;
let confirmCallback = null;

// Initialize the environment variables tab
function initEnvironmentVariablesTab() {
  console.log('Initializing Environment Variables tab...');

  // Set up event listeners
  setupEventListeners();

  // Load environment variables
  refreshEnvironmentVariables();

  // Mark tab as ready
  if (window.markTabAsReady) {
    window.markTabAsReady(tabId);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Search functionality
  const searchInput = document.getElementById('env-search');
  if (searchInput) {
    searchInput.addEventListener('input', filterEnvironmentVariables);
  }

  // Filter functionality
  const filterSelect = document.getElementById('env-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', filterEnvironmentVariables);
  }

  // Form validation
  const nameInput = document.getElementById('env-var-name');
  if (nameInput) {
    nameInput.addEventListener('input', validateVariableName);
  }

  // Modal close on background click
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });
}

// Refresh environment variables from the system
async function refreshEnvironmentVariables() {
  const loadingEl = document.getElementById('env-loading');
  const contentEl = document.getElementById('env-content');
  const errorEl = document.getElementById('env-error');

  // Show loading state
  if (loadingEl) loadingEl.style.display = 'block';
  if (contentEl) contentEl.style.display = 'none';
  if (errorEl) errorEl.style.display = 'none';

  try {
    console.log('Fetching environment variables...');
    const envVars = await window.electronAPI.getEnvironmentVariables();

    environmentVariables = envVars;
    console.log('Environment variables loaded:', envVars);

    // Populate the tables
    populateEnvironmentVariables();

    // Show content
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
  } catch (error) {
    console.error('Error loading environment variables:', error);

    // Show error state
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) {
      errorEl.style.display = 'block';
      const errorMessage = document.getElementById('env-error-message');
      if (errorMessage) {
        errorMessage.textContent = error.message || 'Failed to load environment variables';
      }
    }
  }
}

// Populate environment variables tables
function populateEnvironmentVariables() {
  populateVariableTable('user', environmentVariables.user);
  populateVariableTable('system', environmentVariables.system);

  // Update counts
  updateVariableCounts();
}

// Populate a specific variable table
function populateVariableTable(type, variables) {
  const tbody = document.getElementById(`${type}-env-tbody`);
  if (!tbody) return;

  tbody.innerHTML = '';

  // Sort variables by name
  const sortedVars = Object.entries(variables).sort(([a], [b]) => a.localeCompare(b));

  sortedVars.forEach(([name, value]) => {
    const row = createVariableRow(name, value, type);
    tbody.appendChild(row);
  });
}

// Create a table row for a variable
function createVariableRow(name, value, type) {
  const row = document.createElement('tr');
  row.setAttribute('data-var-name', name.toLowerCase());
  row.setAttribute('data-var-type', type);

  // Variable name cell
  const nameCell = document.createElement('td');
  nameCell.className = 'var-name';
  nameCell.textContent = name;

  // Variable value cell
  const valueCell = document.createElement('td');
  valueCell.className = 'var-value';

  const isLongValue = value && value.length > 100;
  if (isLongValue) {
    valueCell.classList.add('truncated');
    valueCell.innerHTML = `
            <div class="value-content">${escapeHtml(value.substring(0, 100))}</div>
            <button class="expand-btn" onclick="window.toggleValueExpansion(this)">Show more</button>
        `;
  } else {
    valueCell.textContent = value || '';
  }

  // Actions cell
  const actionsCell = document.createElement('td');
  actionsCell.innerHTML = createActionButtons(name, type);

  row.appendChild(nameCell);
  row.appendChild(valueCell);
  row.appendChild(actionsCell);

  return row;
}

// Create action buttons for a variable
function createActionButtons(name, type) {
  const isPathVariable = name.toUpperCase() === 'PATH';
  const target = type === 'user' ? 'User' : 'Machine';
  const escapedName = name.replace(/'/g, "\\'").replace(/"/g, '\\"');

  let buttons = `
        <div class="action-buttons">
            <button class="action-btn edit" onclick="window.editEnvironmentVariable('${escapedName}', '${target}')" title="Edit Variable">
                <i class="fas fa-edit"></i> Edit
            </button>
    `;

  if (isPathVariable) {
    buttons += `
            <button class="action-btn path" onclick="window.editPathVariable('${target}')" title="Edit PATH">
                <i class="fas fa-route"></i> PATH Editor
            </button>
        `;
  }

  buttons += `
            <button class="action-btn delete" onclick="window.deleteEnvironmentVariable('${escapedName}', '${target}')" title="Delete Variable">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;

  return buttons;
}

// Update variable counts
function updateVariableCounts() {
  const userCount = Object.keys(environmentVariables.user).length;
  const systemCount = Object.keys(environmentVariables.system).length;

  const userCountEl = document.getElementById('user-count');
  const systemCountEl = document.getElementById('system-count');

  if (userCountEl) {
    userCountEl.textContent = `${userCount} variable${userCount !== 1 ? 's' : ''}`;
  }

  if (systemCountEl) {
    systemCountEl.textContent = `${systemCount} variable${systemCount !== 1 ? 's' : ''}`;
  }
}

// Filter environment variables based on search and filter criteria
function filterEnvironmentVariables() {
  const searchTerm = document.getElementById('env-search')?.value.toLowerCase() || '';
  const filterType = document.getElementById('env-filter')?.value || 'all';

  // Get all variable rows
  const allRows = document.querySelectorAll('.env-table tbody tr');

  allRows.forEach(row => {
    const varName = row.getAttribute('data-var-name') || '';
    const varType = row.getAttribute('data-var-type') || '';
    const varValue = row.querySelector('.var-value')?.textContent.toLowerCase() || '';

    // Check search criteria
    const matchesSearch = !searchTerm || varName.includes(searchTerm) || varValue.includes(searchTerm);

    // Check filter criteria
    const matchesFilter = filterType === 'all' || varType === filterType;

    // Show/hide row
    if (matchesSearch && matchesFilter) {
      row.classList.remove('hidden');
    } else {
      row.classList.add('hidden');
    }
  });

  // Update section visibility
  updateSectionVisibility();
}

// Update section visibility based on filtered results
function updateSectionVisibility() {
  const filterType = document.getElementById('env-filter')?.value || 'all';

  const userSection = document.getElementById('user-section');
  const systemSection = document.getElementById('system-section');

  if (userSection) {
    userSection.style.display = filterType === 'all' || filterType === 'user' ? 'block' : 'none';
  }

  if (systemSection) {
    systemSection.style.display = filterType === 'all' || filterType === 'system' ? 'block' : 'none';
  }
}

// Toggle value expansion for long values
function toggleValueExpansion(button) {
  const valueCell = button.closest('.var-value');
  const valueContent = valueCell.querySelector('.value-content');

  if (valueCell.classList.contains('truncated')) {
    // Expand
    valueCell.classList.remove('truncated');
    button.textContent = 'Show less';

    // Get full value
    const row = button.closest('tr');
    const varName = row.querySelector('.var-name').textContent;
    const varType = row.getAttribute('data-var-type');
    const fullValue = environmentVariables[varType][varName];

    if (valueContent) {
      valueContent.textContent = fullValue;
    }
  } else {
    // Collapse
    valueCell.classList.add('truncated');
    button.textContent = 'Show more';

    // Get truncated value
    const row = button.closest('tr');
    const varName = row.querySelector('.var-name').textContent;
    const varType = row.getAttribute('data-var-type');
    const fullValue = environmentVariables[varType][varName];

    if (valueContent) {
      valueContent.textContent = fullValue.substring(0, 100);
    }
  }
}

// Show add variable modal
function showAddVariableModal() {
  currentEditingVariable = null;

  const modal = document.getElementById('env-var-modal');
  const title = document.getElementById('env-modal-title');
  const nameInput = document.getElementById('env-var-name');
  const valueInput = document.getElementById('env-var-value');
  const targetSelect = document.getElementById('env-var-target');

  if (title) title.innerHTML = '<i class="fas fa-plus"></i> Add Environment Variable';
  if (nameInput) {
    nameInput.value = '';
    nameInput.disabled = false;
  }
  if (valueInput) valueInput.value = '';
  if (targetSelect) targetSelect.value = 'User';

  if (modal) modal.style.display = 'flex';

  // Focus on name input
  setTimeout(() => {
    if (nameInput) nameInput.focus();
  }, 100);
}

// Edit environment variable
function editEnvironmentVariable(name, target) {
  currentEditingVariable = { name, target };

  const modal = document.getElementById('env-var-modal');
  const title = document.getElementById('env-modal-title');
  const nameInput = document.getElementById('env-var-name');
  const valueInput = document.getElementById('env-var-value');
  const targetSelect = document.getElementById('env-var-target');

  const varType = target === 'User' ? 'user' : 'system';
  const currentValue = environmentVariables[varType][name] || '';

  if (title) title.innerHTML = '<i class="fas fa-edit"></i> Edit Environment Variable';
  if (nameInput) {
    nameInput.value = name;
    nameInput.disabled = true; // Don't allow changing name when editing
  }
  if (valueInput) valueInput.value = currentValue;
  if (targetSelect) {
    targetSelect.value = target;
    targetSelect.disabled = true; // Don't allow changing target when editing
  }

  if (modal) modal.style.display = 'flex';

  // Focus on value input
  setTimeout(() => {
    if (valueInput) valueInput.focus();
  }, 100);
}

// Save environment variable
async function saveEnvironmentVariable() {
  const nameInput = document.getElementById('env-var-name');
  const valueInput = document.getElementById('env-var-value');
  const targetSelect = document.getElementById('env-var-target');

  if (!nameInput || !valueInput || !targetSelect) return;

  const name = nameInput.value.trim();
  const value = valueInput.value;
  const target = targetSelect.value;

  // Validate input
  if (!name) {
    alert('Please enter a variable name');
    nameInput.focus();
    return;
  }

  if (!validateVariableNameString(name)) {
    alert('Variable name can only contain letters, numbers, and underscores');
    nameInput.focus();
    return;
  }

  try {
    console.log(`Saving environment variable: ${name} = ${value} (${target})`);

    const result = await window.electronAPI.setEnvironmentVariable(name, value, target);

    if (result.success) {
      console.log('Environment variable saved successfully');
      closeEnvVarModal();

      // Refresh the variables
      await refreshEnvironmentVariables();

      // Show success message
      showNotification('Environment variable saved successfully', 'success');
    }
  } catch (error) {
    console.error('Error saving environment variable:', error);
    alert(`Error saving environment variable: ${error.message}`);
  }
}

// Delete environment variable
function deleteEnvironmentVariable(name, target) {
  const message = `Are you sure you want to delete the environment variable "${name}" from ${target.toLowerCase()} variables?`;

  showConfirmModal(message, async () => {
    try {
      console.log(`Deleting environment variable: ${name} (${target})`);

      const result = await window.electronAPI.deleteEnvironmentVariable(name, target);

      if (result.success) {
        console.log('Environment variable deleted successfully');

        // Refresh the variables
        await refreshEnvironmentVariables();

        // Show success message
        showNotification('Environment variable deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Error deleting environment variable:', error);
      alert(`Error deleting environment variable: ${error.message}`);
    }
  });
}

// Edit PATH variable
function editPathVariable(target) {
  currentPathTarget = target;

  const modal = document.getElementById('path-editor-modal');
  const title = document.getElementById('path-modal-title');

  if (title) {
    title.innerHTML = `<i class="fas fa-route"></i> PATH Editor - ${target} Variables`;
  }

  // Get current PATH value
  const varType = target === 'User' ? 'user' : 'system';
  const pathValue = environmentVariables[varType]['PATH'] || '';

  // Populate PATH entries
  populatePathEntries(pathValue);

  if (modal) modal.style.display = 'flex';
}

// Populate PATH entries in the editor
function populatePathEntries(pathValue) {
  const pathList = document.getElementById('path-list');
  if (!pathList) return;

  pathList.innerHTML = '';

  const paths = pathValue.split(';').filter(p => p.trim());

  paths.forEach((path, index) => {
    const entry = createPathEntry(path.trim(), index);
    pathList.appendChild(entry);
  });

  // Add empty entry for new additions
  const emptyEntry = createPathEntry('', paths.length);
  pathList.appendChild(emptyEntry);
}

// Create a PATH entry element
function createPathEntry(path, index) {
  const entry = document.createElement('div');
  entry.className = 'path-entry';
  entry.setAttribute('data-index', index);

  entry.innerHTML = `
        <input type="text" class="path-input" value="${escapeHtml(path)}"
               placeholder="Enter path..." onchange="window.validatePathEntry(this)">
        <div class="path-entry-controls">
            <button class="path-entry-btn remove" onclick="window.removePathEntry(this)" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

  return entry;
}

// Securely add new PATH entry
function addPathEntry() {
  const pathList = document.getElementById('path-list');
  if (!pathList) return;

  const entries = pathList.querySelectorAll('.path-entry');
  const newIndex = entries.length;

  const newEntry = createPathEntrySecure('', newIndex);
  if (newEntry) {
    pathList.appendChild(newEntry);

    // Focus on the new input
    const newInput = newEntry.querySelector('.path-input');
    if (newInput) newInput.focus();
  }
}

// Securely validate PATH entry
function validatePathEntrySecure(input) {
  const path = input.value.trim();
  const entry = input.closest('.path-entry');

  if (!entry) return;

  // Remove existing validation classes
  entry.classList.remove('invalid', 'warning');

  if (!path) {
    // Empty entries are allowed
    return;
  }

  if (!validatePathEntry(path)) {
    entry.classList.add('invalid');
    entry.title = 'Invalid path: too long or contains invalid characters';
    return;
  }

  // Check for potentially dangerous paths
  const dangerousPaths = ['C:\\Windows\\System32', 'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)'];

  if (dangerousPaths.some(dangerous => path.toLowerCase().startsWith(dangerous.toLowerCase()))) {
    entry.classList.add('warning');
    entry.title = 'Warning: This is a critical system directory';
  }

  // Check if path exists (visual feedback only)
  if (window.electronAPI && window.electronAPI.pathExists) {
    window.electronAPI
      .pathExists(path)
      .then(exists => {
        if (!exists) {
          entry.classList.add('warning');
          entry.title = 'Warning: This path does not exist';
        }
      })
      .catch(() => {
        // Ignore errors in path checking
      });
  }
}

// Securely remove PATH entry
function removePathEntrySecure(button) {
  const entry = button.closest('.path-entry');
  if (!entry) return;

  const input = entry.querySelector('.path-input');
  const path = input ? input.value.trim() : '';

  // Warn about removing important paths
  if (path && (path.includes('System32') || path.includes('Windows'))) {
    const confirmed = confirm(
      `Warning: You are about to remove a system path:\n\n"${path}"\n\n` +
        `Removing this path may prevent system programs from running correctly.\n\n` +
        `Are you sure you want to remove this path?`
    );

    if (!confirmed) {
      return;
    }
  }

  entry.remove();
}

// Legacy functions for backward compatibility (deprecated)
window.validatePathEntry = validatePathEntrySecure;
window.removePathEntry = removePathEntrySecure;

// Remove PATH entry
function removePathEntry(button) {
  const entry = button.closest('.path-entry');
  if (entry) {
    entry.remove();
  }
}

// Validate PATH entry
function validatePathEntry(input) {
  const entry = input.closest('.path-entry');
  const path = input.value.trim();

  if (!path) {
    entry.classList.remove('valid', 'invalid');
    return;
  }

  // Basic validation - check if path exists (simplified)
  // In a real implementation, you might want to check if the path actually exists
  if (path.includes('\\') || path.includes('/') || path.includes(':')) {
    entry.classList.add('valid');
    entry.classList.remove('invalid');
  } else {
    entry.classList.add('invalid');
    entry.classList.remove('valid');
  }
}

// Validate all PATH entries
function validatePathEntries() {
  const pathInputs = document.querySelectorAll('.path-input');
  pathInputs.forEach(input => validatePathEntry(input));
}

// Save PATH variable
async function savePathVariable() {
  if (!currentPathTarget) return;

  const pathInputs = document.querySelectorAll('.path-input');
  const paths = [];

  pathInputs.forEach(input => {
    const path = input.value.trim();
    if (path) {
      paths.push(path);
    }
  });

  const newPathValue = paths.join(';');

  try {
    console.log(`Saving PATH variable: ${newPathValue} (${currentPathTarget})`);

    const result = await window.electronAPI.setEnvironmentVariable('PATH', newPathValue, currentPathTarget);

    if (result.success) {
      console.log('PATH variable saved successfully');
      closePathEditorModal();

      // Refresh the variables
      await refreshEnvironmentVariables();

      // Show success message
      showNotification('PATH variable saved successfully', 'success');
    }
  } catch (error) {
    console.error('Error saving PATH variable:', error);
    alert(`Error saving PATH variable: ${error.message}`);
  }
}

// Export environment variables
function exportEnvironmentVariables() {
  const data = {
    user: environmentVariables.user,
    system: environmentVariables.system,
    exported: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `environment-variables-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification('Environment variables exported successfully', 'success');
}

// Validate variable name input
function validateVariableName() {
  const nameInput = document.getElementById('env-var-name');
  if (!nameInput) return;

  const name = nameInput.value;
  const isValid = validateVariableNameString(name);

  if (name && !isValid) {
    nameInput.style.borderColor = '#f44336';
  } else {
    nameInput.style.borderColor = '#444';
  }
}

// Validate variable name string
function validateVariableNameString(name) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

// Close environment variable modal
function closeEnvVarModal() {
  const modal = document.getElementById('env-var-modal');
  if (modal) modal.style.display = 'none';

  currentEditingVariable = null;

  // Reset form
  const form = document.getElementById('env-var-form');
  if (form) form.reset();

  // Reset input styles
  const nameInput = document.getElementById('env-var-name');
  if (nameInput) {
    nameInput.style.borderColor = '#444';
    nameInput.disabled = false;
  }

  const targetSelect = document.getElementById('env-var-target');
  if (targetSelect) targetSelect.disabled = false;
}

// Close PATH editor modal
function closePathEditorModal() {
  const modal = document.getElementById('path-editor-modal');
  if (modal) modal.style.display = 'none';

  currentPathTarget = null;
}

// Show confirmation modal
function showConfirmModal(message, callback) {
  const modal = document.getElementById('env-confirm-modal');
  const messageEl = document.getElementById('confirm-message');

  if (messageEl) messageEl.textContent = message;
  if (modal) modal.style.display = 'flex';

  confirmCallback = callback;
}

// Close confirmation modal
function closeConfirmModal() {
  const modal = document.getElementById('env-confirm-modal');
  if (modal) modal.style.display = 'none';

  confirmCallback = null;
}

// Confirm action
function confirmAction() {
  if (confirmCallback) {
    confirmCallback();
  }
  closeConfirmModal();
}

// Close all modals
function closeAllModals() {
  closeEnvVarModal();
  closePathEditorModal();
  closeConfirmModal();
}

// Show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
        <span>${message}</span>
    `;

  // Add styles
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Expose functions globally for onclick handlers
window.refreshEnvironmentVariables = refreshEnvironmentVariables;
window.showAddVariableModal = showAddVariableModal;
window.exportEnvironmentVariables = exportEnvironmentVariables;
window.editEnvironmentVariable = editEnvironmentVariable;
window.deleteEnvironmentVariable = deleteEnvironmentVariable;
window.editPathVariable = editPathVariable;
window.saveEnvironmentVariable = saveEnvironmentVariable;
window.closeEnvVarModal = closeEnvVarModal;
window.closePathEditorModal = closePathEditorModal;
window.closeConfirmModal = closeConfirmModal;
window.confirmAction = confirmAction;
window.addPathEntry = addPathEntry;
window.removePathEntry = removePathEntry;
window.validatePathEntry = validatePathEntry;
window.validatePathEntries = validatePathEntries;
window.savePathVariable = savePathVariable;
window.toggleValueExpansion = toggleValueExpansion;

// Security configuration and validation functions
const ENV_SECURITY_CONFIG = {
  variableNameMaxLength: 255,
  variableValueMaxLength: 32767, // Windows registry limit
  variableNamePattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  pathEntryMaxLength: 260, // Windows MAX_PATH
  criticalVariables: [
    'PATH',
    'PATHEXT',
    'WINDIR',
    'SYSTEMROOT',
    'PROGRAMFILES',
    'PROGRAMFILES(X86)',
    'PROGRAMDATA',
    'USERPROFILE',
    'ALLUSERSPROFILE',
    'APPDATA',
    'LOCALAPPDATA',
    'TEMP',
    'TMP',
    'COMSPEC',
    'PROCESSOR_ARCHITECTURE',
    'NUMBER_OF_PROCESSORS',
  ],
  systemOnlyVariables: [
    'WINDIR',
    'SYSTEMROOT',
    'PROGRAMFILES',
    'PROGRAMFILES(X86)',
    'PROGRAMDATA',
    'PROCESSOR_ARCHITECTURE',
    'NUMBER_OF_PROCESSORS',
  ],
};

function validateVariableNameString(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }

  if (name.length > ENV_SECURITY_CONFIG.variableNameMaxLength) {
    return false;
  }

  return ENV_SECURITY_CONFIG.variableNamePattern.test(name);
}

function isCriticalVariable(name) {
  return ENV_SECURITY_CONFIG.criticalVariables.includes(name.toUpperCase());
}

function isSystemOnlyVariable(name) {
  return ENV_SECURITY_CONFIG.systemOnlyVariables.includes(name.toUpperCase());
}

// Notification system for environment variables
function showNotification(message, type = 'info', duration = 5000) {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.env-notification');
  existingNotifications.forEach(notification => notification.remove());

  const notification = document.createElement('div');
  notification.className = `env-notification ${type}`;
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        color: ${type === 'warning' ? '#212529' : 'white'};
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        word-wrap: break-word;
        animation: slideInRight 0.3s ease-out;
    `;

  const icon =
    type === 'success'
      ? 'check-circle'
      : type === 'error'
        ? 'exclamation-triangle'
        : type === 'warning'
          ? 'exclamation-triangle'
          : 'info-circle';

  notification.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;

  document.body.appendChild(notification);

  // Auto-remove after duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }
  }, duration);
}

// Initialize the tab when the script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEnvironmentVariablesTab);
} else {
  initEnvironmentVariablesTab();
}
