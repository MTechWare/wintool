/**
 * AppX Packages Tab - Windows AppX Package Manager
 * Allows users to uninstall Microsoft apps and AppX packages
 */

class AppXPackageManager {
    constructor() {
        this.packages = {};
        this.filteredPackages = {};
        this.selectedPackages = new Set();
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.currentOperation = null;
        this.packageType = 'all';
        
        // Safe to remove packages list based on the article
        this.safeToRemovePackages = [
            'Microsoft.WindowsStore',
            'Microsoft.GetHelp',
            'Microsoft.Copilot',
            'Microsoft.Windows.Ai.Copilot.Provider',
            'Microsoft.Copilot_8wekyb3d8bbwe',
            'Microsoft.XboxGamingOverlay',
            'Microsoft.YourPhone',
            'Microsoft.XboxIdentityProvider',
            'Microsoft.XboxSpeechToTextOverlay',
            'Microsoft.Windows.DevHome',
            'Microsoft.MicrosoftOfficeHub',
            'MicrosoftCorporationII.QuickAssist',
            'MSTeams',
            'Microsoft.OutlookForWindows',
            'Microsoft.Edge.GameAssist',
            'Microsoft.WidgetsPlatformRuntime',
            'Microsoft.Xbox.TCUI',
            'Microsoft.MicrosoftStickyNotes',
            'Microsoft.BingWeather',
            'Microsoft.WindowsAlarms',
            'Microsoft.Windows.Photos',
            'Microsoft.Todos',
            'Microsoft.MicrosoftSolitaireCollection',
            'Microsoft.WindowsSoundRecorder',
            'Microsoft.PowerAutomateDesktop',
            'Microsoft.GamingApp',
            'Microsoft.XboxApp',
            'Clipchamp.Clipchamp',
            'Microsoft.BingNews',
            'Microsoft.BingSearch',
            'Microsoft.WindowsCamera',
            'Microsoft.ZuneMusic',
            'Microsoft.WindowsFeedbackHub',
            'Microsoft.MixedReality.Portal',
            'Microsoft.Office.OneNote',
            'Microsoft.People',
            'Microsoft.Getstarted',
            'Microsoft.549981C3F5F10',
            'Microsoft.SkypeApp',
            'Microsoft.ZuneVideo',
            'Microsoft.Microsoft3DViewer',
            'Microsoft.MSPaint',
            'Microsoft.WindowsCommunicationsApps',
            'Microsoft.WindowsMaps'
        ];
    }

    /**
     * Initialize the AppX Package Manager
     */
    async init() {
        console.log('Initializing AppX Package Manager...');

        try {
            // Load packages
            await this.loadPackages();

            // Setup event listeners
            this.setupEventListeners();

            // Render initial package list
            this.renderPackages();

            console.log('AppX Package Manager initialized');

            // Signal that this tab is ready
            if (window.markTabAsReady && typeof tabId !== 'undefined') {
                window.markTabAsReady(tabId);
            }
        } catch (error) {
            console.error('Error initializing AppX Package Manager:', error);
            this.showStatus('Error initializing AppX Package Manager: ' + error.message, 'error');
            
            // Still signal ready even if there was an error
            if (window.markTabAsReady && typeof tabId !== 'undefined') {
                window.markTabAsReady(tabId);
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('appx-package-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterPackages();
                this.renderPackages();
            });
        }

        // Package type selector
        const packageTypeSelect = document.getElementById('package-type-select');
        if (packageTypeSelect) {
            packageTypeSelect.addEventListener('change', (e) => {
                this.packageType = e.target.value;
                this.filterPackages();
                this.renderPackages();
            });
        }

        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.getAttribute('data-filter');
                this.setFilter(filter);
            });
        });

        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all-appx');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }

        // Action buttons


        const uninstallSelectedBtn = document.getElementById('uninstall-selected-appx');
        if (uninstallSelectedBtn) {
            uninstallSelectedBtn.addEventListener('click', () => {
                this.uninstallSelectedPackages();
            });
        }

        const refreshBtn = document.getElementById('refresh-appx-packages');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshPackages();
            });
        }

        const exportBtn = document.getElementById('export-appx-list');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportPackageList();
            });
        }

        // Cancel operation button
        const cancelBtn = document.getElementById('appx-cancel-operation');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelCurrentOperation();
            });
        }
    }

    /**
     * Load AppX packages from JSON file and detect installed ones
     */
    async loadPackages() {
        this.showLoading(true);
        this.showStatus('Loading AppX packages...', 'info');

        try {
            // Load package definitions from JSON file
            const response = await fetch('./tabs/appx-packages/appx-packages.json');
            const packageData = await response.json();

            console.log('Loaded package definitions:', Object.keys(packageData.packages).length);

            // Get installed packages from PowerShell to check which ones are actually installed
            const installedPackages = await this.getInstalledPackages();

            // Process packages and mark which ones are installed
            this.packages = {};

            Object.keys(packageData.packages).forEach(packageKey => {
                const pkgDef = packageData.packages[packageKey];
                const isInstalled = this.isPackageInstalled(packageKey, installedPackages);

                if (this.packageType === 'all' ||
                    (this.packageType === 'user' && pkgDef.type === 'user') ||
                    (this.packageType === 'system' && pkgDef.type === 'system') ||
                    (this.packageType === 'provisioned' && isInstalled)) {

                    this.packages[packageKey] = {
                        name: pkgDef.name,
                        packageName: pkgDef.packageName,
                        fullName: packageKey,
                        publisher: pkgDef.publisher,
                        description: pkgDef.description,
                        category: pkgDef.category,
                        icon: pkgDef.icon,
                        type: pkgDef.type,
                        safeToRemove: pkgDef.safeToRemove,
                        consequences: pkgDef.consequences,
                        isInstalled: isInstalled,
                        version: 'Unknown' // Will be updated if detected
                    };
                }
            });

            this.filterPackages();
            this.showStatus(`Loaded ${Object.keys(this.packages).length} AppX packages`, 'success');

        } catch (error) {
            console.error('Error loading packages:', error);
            this.showStatus('Error loading packages: ' + error.message + '. Loading sample data...', 'error');
            this.loadSampleData();
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Get installed packages from PowerShell
     */
    async getInstalledPackages() {
        try {
            const command = 'Get-AppxPackage | Select-Object Name, PackageFullName, Version | ConvertTo-Json -Depth 3';
            const result = await window.electronAPI.executePowerShell(command);

            if (result && result.trim()) {
                let packagesData = JSON.parse(result.trim());

                // Ensure it's an array
                if (!Array.isArray(packagesData)) {
                    packagesData = packagesData ? [packagesData] : [];
                }

                console.log('Found installed packages:', packagesData.length);
                return packagesData;
            }
        } catch (error) {
            console.warn('Could not get installed packages from PowerShell:', error);
        }

        return [];
    }

    /**
     * Check if a package is installed
     */
    isPackageInstalled(packageKey, installedPackages) {
        if (!installedPackages || installedPackages.length === 0) {
            return true; // Assume installed if we can't check
        }

        return installedPackages.some(pkg =>
            pkg.Name === packageKey ||
            pkg.PackageFullName?.includes(packageKey) ||
            pkg.Name?.includes(packageKey.split('.').pop())
        );
    }

    /**
     * Determine package type based on package info
     */
    determinePackageType(pkg) {
        if (this.packageType === 'provisioned') {
            return 'provisioned';
        }
        
        // Check if it's a system package
        if (pkg.IsFramework || 
            (pkg.InstallLocation && pkg.InstallLocation.includes('SystemApps')) ||
            (pkg.Publisher && pkg.Publisher.includes('Microsoft Corporation'))) {
            return 'system';
        }
        
        return 'user';
    }

    /**
     * Filter packages based on current criteria
     */
    filterPackages() {
        this.filteredPackages = {};

        Object.keys(this.packages).forEach(key => {
            const pkg = this.packages[key];
            let include = true;

            // Search filter
            if (this.searchTerm) {
                const searchableText = `${pkg.name} ${pkg.publisher} ${pkg.description || ''}`.toLowerCase();
                include = include && searchableText.includes(this.searchTerm);
            }

            // Category filter
            if (this.currentFilter === 'microsoft') {
                include = include && (pkg.publisher.toLowerCase().includes('microsoft') ||
                                    pkg.name.toLowerCase().includes('microsoft'));
            } else if (this.currentFilter === 'removable') {
                include = include && pkg.safeToRemove === true;
            }

            if (include) {
                this.filteredPackages[key] = pkg;
            }
        });

        this.updateSelectionInfo();
    }

    /**
     * Set active filter
     */
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update filter button states
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.filterPackages();
        this.renderPackages();
    }

    /**
     * Render packages list
     */
    renderPackages() {
        const packagesList = document.getElementById('appx-packages-list');
        if (!packagesList) return;

        packagesList.innerHTML = '';
        
        const packageKeys = Object.keys(this.filteredPackages);
        
        if (packageKeys.length === 0) {
            packagesList.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #b0b0b0;">
                    <i class="fas fa-search" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                    <p>No AppX packages found matching your criteria</p>
                </div>
            `;
            return;
        }

        packageKeys.forEach(key => {
            const pkg = this.filteredPackages[key];
            const packageItem = this.createPackageItem(key, pkg);
            if (packageItem) {
                packagesList.appendChild(packageItem);
            }
        });
        
        this.updateSelectionInfo();
    }

    /**
     * Create package item element
     */
    createPackageItem(key, pkg) {
        const item = document.createElement('div');
        item.className = 'appx-package-item';
        if (pkg.isInstalled) {
            item.classList.add('installed');
        }
        item.setAttribute('data-package-key', key);

        // Checkbox
        const checkbox = document.createElement('div');
        checkbox.className = 'appx-package-checkbox';
        const checkboxInput = document.createElement('input');
        checkboxInput.type = 'checkbox';
        checkboxInput.checked = this.selectedPackages.has(key);
        checkboxInput.addEventListener('change', (e) => {
            this.togglePackageSelection(key, e.target.checked);
        });
        checkbox.appendChild(checkboxInput);

        // Package name with icon
        const name = document.createElement('div');
        name.className = 'appx-package-name';

        // Add icon (use fallback if not available)
        const icon = document.createElement('i');
        icon.className = pkg.icon || 'fas fa-cube'; // Default fallback icon
        icon.style.marginRight = '8px';

        // Use primary color for all icons for consistency
        icon.style.color = 'var(--primary-color)';

        // Add safety indicator class for additional styling if needed
        if (pkg.safeToRemove) {
            icon.classList.add('safe-package-icon');
        } else {
            icon.classList.add('unsafe-package-icon');
        }

        name.appendChild(icon);

        const nameText = document.createElement('span');
        nameText.textContent = this.escapeHtml(pkg.name);
        name.appendChild(nameText);

        name.title = `${pkg.description || ''}\n\nConsequences: ${pkg.consequences || 'Unknown'}`;

        // Publisher
        const publisher = document.createElement('div');
        publisher.className = 'appx-package-publisher';
        publisher.textContent = this.escapeHtml(pkg.publisher);

        // Version
        const version = document.createElement('div');
        version.className = 'appx-package-version';
        version.textContent = pkg.isInstalled ? (pkg.version || 'Installed') : 'Not Installed';

        // Type with safety indicator
        const type = document.createElement('div');
        type.className = `appx-package-type ${pkg.type}`;
        if (pkg.safeToRemove) {
            type.classList.add('safe');
            type.textContent = `${pkg.type} ✓`;
            type.title = 'Safe to remove';
        } else {
            type.classList.add('unsafe');
            type.textContent = `${pkg.type} ⚠`;
            type.title = 'Not recommended to remove';
        }

        // Actions
        const actions = document.createElement('div');
        actions.className = 'appx-package-actions';



        // Uninstall button (only show if installed)
        if (pkg.isInstalled) {
            const uninstallBtn = document.createElement('button');
            uninstallBtn.className = 'appx-package-action-btn appx-uninstall-package-btn';
            uninstallBtn.title = 'Uninstall Package';
            uninstallBtn.innerHTML = '<i class="fas fa-trash"></i>';
            uninstallBtn.onclick = () => this.uninstallPackage(key);
            actions.appendChild(uninstallBtn);
        }

        // Append all elements
        item.appendChild(checkbox);
        item.appendChild(name);
        item.appendChild(publisher);
        item.appendChild(version);
        item.appendChild(type);
        item.appendChild(actions);

        return item;
    }

    /**
     * Toggle package selection
     */
    togglePackageSelection(packageKey, selected) {
        if (selected) {
            this.selectedPackages.add(packageKey);
        } else {
            this.selectedPackages.delete(packageKey);
        }

        // Update item appearance
        const item = document.querySelector(`[data-package-key="${packageKey}"]`);
        if (item) {
            item.classList.toggle('selected', selected);
        }

        this.updateSelectionInfo();
    }

    /**
     * Toggle select all packages
     */
    toggleSelectAll(selectAll) {
        const packageKeys = Object.keys(this.filteredPackages);

        if (selectAll) {
            packageKeys.forEach(key => this.selectedPackages.add(key));
        } else {
            packageKeys.forEach(key => this.selectedPackages.delete(key));
        }

        // Update checkboxes and item appearance
        packageKeys.forEach(key => {
            const item = document.querySelector(`[data-package-key="${key}"]`);
            if (item) {
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = selectAll;
                }
                item.classList.toggle('selected', selectAll);
            }
        });

        this.updateSelectionInfo();
    }

    /**
     * Update selection info display
     */
    updateSelectionInfo() {
        const totalCount = Object.keys(this.filteredPackages).length;
        const selectedCount = this.selectedPackages.size;

        const totalCountElement = document.getElementById('total-appx-packages-count');
        if (totalCountElement) {
            totalCountElement.textContent = `${totalCount} packages found`;
        }

        const selectionCountElement = document.getElementById('appx-selection-count');
        if (selectionCountElement) {
            selectionCountElement.textContent = `${selectedCount} packages selected`;
        }

        // Update action button states
        const uninstallSelectedBtn = document.getElementById('uninstall-selected-appx');

        // Count installed selected packages
        let installedCount = 0;

        this.selectedPackages.forEach(key => {
            const pkg = this.filteredPackages[key];
            if (pkg && pkg.isInstalled) {
                installedCount++;
            }
        });

        if (uninstallSelectedBtn) {
            uninstallSelectedBtn.disabled = installedCount === 0;
        }

        // Update select all checkbox state
        const selectAllCheckbox = document.getElementById('select-all-appx');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = selectedCount > 0 && selectedCount === totalCount;
            selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalCount;
        }
    }



    /**
     * Uninstall a single package
     */
    async uninstallPackage(packageKey) {
        const pkg = this.packages[packageKey];
        if (!pkg) return;

        const confirmed = await this.showConfirmDialog(
            'Uninstall Package',
            `Are you sure you want to uninstall "${pkg.name}"?\n\nThis action cannot be undone.`
        );

        if (!confirmed) return;

        await this.executeUninstall([packageKey]);
    }



    /**
     * Uninstall selected packages
     */
    async uninstallSelectedPackages() {
        if (this.selectedPackages.size === 0) return;

        // Filter only packages that are installed
        const packagesToUninstall = Array.from(this.selectedPackages).filter(key => {
            const pkg = this.packages[key];
            return pkg && pkg.isInstalled;
        });

        if (packagesToUninstall.length === 0) {
            this.showStatus('No installed packages selected', 'warning');
            return;
        }

        const packageNames = packagesToUninstall.map(key =>
            this.packages[key]?.name || key
        ).join(', ');

        const confirmed = await this.showConfirmDialog(
            'Uninstall Selected Packages',
            `Are you sure you want to uninstall ${packagesToUninstall.length} selected packages?\n\nPackages: ${packageNames}\n\nThis action cannot be undone.`
        );

        if (!confirmed) return;

        await this.executeUninstall(packagesToUninstall);
    }



    /**
     * Execute package uninstallation
     */
    async executeUninstall(packageKeys) {
        if (packageKeys.length === 0) return;

        this.showProgress('Uninstalling Packages', 'Preparing to uninstall packages...', 'uninstalling');

        try {
            for (let i = 0; i < packageKeys.length; i++) {
                const packageKey = packageKeys[i];
                const pkg = this.packages[packageKey];

                if (!pkg) continue;

                this.updateProgress(`Uninstalling ${pkg.name}...`, ((i + 1) / packageKeys.length) * 100);

                // Check if package is safe to remove
                if (!pkg.safeToRemove) {
                    this.appendProgressOutput(`⚠ Warning: ${pkg.name} is not recommended for removal\n`);
                    this.appendProgressOutput(`Consequences: ${pkg.consequences}\n`);
                }

                this.appendProgressOutput(`Attempting to uninstall: ${pkg.name} (${pkg.packageName})\n`);

                // Use appropriate PowerShell command based on package type
                let command;
                if (this.packageType === 'provisioned') {
                    const escapedPackageName = pkg.packageName.replace(/'/g, "''");
                    command = `Remove-AppxProvisionedPackage -Online -PackageName '${escapedPackageName}'`;
                } else {
                    // Use a simpler, more reliable approach
                    const packageIdentifier = pkg.packageName || pkg.name;
                    // Escape any special characters in the package name
                    const escapedPackageName = packageIdentifier.replace(/'/g, "''");
                    command = `Get-AppxPackage -Name '${escapedPackageName}' | Remove-AppxPackage`;
                }

                this.appendProgressOutput(`Executing: ${command}\n`);

                try {
                    let result = await window.electronAPI.executePowerShell(command);
                    this.appendProgressOutput(`✓ Successfully uninstalled ${pkg.name}\n`);
                    // Remove from local data
                    delete this.packages[packageKey];
                    this.selectedPackages.delete(packageKey);
                } catch (error) {
                    // Try alternative command if the first one failed
                    this.appendProgressOutput(`First attempt failed, trying alternative method...\n`);
                    const packageIdentifier = pkg.packageName || pkg.name;
                    const escapedPackageName = packageIdentifier.replace(/'/g, "''");
                    // Use a simpler alternative command
                    const altCommand = `Get-AppxPackage -AllUsers -Name '${escapedPackageName}' | Remove-AppxPackage -AllUsers`;
                    this.appendProgressOutput(`Executing alternative: ${altCommand}\n`);

                    try {
                        let result = await window.electronAPI.executePowerShell(altCommand);
                        this.appendProgressOutput(`✓ Successfully uninstalled ${pkg.name} (alternative method)\n`);
                        // Remove from local data
                        delete this.packages[packageKey];
                        this.selectedPackages.delete(packageKey);
                    } catch (error) {
                        // Try third method with wildcard
                        this.appendProgressOutput(`Second attempt failed, trying wildcard method...\n`);
                        const wildcardCommand = `Get-AppxPackage '*${escapedPackageName}*' | Remove-AppxPackage`;
                        this.appendProgressOutput(`Executing wildcard: ${wildcardCommand}\n`);

                        try {
                            let result = await window.electronAPI.executePowerShell(wildcardCommand);
                            this.appendProgressOutput(`✓ Successfully uninstalled ${pkg.name} (wildcard method)\n`);
                            // Remove from local data
                            delete this.packages[packageKey];
                            this.selectedPackages.delete(packageKey);
                        } catch (error) {
                            this.appendProgressOutput(`✗ Failed to uninstall ${pkg.name}: ${error.message || 'Unknown error'}\n`);
                            this.appendProgressOutput(`Package may not be installed or may require administrator privileges\n`);
                        }
                    }
                }
            }

            this.updateProgress('Uninstallation completed', 100);

            // Refresh the package list
            setTimeout(() => {
                this.hideProgress();
                this.filterPackages();
                this.renderPackages();
                this.showStatus('Package uninstallation completed', 'success');
            }, 2000);

        } catch (error) {
            this.updateProgressError(`Error during uninstallation: ${error.message}`);
        }
    }

    /**
     * Refresh packages list
     */
    async refreshPackages() {
        this.selectedPackages.clear();
        await this.loadPackages();
        this.renderPackages();
    }

    /**
     * Export package list to file
     */
    async exportPackageList() {
        try {
            const packageData = Object.keys(this.filteredPackages).map(key => {
                const pkg = this.filteredPackages[key];
                return {
                    name: pkg.name,
                    fullName: pkg.fullName,
                    version: pkg.version,
                    publisher: pkg.publisher,
                    type: pkg.type
                };
            });

            const csvContent = this.convertToCSV(packageData);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `appx-packages-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showStatus('Package list exported successfully', 'success');
        } catch (error) {
            this.showStatus('Error exporting package list: ' + error.message, 'error');
        }
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];

        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${value.toString().replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        });

        return csvRows.join('\n');
    }

    /**
     * Show confirmation dialog
     */
    async showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const confirmed = confirm(`${title}\n\n${message}`);
            resolve(confirmed);
        });
    }

    /**
     * Show progress modal
     */
    showProgress(title, message, operation) {
        this.currentOperation = operation;

        const modal = document.getElementById('appx-progress-modal');
        const titleElement = document.getElementById('appx-progress-title');
        const textElement = document.getElementById('appx-progress-text');
        const outputElement = document.getElementById('appx-progress-output');
        const progressBar = document.getElementById('appx-progress-bar');

        if (modal) modal.style.display = 'flex';
        if (titleElement) titleElement.textContent = title;
        if (textElement) textElement.textContent = message;
        if (outputElement) outputElement.textContent = '';
        if (progressBar) progressBar.style.width = '0%';
    }

    /**
     * Update progress
     */
    updateProgress(message, percentage) {
        const textElement = document.getElementById('appx-progress-text');
        const progressBar = document.getElementById('appx-progress-bar');

        if (textElement) textElement.textContent = message;
        if (progressBar) progressBar.style.width = `${percentage}%`;
    }

    /**
     * Append output to progress modal
     */
    appendProgressOutput(text) {
        const outputElement = document.getElementById('appx-progress-output');
        if (outputElement) {
            outputElement.textContent += text;
            outputElement.scrollTop = outputElement.scrollHeight;
        }
    }

    /**
     * Update progress with error
     */
    updateProgressError(message) {
        this.updateProgress(message, 100);
        this.appendProgressOutput(`\nERROR: ${message}\n`);

        setTimeout(() => {
            this.hideProgress();
        }, 5000);
    }

    /**
     * Hide progress modal
     */
    hideProgress() {
        const modal = document.getElementById('appx-progress-modal');
        if (modal) modal.style.display = 'none';
        this.currentOperation = null;
    }

    /**
     * Cancel current operation
     */
    cancelCurrentOperation() {
        if (this.currentOperation) {
            this.hideProgress();
            this.showStatus('Operation cancelled', 'info');
        }
    }

    /**
     * Show loading indicator
     */
    showLoading(show) {
        const loadingIndicator = document.getElementById('appx-loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Show status message
     */
    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('appx-status-message');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-message ${type}`;
            statusElement.style.display = 'block';

            // Auto-hide after 5 seconds
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Load sample data for demonstration when JSON loading fails
     */
    loadSampleData() {
        this.packages = {
            'Microsoft.WindowsStore': {
                name: 'Microsoft Store',
                packageName: 'Microsoft.WindowsStore',
                fullName: 'Microsoft.WindowsStore_12011.1001.113.0_x64__8wekyb3d8bbwe',
                publisher: 'Microsoft Corporation',
                description: 'Microsoft Store app for downloading and managing applications',
                category: 'store',
                icon: 'fas fa-store',
                type: 'system',
                safeToRemove: true,
                consequences: 'You won\'t be able to install apps from Microsoft Store',
                isInstalled: true,
                version: '12011.1001.113.0'
            },
            'Microsoft.XboxGamingOverlay': {
                name: 'Xbox Game Bar',
                packageName: 'Microsoft.XboxGamingOverlay',
                fullName: 'Microsoft.XboxGamingOverlay_7.124.4152.0_x64__8wekyb3d8bbwe',
                publisher: 'Microsoft Corporation',
                description: 'Xbox Game Bar for gaming features and screen recording',
                category: 'gaming',
                icon: 'fab fa-xbox',
                type: 'user',
                safeToRemove: true,
                consequences: 'Game recording and Xbox features will be unavailable',
                isInstalled: true,
                version: '7.124.4152.0'
            },
            'Microsoft.BingWeather': {
                name: 'Weather',
                packageName: 'Microsoft.BingWeather',
                fullName: 'Microsoft.BingWeather_4.53.52321.0_x64__8wekyb3d8bbwe',
                publisher: 'Microsoft Corporation',
                description: 'Weather forecast application',
                category: 'information',
                icon: 'fas fa-cloud-sun',
                type: 'user',
                safeToRemove: true,
                consequences: 'Weather app will be removed',
                isInstalled: true,
                version: '4.53.52321.0'
            },
            'Microsoft.WindowsCalculator': {
                name: 'Calculator',
                packageName: 'Microsoft.WindowsCalculator',
                fullName: 'Microsoft.WindowsCalculator_11.2401.0.0_x64__8wekyb3d8bbwe',
                publisher: 'Microsoft Corporation',
                description: 'Calculator application',
                category: 'utilities',
                icon: 'fas fa-calculator',
                type: 'system',
                safeToRemove: false,
                consequences: 'Calculator app will be unavailable',
                isInstalled: true,
                version: '11.2401.0.0'
            },
            'Microsoft.MicrosoftSolitaireCollection': {
                name: 'Microsoft Solitaire Collection',
                packageName: 'Microsoft.MicrosoftSolitaireCollection',
                fullName: 'Microsoft.MicrosoftSolitaireCollection_4.19.4060.0_x64__8wekyb3d8bbwe',
                publisher: 'Microsoft Corporation',
                description: 'Collection of solitaire card games',
                category: 'games',
                icon: 'fas fa-heart',
                type: 'user',
                safeToRemove: true,
                consequences: 'Solitaire games will be removed',
                isInstalled: true,
                version: '4.19.4060.0'
            },
            'Microsoft.YourPhone': {
                name: 'Phone Link',
                packageName: 'Microsoft.YourPhone',
                fullName: 'Microsoft.YourPhone_1.24032.147.0_x64__8wekyb3d8bbwe',
                publisher: 'Microsoft Corporation',
                description: 'Connect your Android phone to your PC',
                category: 'connectivity',
                icon: 'fas fa-mobile-alt',
                type: 'user',
                safeToRemove: true,
                consequences: 'Phone integration features will be removed',
                isInstalled: true,
                version: '1.24032.147.0'
            }
        };

        this.filterPackages();
        this.showStatus(`Loaded ${Object.keys(this.packages).length} sample AppX packages for demonstration`, 'info');
    }



    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the AppX Package Manager when the DOM is loaded
let appxPackageManager;

// Initialize when tab is loaded
document.addEventListener('DOMContentLoaded', () => {
    appxPackageManager = new AppXPackageManager();
    appxPackageManager.init();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!appxPackageManager) {
            appxPackageManager = new AppXPackageManager();
            appxPackageManager.init();
        }
    });
} else {
    appxPackageManager = new AppXPackageManager();
    appxPackageManager.init();
}

console.log('AppX Packages tab script loaded');
