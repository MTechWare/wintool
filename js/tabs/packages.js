/**
 * WinTool - Packages Tab
 * Handles package management functionality
 */

// Initialize the packages tab
function initPackagesTab() {
    console.log('Initializing packages tab');
    loadPackages();
    setupEventListeners();
}

// Load packages from the backend
async function loadPackages() {
    try {
        const packagesContainer = document.getElementById('packages-list');
        
        // Show loading state
        packagesContainer.innerHTML = `
            <tr>
                <td colspan="4" class="loading-cell">
                    <div class="package-loading">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Loading packages...</div>
                    </div>
                </td>
            </tr>
        `;
        
        // Get packages from the backend
        const result = await window.electronAPI.getPackages();
        
        if (result.error) {
            packagesContainer.innerHTML = `
                <tr>
                    <td colspan="4" class="loading-cell">
                        <div class="package-error">
                            <i class="fas fa-exclamation-triangle"></i>
                            <div>Error loading packages: ${result.error}</div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        if (!result.packages || result.packages.length === 0) {
            packagesContainer.innerHTML = `
                <tr>
                    <td colspan="4" class="loading-cell">
                        <div class="package-empty">
                            <i class="fas fa-box-open"></i>
                            <div>No packages available</div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Update category buttons based on available categories
        updateCategoryButtons(result.packages);
        
        // Render packages
        packagesContainer.innerHTML = '';
        result.packages.forEach(pkg => {
            const packageRow = createPackageRow(pkg);
            packagesContainer.appendChild(packageRow);
        });
        
        // Update the selected count
        updateSelectedCount();
    } catch (error) {
        console.error('Error loading packages:', error);
        const packagesContainer = document.getElementById('packages-list');
        packagesContainer.innerHTML = `
            <tr>
                <td colspan="4" class="loading-cell">
                    <div class="package-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>Error loading packages: ${error.message}</div>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Update category buttons based on available categories
function updateCategoryButtons(packages) {
    const categoriesContainer = document.querySelector('.packages-categories');
    if (!categoriesContainer) return;
    
    // Clear existing buttons except "All"
    const allButton = categoriesContainer.querySelector('[data-category="all"]');
    categoriesContainer.innerHTML = '';
    if (allButton) categoriesContainer.appendChild(allButton);
    
    // Get unique categories
    const categories = [...new Set(packages.map(pkg => pkg.category))].filter(Boolean);
    
    // Format category names for display
    const formatCategory = (category) => {
        return category.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };
    
    // Sort categories alphabetically
    categories.sort();
    
    // Add "All" button if it doesn't exist
    if (!allButton) {
        const allBtn = document.createElement('button');
        allBtn.className = 'category-btn active';
        allBtn.dataset.category = 'all';
        allBtn.textContent = 'All';
        categoriesContainer.appendChild(allBtn);
    }
    
    // Add category buttons
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.dataset.category = category;
        button.textContent = formatCategory(category);
        categoriesContainer.appendChild(button);
    });
    
    // Add event listeners to new buttons
    setupCategoryButtons();
}

// Create a package row for the table
function createPackageRow(pkg) {
    const row = document.createElement('tr');
    row.dataset.category = pkg.category || 'other';
    row.dataset.packageId = pkg.id;
    
    row.innerHTML = `
        <td class="checkbox-column">
            <input type="checkbox" class="package-checkbox" data-package-id="${pkg.id}">
        </td>
        <td>
            <div class="package-name">
                <div class="package-icon">
                    <i class="fas ${pkg.icon || 'fa-box'}"></i>
                </div>
                ${pkg.name}
            </div>
        </td>
        <td class="package-description">${pkg.description || ''}</td>
        <td>
            <div class="package-actions">
                <button class="package-action-btn install" data-package-id="${pkg.id}" title="Install">
                    <i class="fas fa-download"></i>
                </button>
                <button class="package-action-btn uninstall" data-package-id="${pkg.id}" title="Uninstall">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Set up event listeners
function setupEventListeners() {
    // Package search
    const searchInput = document.getElementById('package-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterPackages);
    }
    
    // Set up category buttons
    setupCategoryButtons();
    
    // Set up select all checkbox
    const selectAllCheckbox = document.getElementById('select-all-packages');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.package-checkbox');
            checkboxes.forEach(checkbox => {
                // Only check visible packages
                const row = checkbox.closest('tr');
                if (row.style.display !== 'none') {
                    checkbox.checked = selectAllCheckbox.checked;
                }
            });
            updateSelectedCount();
        });
    }
    
    // Set up install selected button
    const installSelectedBtn = document.getElementById('install-selected');
    if (installSelectedBtn) {
        installSelectedBtn.addEventListener('click', installSelectedPackages);
    }
    
    // Set up uninstall selected button
    const uninstallSelectedBtn = document.getElementById('uninstall-selected');
    if (uninstallSelectedBtn) {
        uninstallSelectedBtn.addEventListener('click', uninstallSelectedPackages);
    }
    
    // Package checkboxes
    document.addEventListener('change', function(event) {
        if (event.target.classList.contains('package-checkbox')) {
            updateSelectedCount();
        }
    });
    
    // Package action buttons (install, uninstall)
    document.addEventListener('click', async (event) => {
        const button = event.target.closest('.package-action-btn');
        if (!button) return;
        
        const packageId = button.dataset.packageId;
        
        if (button.classList.contains('install')) {
            await installPackage(packageId, button);
        } else if (button.classList.contains('uninstall')) {
            await uninstallPackage(packageId, button);
        }
    });
}

// Install a single package
async function installPackage(packageId, button) {
    try {
        button.disabled = true;
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        // Get package name
        const packageRow = button.closest('tr');
        const packageName = packageRow.querySelector('.package-name').textContent.trim();
        
        // Show progress bar
        const progressContainer = document.querySelector('.installation-progress-container');
        const progressBar = document.getElementById('installation-progress-bar');
        const currentPackageName = document.getElementById('current-package-name');
        const progressCurrent = document.getElementById('progress-current');
        const progressTotal = document.getElementById('progress-total');
        
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        currentPackageName.textContent = packageName;
        progressTotal.textContent = '1';
        progressCurrent.textContent = '0';
        
        // Start progress animation
        progressBar.style.width = '50%';
        progressCurrent.textContent = '1';
        
        const result = await window.electronAPI.packageAction('install', packageId);
        
        // Complete progress animation
        progressBar.style.width = '100%';
        
        if (result.error) {
            showNotification(`Error: ${result.error}`, { type: 'error' });
        } else {
            showNotification(`Successfully installed ${packageName}`, { type: 'success' });
        }
        
        // Hide progress bar after a short delay
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 1000);
        
        button.innerHTML = originalHTML;
        button.disabled = false;
    } catch (error) {
        showNotification(`Error: ${error.message}`, { type: 'error' });
        
        // Hide progress bar
        document.querySelector('.installation-progress-container').style.display = 'none';
        
        button.innerHTML = '<i class="fas fa-download"></i>';
        button.disabled = false;
    }
}

// Uninstall a single package
async function uninstallPackage(packageId, button) {
    try {
        button.disabled = true;
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        // Get package name
        const packageRow = button.closest('tr');
        const packageName = packageRow.querySelector('.package-name').textContent.trim();
        
        // Show progress bar
        const progressContainer = document.querySelector('.installation-progress-container');
        const progressBar = document.getElementById('installation-progress-bar');
        const currentPackageName = document.getElementById('current-package-name');
        const progressCurrent = document.getElementById('progress-current');
        const progressTotal = document.getElementById('progress-total');
        
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        currentPackageName.textContent = packageName;
        progressTotal.textContent = '1';
        progressCurrent.textContent = '0';
        
        // Start progress animation
        progressBar.style.width = '50%';
        progressCurrent.textContent = '1';
        
        const result = await window.electronAPI.packageAction('uninstall', packageId);
        
        // Complete progress animation
        progressBar.style.width = '100%';
        
        if (result.error) {
            showNotification(`Error: ${result.error}`, { type: 'error' });
        } else {
            showNotification(`Successfully uninstalled ${packageName}`, { type: 'success' });
        }
        
        // Hide progress bar after a short delay
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 1000);
        
        button.innerHTML = originalHTML;
        button.disabled = false;
    } catch (error) {
        showNotification(`Error: ${error.message}`, { type: 'error' });
        
        // Hide progress bar
        document.querySelector('.installation-progress-container').style.display = 'none';
        
        button.innerHTML = '<i class="fas fa-trash-alt"></i>';
        button.disabled = false;
    }
}

// Install selected packages
async function installSelectedPackages() {
    const selectedCheckboxes = document.querySelectorAll('.package-checkbox:checked');
    if (selectedCheckboxes.length === 0) return;
    
    const installBtn = document.getElementById('install-selected');
    installBtn.disabled = true;
    const originalHTML = installBtn.innerHTML;
    
    // Get selected package IDs and names
    const selectedPackages = Array.from(selectedCheckboxes).map(checkbox => {
        const packageId = checkbox.dataset.packageId;
        const packageRow = checkbox.closest('tr');
        const packageName = packageRow.querySelector('.package-name').textContent.trim();
        return { id: packageId, name: packageName };
    });
    
    const totalPackages = selectedPackages.length;
    
    // Show progress bar
    const progressContainer = document.querySelector('.installation-progress-container');
    const progressBar = document.getElementById('installation-progress-bar');
    const currentPackageName = document.getElementById('current-package-name');
    const progressCurrent = document.getElementById('progress-current');
    const progressTotal = document.getElementById('progress-total');
    
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressTotal.textContent = totalPackages;
    progressCurrent.textContent = '0';
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        // Process each package installation
        for (let i = 0; i < selectedPackages.length; i++) {
            const pkg = selectedPackages[i];
            
            // Update progress display
            currentPackageName.textContent = pkg.name;
            progressCurrent.textContent = (i + 1).toString();
            progressBar.style.width = `${((i + 1) / totalPackages) * 100}%`;
            
            try {
                // Install the package
                const result = await window.electronAPI.packageAction('install', pkg.id);
                
                if (result.error) {
                    errorCount++;
                    console.error(`Error installing ${pkg.name}: ${result.error}`);
                } else {
                    successCount++;
                }
                
                // Short delay to make the progress visible
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                errorCount++;
                console.error(`Error installing ${pkg.name}: ${error.message}`);
            }
        }
        
        // Show summary notification
        if (errorCount === 0) {
            showNotification(`Successfully installed ${successCount} packages`, { type: 'success' });
        } else {
            showNotification(`Installed ${successCount} packages with ${errorCount} errors`, { type: 'warning' });
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, { type: 'error' });
    } finally {
        // Hide progress bar after a short delay
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 1000);
        
        // Reset button and checkboxes
        installBtn.innerHTML = originalHTML;
        installBtn.disabled = false;
        
        const selectAllCheckbox = document.getElementById('select-all-packages');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
        
        selectedCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        updateSelectedCount();
    }
}

// Uninstall selected packages
async function uninstallSelectedPackages() {
    const selectedCheckboxes = document.querySelectorAll('.package-checkbox:checked');
    if (selectedCheckboxes.length === 0) return;
    
    const uninstallBtn = document.getElementById('uninstall-selected');
    uninstallBtn.disabled = true;
    const originalHTML = uninstallBtn.innerHTML;
    
    // Get selected package IDs and names
    const selectedPackages = Array.from(selectedCheckboxes).map(checkbox => {
        const packageId = checkbox.dataset.packageId;
        const packageRow = checkbox.closest('tr');
        const packageName = packageRow.querySelector('.package-name').textContent.trim();
        return { id: packageId, name: packageName };
    });
    
    const totalPackages = selectedPackages.length;
    
    // Show progress bar
    const progressContainer = document.querySelector('.installation-progress-container');
    const progressBar = document.getElementById('installation-progress-bar');
    const currentPackageName = document.getElementById('current-package-name');
    const progressCurrent = document.getElementById('progress-current');
    const progressTotal = document.getElementById('progress-total');
    
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressTotal.textContent = totalPackages;
    progressCurrent.textContent = '0';
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        // Process each package uninstallation
        for (let i = 0; i < selectedPackages.length; i++) {
            const pkg = selectedPackages[i];
            
            // Update progress display
            currentPackageName.textContent = pkg.name;
            progressCurrent.textContent = (i + 1).toString();
            progressBar.style.width = `${((i + 1) / totalPackages) * 100}%`;
            
            try {
                // Uninstall the package
                const result = await window.electronAPI.packageAction('uninstall', pkg.id);
                
                if (result.error) {
                    errorCount++;
                    console.error(`Error uninstalling ${pkg.name}: ${result.error}`);
                } else {
                    successCount++;
                }
                
                // Short delay to make the progress visible
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                errorCount++;
                console.error(`Error uninstalling ${pkg.name}: ${error.message}`);
            }
        }
        
        // Show summary notification
        if (errorCount === 0) {
            showNotification(`Successfully uninstalled ${successCount} packages`, { type: 'success' });
        } else {
            showNotification(`Uninstalled ${successCount} packages with ${errorCount} errors`, { type: 'warning' });
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, { type: 'error' });
    } finally {
        // Hide progress bar after a short delay
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 1000);
        
        // Reset button and checkboxes
        uninstallBtn.innerHTML = originalHTML;
        uninstallBtn.disabled = false;
        
        const selectAllCheckbox = document.getElementById('select-all-packages');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
        
        selectedCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        updateSelectedCount();
    }
}

// Update the selected count text
function updateSelectedCount() {
    const selectedCount = document.querySelectorAll('.package-checkbox:checked').length;
    const countElement = document.querySelector('.selected-count');
    if (countElement) {
        countElement.textContent = `${selectedCount} package${selectedCount !== 1 ? 's' : ''} selected`;
    }
    
    // Enable/disable action buttons
    const installBtn = document.getElementById('install-selected');
    const uninstallBtn = document.getElementById('uninstall-selected');
    
    if (installBtn) {
        installBtn.disabled = selectedCount === 0;
    }
    
    if (uninstallBtn) {
        uninstallBtn.disabled = selectedCount === 0;
    }
}

// Set up category buttons
function setupCategoryButtons() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Filter packages by category
            const category = button.dataset.category;
            filterPackagesByCategory(category);
            
            // Update select all checkbox
            const selectAllCheckbox = document.getElementById('select-all-packages');
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
            }
            
            // Update selected count
            updateSelectedCount();
        });
    });
}

// Filter packages by search term
function filterPackages() {
    const searchTerm = document.getElementById('package-search').value.toLowerCase();
    const packages = document.querySelectorAll('tr[data-package-id]');
    
    packages.forEach(pkg => {
        const name = pkg.querySelector('.package-name').textContent.toLowerCase();
        const description = pkg.querySelector('.package-description').textContent.toLowerCase();
        const isMatch = name.includes(searchTerm) || description.includes(searchTerm);
        
        pkg.style.display = isMatch ? '' : 'none';
    });
    
    // Update select all checkbox
    const selectAllCheckbox = document.getElementById('select-all-packages');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
    }
    
    // Update selected count
    updateSelectedCount();
}

// Filter packages by category
function filterPackagesByCategory(category) {
    const packages = document.querySelectorAll('tr[data-package-id]');
    
    packages.forEach(pkg => {
        if (category === 'all' || pkg.dataset.category === category) {
            pkg.style.display = '';
        } else {
            pkg.style.display = 'none';
        }
    });
}

// Export the initialization function
window.initPackagesTab = initPackagesTab;
