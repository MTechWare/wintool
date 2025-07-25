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
        try {
            // Load packages
            await this.loadPackages();

            // Setup event listeners
            this.setupEventListeners();

            // Render initial package list
            this.renderPackages();

            // Signal that this tab is ready
            if (window.markTabAsReady) {
                window.markTabAsReady('appx-packages');
            }
        } catch (error) {
            console.error('Error initializing AppX Package Manager:', error);
            this.showStatus('Error initializing AppX Package Manager: ' + error.message, 'error');
            
            // Still signal ready even if there was an error
            if (window.markTabAsReady) {
                window.markTabAsReady('appx-packages');
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

        // Header refresh button
        const refreshHeaderBtn = document.getElementById('refresh-appx-header');
        if (refreshHeaderBtn) {
            refreshHeaderBtn.addEventListener('click', () => {
                this.refreshPackages();
            });
        }

        const exportBtn = document.getElementById('export-appx-list');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportPackageList();
            });
        }

        const backupBtn = document.getElementById('backup-appx-list');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                this.backupInstalledPackages();
            });
        }

        // Cancel operation button
        const cancelBtn = document.getElementById('appx-cancel-operation');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelCurrentOperation();
            });
        }

        // Details modal event listeners
        const closeDetailsBtn = document.getElementById('appx-close-details');
        if (closeDetailsBtn) {
            closeDetailsBtn.addEventListener('click', () => {
                this.hideDetailsModal();
            });
        }

        const detailsCloseBtn = document.getElementById('appx-details-close');
        if (detailsCloseBtn) {
            detailsCloseBtn.addEventListener('click', () => {
                this.hideDetailsModal();
            });
        }

        const detailsUninstallBtn = document.getElementById('appx-details-uninstall');
        if (detailsUninstallBtn) {
            detailsUninstallBtn.addEventListener('click', () => {
                const packageKey = detailsUninstallBtn.getAttribute('data-package');
                if (packageKey) {
                    this.hideDetailsModal();
                    this.uninstallPackage(packageKey);
                }
            });
        }

        // Close modal when clicking outside
        const detailsModal = document.getElementById('appx-details-modal');
        if (detailsModal) {
            detailsModal.addEventListener('click', (e) => {
                if (e.target === detailsModal) {
                    this.hideDetailsModal();
                }
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

            // Get installed packages from PowerShell to check which ones are actually installed
            const installedPackages = await this.getInstalledPackages();

            // Process packages and mark which ones are installed
            this.packages = {};

            Object.keys(packageData.packages).forEach(packageKey => {
                const pkgDef = packageData.packages[packageKey];
                const isInstalled = this.isPackageInstalled(packageKey, installedPackages);

                // Normalize package type to user or system only
                const normalizedType = pkgDef.type === 'user' ? 'user' : 'system';

                if (this.packageType === 'all' ||
                    (this.packageType === 'user' && normalizedType === 'user') ||
                    (this.packageType === 'system' && normalizedType === 'system')) {

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
                        version: null // Will be updated if detected
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
     * Get installed packages from PowerShell with enhanced information
     */
    async getInstalledPackages() {
        try {
            // Enhanced command to get more package details including size, install date, and architecture
            const command = `Get-AppxPackage | Select-Object Name, PackageFullName, Version, Publisher, InstallLocation, SignatureKind, Status, Architecture, IsFramework, IsBundle, @{Name='SizeGB';Expression={if($_.InstallLocation -and (Test-Path $_.InstallLocation)){[math]::Round((Get-ChildItem $_.InstallLocation -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1GB, 2)} else {0}}}, @{Name='InstallDate';Expression={if($_.InstallLocation -and (Test-Path $_.InstallLocation)){(Get-ItemProperty $_.InstallLocation -ErrorAction SilentlyContinue).CreationTime} else {$null}}} | ConvertTo-Json -Depth 3`;

            const result = await window.electronAPI.executePowerShell(command);

            if (result && result.trim()) {
                let packagesData = JSON.parse(result.trim());

                // Ensure it's an array
                if (!Array.isArray(packagesData)) {
                    packagesData = packagesData ? [packagesData] : [];
                }

                return packagesData;
            }
        } catch (error) {
            console.warn('Enhanced AppX command failed, trying basic command:', error.message);
            // Fallback to basic command if enhanced fails
            try {
                const basicCommand = 'Get-AppxPackage | Select-Object Name, PackageFullName, Version, Publisher, Architecture | ConvertTo-Json -Depth 3';
                const basicResult = await window.electronAPI.executePowerShell(basicCommand);

                if (basicResult && basicResult.trim()) {
                    let packagesData = JSON.parse(basicResult.trim());
                    if (!Array.isArray(packagesData)) {
                        packagesData = packagesData ? [packagesData] : [];
                    }
                    return packagesData;
                }
            } catch (fallbackError) {
                console.error('Both AppX commands failed:', fallbackError.message);
                // Both commands failed, return empty array
            }
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
     * Determine package type based on package info - simplified to user or system only
     */
    determinePackageType(pkg) {
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

        // Status with enhanced information
        const status = document.createElement('div');
        status.className = 'appx-package-status';

        if (pkg.isInstalled) {
            status.innerHTML = `
                <div class="status-main">
                    <span class="status-badge installed">Installed</span>
                    ${pkg.version && pkg.version !== 'Unknown' ? `<span class="version-text">v${pkg.version}</span>` : ''}
                </div>
                ${pkg.sizeGB ? `<div class="size-info">${pkg.sizeGB < 0.01 ? '< 10 MB' : pkg.sizeGB.toFixed(2) + ' GB'}</div>` : ''}
            `;
        } else {
            status.innerHTML = `
                <div class="status-main">
                    <span class="status-badge not-installed">Not Installed</span>
                </div>
            `;
        }

        // Enhanced Type with safety indicator
        const type = document.createElement('div');
        type.className = 'appx-package-type';

        const typeSafetyContainer = document.createElement('div');
        typeSafetyContainer.className = 'type-safety-container';

        // Package type badge - normalize to user or system only
        const packageType = pkg.type === 'user' ? 'user' : 'system';
        const typeBadge = document.createElement('div');
        typeBadge.className = `package-type-badge ${packageType}`;

        // Add appropriate icon for package type
        const typeIcon = document.createElement('i');
        if (packageType === 'user') {
            typeIcon.className = 'fas fa-user';
            typeBadge.title = 'User Package - Installed by user, generally safe to remove';
        } else {
            typeIcon.className = 'fas fa-cog';
            typeBadge.title = 'System Package - Core Windows component, removal may cause issues';
        }

        const typeText = document.createElement('span');
        typeText.textContent = packageType.toUpperCase();

        typeBadge.appendChild(typeIcon);
        typeBadge.appendChild(typeText);

        // Safety indicator
        const safetyIndicator = document.createElement('div');
        safetyIndicator.className = `safety-indicator ${pkg.safeToRemove ? 'safe' : 'unsafe'}`;

        const safetyIcon = document.createElement('div');
        safetyIcon.className = 'safety-icon';
        safetyIcon.textContent = pkg.safeToRemove ? '✓' : '!';

        const safetyText = document.createElement('span');
        safetyText.textContent = pkg.safeToRemove ? 'SAFE' : 'CAUTION';

        safetyIndicator.appendChild(safetyIcon);
        safetyIndicator.appendChild(safetyText);

        if (pkg.safeToRemove) {
            safetyIndicator.title = 'Safe to remove - No critical system dependencies';
        } else {
            safetyIndicator.title = 'Caution - May be required by system or other applications';
        }

        typeSafetyContainer.appendChild(typeBadge);
        typeSafetyContainer.appendChild(safetyIndicator);
        type.appendChild(typeSafetyContainer);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'appx-package-actions';

        // Details button (always show)
        const detailsBtn = document.createElement('button');
        detailsBtn.className = 'appx-package-action-btn appx-details-btn';
        detailsBtn.title = 'View Package Details';
        detailsBtn.innerHTML = '<i class="fas fa-info-circle"></i>';
        detailsBtn.onclick = () => this.showPackageDetails(key);
        actions.appendChild(detailsBtn);

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
        item.appendChild(status);
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

                // Update current package display
                this.updateCurrentPackage({
                    name: pkg.name,
                    publisher: pkg.publisher || 'Microsoft Corporation',
                    version: pkg.version || 'Unknown',
                    status: 'Uninstalling',
                    statusClass: ''
                });

                this.updateProgress(`Uninstalling ${pkg.name}...`, ((i + 1) / packageKeys.length) * 100);

                // Check if package is safe to remove
                if (!pkg.safeToRemove) {
                    this.appendProgressOutput(`⚠ Warning: ${pkg.name} is not recommended for removal\n`);
                    this.appendProgressOutput(`Consequences: ${pkg.consequences}\n`);
                }

                this.appendProgressOutput(`Attempting to uninstall: ${pkg.name} (${pkg.packageName})\n`);

                // Use standard PowerShell command for all packages
                const packageIdentifier = pkg.packageName || pkg.name;
                // Escape any special characters in the package name
                const escapedPackageName = packageIdentifier.replace(/'/g, "''");
                const command = `Get-AppxPackage -Name '${escapedPackageName}' | Remove-AppxPackage`;

                this.appendProgressOutput(`Executing: ${command}\n`);

                try {
                    let result = await window.electronAPI.executePowerShell(command);
                    this.appendProgressOutput(`✓ Successfully uninstalled ${pkg.name}\n`);

                    // Update package status to completed
                    this.updateCurrentPackage({
                        name: pkg.name,
                        publisher: pkg.publisher || 'Microsoft Corporation',
                        version: pkg.version || 'Unknown',
                        status: 'Uninstalled',
                        statusClass: 'success'
                    });

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

                            // Update package status to error
                            this.updateCurrentPackage({
                                name: pkg.name,
                                publisher: pkg.publisher || 'Microsoft Corporation',
                                version: pkg.version || 'Unknown',
                                status: 'Error',
                                statusClass: 'error'
                            });
                        }
                    }
                }
            }

            // Complete with success
            this.completeProgress('Uninstallation completed successfully');

            // Refresh the package list after a short delay
            setTimeout(() => {
                this.filterPackages();
                this.renderPackages();
                this.showStatus('Package uninstallation completed', 'success');
            }, 1000);

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
     * Show package details modal
     */
    showPackageDetails(packageKey) {
        const pkg = this.packages[packageKey];
        if (!pkg) return;

        const modal = document.getElementById('appx-details-modal');
        const title = document.getElementById('appx-details-title');
        const content = document.getElementById('appx-details-content');
        const uninstallBtn = document.getElementById('appx-details-uninstall');

        title.textContent = `${pkg.name} - Details`;

        // Format size
        const formatSize = (sizeGB) => {
            if (!sizeGB || sizeGB === 0) return 'Not Available';
            if (sizeGB < 0.01) return '< 10 MB';
            return `${sizeGB.toFixed(2)} GB`;
        };

        // Format date
        const formatDate = (dateStr) => {
            if (!dateStr) return 'Not Available';
            try {
                return new Date(dateStr).toLocaleDateString();
            } catch {
                return 'Not Available';
            }
        };

        // Build details content
        content.innerHTML = `
            <div class="detail-section">
                <h4>Basic Information</h4>
                <div class="detail-grid">
                    <div class="detail-label">Package Name:</div>
                    <div class="detail-value">${this.escapeHtml(pkg.name)}</div>

                    <div class="detail-label">Full Name:</div>
                    <div class="detail-value code">${this.escapeHtml(pkg.fullName || pkg.packageName || 'N/A')}</div>

                    <div class="detail-label">Publisher:</div>
                    <div class="detail-value">${this.escapeHtml(pkg.publisher || 'Not Available')}</div>

                    <div class="detail-label">Version:</div>
                    <div class="detail-value">${pkg.version && pkg.version !== 'Unknown' ? this.escapeHtml(pkg.version) : 'Not Available'}</div>

                    <div class="detail-label">Architecture:</div>
                    <div class="detail-value">${this.escapeHtml(pkg.architecture || 'Not Available')}</div>
                </div>
            </div>

            <div class="detail-section">
                <h4>Installation Details</h4>
                <div class="detail-grid">
                    <div class="detail-label">Status:</div>
                    <div class="detail-value">
                        <span class="detail-badge ${pkg.installed ? 'safe' : 'warning'}">
                            ${pkg.installed ? 'Installed' : 'Not Installed'}
                        </span>
                    </div>

                    <div class="detail-label">Size:</div>
                    <div class="detail-value">${formatSize(pkg.sizeGB)}</div>

                    <div class="detail-label">Install Date:</div>
                    <div class="detail-value">${formatDate(pkg.installDate)}</div>

                    <div class="detail-label">Install Location:</div>
                    <div class="detail-value code">${this.escapeHtml(pkg.installLocation || 'N/A')}</div>

                    <div class="detail-label">Signature:</div>
                    <div class="detail-value">${this.escapeHtml(pkg.signatureKind || 'Not Available')}</div>
                </div>
            </div>

            <div class="detail-section">
                <h4>Package Properties</h4>
                <div class="detail-grid">
                    <div class="detail-label">Type:</div>
                    <div class="detail-value">
                        <span class="detail-badge ${pkg.type === 'system' ? 'warning' : 'safe'}">
                            ${pkg.type || 'Not Available'}
                        </span>
                    </div>

                    <div class="detail-label">Framework:</div>
                    <div class="detail-value">${pkg.isFramework ? 'Yes' : 'No'}</div>

                    <div class="detail-label">Bundle:</div>
                    <div class="detail-value">${pkg.isBundle ? 'Yes' : 'No'}</div>

                    <div class="detail-label">Safe to Remove:</div>
                    <div class="detail-value">
                        <span class="detail-badge ${pkg.safeToRemove ? 'safe' : 'danger'}">
                            ${pkg.safeToRemove ? 'Yes' : 'No'}
                        </span>
                    </div>
                </div>
            </div>

            ${pkg.description ? `
            <div class="detail-section">
                <h4>Description</h4>
                <div class="detail-value">${this.escapeHtml(pkg.description)}</div>
            </div>
            ` : ''}

            ${pkg.consequences ? `
            <div class="detail-section">
                <h4>Removal Consequences</h4>
                <div class="detail-value" style="color: var(--warning-color);">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 5px;"></i>
                    ${this.escapeHtml(pkg.consequences)}
                </div>
            </div>
            ` : ''}
        `;

        // Show/hide uninstall button based on installation status
        if (pkg.installed && uninstallBtn) {
            uninstallBtn.style.display = 'block';
            uninstallBtn.setAttribute('data-package', packageKey);
        } else if (uninstallBtn) {
            uninstallBtn.style.display = 'none';
        }

        modal.style.display = 'flex';
    }

    /**
     * Hide package details modal
     */
    hideDetailsModal() {
        const modal = document.getElementById('appx-details-modal');
        modal.style.display = 'none';
    }

    /**
     * Backup installed packages list with PowerShell commands for restoration
     */
    async backupInstalledPackages() {
        try {
            this.showStatus('Creating backup of installed packages...', 'info');

            // Get all installed packages with detailed information
            const installedPackages = Object.keys(this.packages)
                .filter(key => this.packages[key].installed)
                .map(key => {
                    const pkg = this.packages[key];
                    return {
                        name: pkg.name,
                        packageName: pkg.packageName,
                        fullName: pkg.fullName,
                        version: pkg.version,
                        publisher: pkg.publisher,
                        architecture: pkg.architecture,
                        installLocation: pkg.installLocation,
                        backupDate: new Date().toISOString(),
                        restoreCommand: `Get-AppxPackage -Name "${pkg.packageName}" | Remove-AppxPackage`
                    };
                });

            // Create backup data with metadata
            const backupData = {
                metadata: {
                    backupDate: new Date().toISOString(),
                    totalPackages: installedPackages.length,
                    systemInfo: {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform
                    }
                },
                packages: installedPackages,
                restoreInstructions: [
                    "This backup contains a list of AppX packages that were installed at the time of backup.",
                    "To restore packages, you would need to reinstall them from the Microsoft Store or other sources.",
                    "The restoreCommand field shows the PowerShell command that was used to uninstall each package.",
                    "Note: This backup does not contain the actual package files, only the list and metadata."
                ]
            };

            // Create and download backup file
            const backupJson = JSON.stringify(backupData, null, 2);
            const blob = new Blob([backupJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `appx-packages-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showStatus(`Backup created successfully! ${installedPackages.length} packages backed up.`, 'success');
        } catch (error) {
            console.error('Error creating backup:', error);
            this.showStatus('Error creating backup: ' + error.message, 'error');
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
        const subtitleElement = document.getElementById('appx-progress-subtitle');
        const textElement = document.getElementById('appx-progress-text');
        const outputElement = document.getElementById('appx-progress-output');
        const progressBar = document.getElementById('appx-progress-bar');
        const statusElement = document.getElementById('appx-operation-status');
        const percentageElement = document.getElementById('appx-progress-percentage');
        const timeElement = document.getElementById('appx-time-elapsed');

        if (modal) {
            modal.style.display = 'flex';
            modal.className = 'progress-modal';
        }

        if (titleElement) titleElement.textContent = title;
        if (subtitleElement) subtitleElement.textContent = this.getOperationSubtitle(operation);
        if (textElement) textElement.textContent = message;
        if (outputElement) outputElement.textContent = '';
        if (progressBar) progressBar.style.width = '0%';
        if (statusElement) statusElement.textContent = 'Initializing...';
        if (percentageElement) percentageElement.textContent = '0%';
        if (timeElement) timeElement.textContent = '00:00';

        // Set appropriate icon
        this.updateProgressIcon(operation);

        // Hide action buttons initially
        this.hideActionButtons();

        // Hide current package section initially
        const currentPackageSection = document.getElementById('appx-current-package');
        if (currentPackageSection) {
            currentPackageSection.style.display = 'none';
        }

        // Start with output section collapsed
        const outputSection = document.querySelector('.progress-output-section');
        if (outputSection) {
            outputSection.classList.add('collapsed');
            const toggleBtn = document.getElementById('appx-toggle-output');
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('i');
                if (icon) icon.className = 'fas fa-chevron-down';
                toggleBtn.title = 'Expand Output';
            }
        }

        // Start timer
        this.startTimer();

        // Setup event listeners
        this.setupModalEventListeners();
    }

    getOperationSubtitle(operationType) {
        const subtitles = {
            'uninstalling': 'Removing AppX packages from your system',
            'refreshing': 'Refreshing package information'
        };
        return subtitles[operationType] || 'Processing AppX package operation';
    }

    updateProgressIcon(operationType) {
        const iconElement = document.getElementById('appx-progress-icon');
        if (!iconElement) return;

        const icons = {
            'uninstalling': 'fas fa-trash',
            'refreshing': 'fas fa-sync-alt'
        };

        const iconClass = icons[operationType] || 'fab fa-microsoft';
        iconElement.innerHTML = `<i class="${iconClass}"></i>`;
    }

    startTimer() {
        this.operationStartTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.operationStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            const timeElement = document.getElementById('appx-time-elapsed');
            if (timeElement) {
                timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    hideActionButtons() {
        const buttons = ['appx-retry-operation', 'appx-view-logs', 'appx-done-modal'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = 'none';
        });
    }

    showActionButton(buttonId) {
        const btn = document.getElementById(buttonId);
        if (btn) btn.style.display = 'flex';
    }

    setupModalEventListeners() {
        // Setup close button
        this.setupCloseButton();

        // Setup minimize button
        const minimizeBtn = document.getElementById('appx-minimize-modal');
        if (minimizeBtn && !minimizeBtn.hasAttribute('data-listener-attached')) {
            minimizeBtn.addEventListener('click', () => this.toggleMinimize());
            minimizeBtn.setAttribute('data-listener-attached', 'true');
        }

        // Setup cancel button
        const cancelBtn = document.getElementById('appx-cancel-operation');
        if (cancelBtn && !cancelBtn.hasAttribute('data-listener-attached')) {
            cancelBtn.addEventListener('click', () => this.cancelOperation());
            cancelBtn.setAttribute('data-listener-attached', 'true');
        }

        // Setup output controls
        this.setupOutputControls();

        // Setup action buttons
        this.setupActionButtons();

        // Add click-outside-to-close functionality
        const modal = document.getElementById('appx-progress-modal');
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.hideProgress();
                }
            };
        }

        // Add escape key to close
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideProgress();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    setupCloseButton() {
        const closeBtn = document.getElementById('appx-close-modal');
        if (closeBtn && !closeBtn.hasAttribute('data-listener-attached')) {
            closeBtn.addEventListener('click', () => this.hideProgress());
            closeBtn.setAttribute('data-listener-attached', 'true');
        }
    }

    setupOutputControls() {
        // Clear output button
        const clearBtn = document.getElementById('appx-clear-output');
        if (clearBtn && !clearBtn.hasAttribute('data-listener-attached')) {
            clearBtn.addEventListener('click', () => {
                const outputElement = document.getElementById('appx-progress-output');
                if (outputElement) outputElement.textContent = '';
            });
            clearBtn.setAttribute('data-listener-attached', 'true');
        }

        // Copy output button
        const copyBtn = document.getElementById('appx-copy-output');
        if (copyBtn && !copyBtn.hasAttribute('data-listener-attached')) {
            copyBtn.addEventListener('click', () => {
                const outputElement = document.getElementById('appx-progress-output');
                if (outputElement && navigator.clipboard) {
                    navigator.clipboard.writeText(outputElement.textContent);
                    this.showTemporaryTooltip(copyBtn, 'Copied!');
                }
            });
            copyBtn.setAttribute('data-listener-attached', 'true');
        }

        // Toggle output button
        const toggleBtn = document.getElementById('appx-toggle-output');
        if (toggleBtn && !toggleBtn.hasAttribute('data-listener-attached')) {
            toggleBtn.addEventListener('click', () => {
                const outputSection = document.querySelector('.progress-output-section');
                const icon = toggleBtn.querySelector('i');

                if (outputSection.classList.contains('collapsed')) {
                    outputSection.classList.remove('collapsed');
                    icon.className = 'fas fa-chevron-up';
                    toggleBtn.title = 'Collapse Output';
                } else {
                    outputSection.classList.add('collapsed');
                    icon.className = 'fas fa-chevron-down';
                    toggleBtn.title = 'Expand Output';
                }
            });
            toggleBtn.setAttribute('data-listener-attached', 'true');
        }
    }

    setupActionButtons() {
        // Retry button
        const retryBtn = document.getElementById('appx-retry-operation');
        if (retryBtn && !retryBtn.hasAttribute('data-listener-attached')) {
            retryBtn.addEventListener('click', () => {
                this.retryLastOperation();
            });
            retryBtn.setAttribute('data-listener-attached', 'true');
        }

        // View logs button
        const logsBtn = document.getElementById('appx-view-logs');
        if (logsBtn && !logsBtn.hasAttribute('data-listener-attached')) {
            logsBtn.addEventListener('click', () => {
                this.openLogsWindow();
            });
            logsBtn.setAttribute('data-listener-attached', 'true');
        }

        // Done button
        const doneBtn = document.getElementById('appx-done-modal');
        if (doneBtn && !doneBtn.hasAttribute('data-listener-attached')) {
            doneBtn.addEventListener('click', () => {
                this.hideProgress();
            });
            doneBtn.setAttribute('data-listener-attached', 'true');
        }
    }

    toggleMinimize() {
        const modal = document.getElementById('appx-progress-modal');
        if (modal) {
            modal.classList.toggle('minimized');
            const minimizeBtn = document.getElementById('appx-minimize-modal');
            const icon = minimizeBtn?.querySelector('i');
            if (icon) {
                if (modal.classList.contains('minimized')) {
                    icon.className = 'fas fa-window-maximize';
                } else {
                    icon.className = 'fas fa-minus';
                }
            }
        }
    }

    showTemporaryTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: var(--background-dark);
            color: var(--text-primary);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10001;
            pointer-events: none;
        `;

        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - 30) + 'px';

        document.body.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 2000);
    }

    retryLastOperation() {
        console.log('Retry operation requested');
        // This would need to be implemented based on the specific operation
    }

    openLogsWindow() {
        console.log('Open logs window requested');
        // This would open a detailed log viewer
    }

    cancelOperation() {
        this.currentOperation = null;
        this.hideProgress();
    }

    /**
     * Update progress
     */
    updateProgress(message, percentage) {
        const textElement = document.getElementById('appx-progress-text');
        const progressBar = document.getElementById('appx-progress-bar');
        const statusElement = document.getElementById('appx-operation-status');
        const percentageElement = document.getElementById('appx-progress-percentage');

        if (textElement) textElement.textContent = message;
        if (progressBar) progressBar.style.width = `${percentage}%`;
        if (statusElement) statusElement.textContent = message;
        if (percentageElement) percentageElement.textContent = `${Math.round(percentage)}%`;
    }

    updateCurrentPackage(packageInfo) {
        const currentPackageSection = document.getElementById('appx-current-package');
        const nameElement = document.getElementById('appx-current-name');
        const publisherElement = document.getElementById('appx-current-publisher');
        const versionElement = document.getElementById('appx-current-version');
        const statusElement = document.getElementById('appx-current-status');

        if (packageInfo && currentPackageSection) {
            currentPackageSection.style.display = 'block';

            if (nameElement) nameElement.textContent = packageInfo.name || 'Unknown Package';
            if (publisherElement) publisherElement.textContent = packageInfo.publisher || 'Unknown Publisher';
            if (versionElement) versionElement.textContent = packageInfo.version || 'Unknown Version';
            if (statusElement) {
                statusElement.textContent = packageInfo.status || 'Processing';
                statusElement.className = `status-badge ${packageInfo.statusClass || ''}`;
            }
        } else if (currentPackageSection) {
            currentPackageSection.style.display = 'none';
        }
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
        // Stop timer
        this.stopTimer();

        const modal = document.getElementById('appx-progress-modal');
        const progressBar = document.getElementById('appx-progress-bar');
        const textElement = document.getElementById('appx-progress-text');
        const statusElement = document.getElementById('appx-operation-status');
        const iconElement = document.getElementById('appx-progress-icon');

        // Add error styling to modal
        if (modal) {
            modal.className = 'progress-modal error';
        }

        // Update progress bar with error styling
        if (progressBar) {
            progressBar.style.background = 'linear-gradient(90deg, #dc3545, #e74c3c)';
            progressBar.style.width = '100%';
        }

        // Update text elements
        if (textElement) {
            textElement.textContent = `Error: ${message}`;
            textElement.style.color = '#dc3545';
            textElement.style.fontWeight = '600';
        }

        if (statusElement) {
            statusElement.textContent = 'Error Occurred';
            statusElement.style.color = '#dc3545';
        }

        // Update icon
        if (iconElement) {
            iconElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        }

        // Update current package status if visible
        const currentStatusElement = document.getElementById('appx-current-status');
        if (currentStatusElement) {
            currentStatusElement.textContent = 'Error';
            currentStatusElement.className = 'status-badge error';
        }

        this.appendProgressOutput(`\n❌ ERROR: ${message}\n`);

        // Show retry button
        this.showActionButton('appx-retry-operation');
        this.showActionButton('appx-view-logs');

        // Auto-close after 10 seconds for errors
        setTimeout(() => {
            this.hideProgress();
        }, 10000);
    }

    /**
     * Complete progress with success
     */
    completeProgress(message = 'Operation completed') {
        // Stop timer
        this.stopTimer();

        this.updateProgress(message, 100);

        const modal = document.getElementById('appx-progress-modal');
        const progressBar = document.getElementById('appx-progress-bar');
        const textElement = document.getElementById('appx-progress-text');
        const statusElement = document.getElementById('appx-operation-status');
        const iconElement = document.getElementById('appx-progress-icon');

        // Add success styling to modal
        if (modal) {
            modal.className = 'progress-modal success';
        }

        // Update progress bar with success styling
        if (progressBar) {
            progressBar.style.background = 'linear-gradient(90deg, #28a745, #20c997)';
        }

        // Update text elements
        if (textElement) {
            textElement.textContent = message;
            textElement.style.color = '#28a745';
            textElement.style.fontWeight = '600';
        }

        if (statusElement) {
            statusElement.textContent = 'Completed Successfully';
            statusElement.style.color = '#28a745';
        }

        // Update icon
        if (iconElement) {
            iconElement.innerHTML = '<i class="fas fa-check"></i>';
        }

        // Update current package status if visible
        const currentStatusElement = document.getElementById('appx-current-status');
        if (currentStatusElement) {
            currentStatusElement.textContent = 'Completed';
            currentStatusElement.className = 'status-badge success';
        }

        // Show done button
        this.showActionButton('appx-done-modal');

        // Auto-close after 3 seconds
        setTimeout(() => {
            this.hideProgress();
        }, 3000);
    }

    /**
     * Hide progress modal
     */
    hideProgress() {
        // Stop timer
        this.stopTimer();

        const modal = document.getElementById('appx-progress-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.className = 'progress-modal'; // Reset modal class
        }

        this.currentOperation = null;

        // Reset modal content
        this.resetModalContent();
    }

    resetModalContent() {
        // Reset progress bar
        const progressBar = document.getElementById('appx-progress-bar');
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.style.background = 'linear-gradient(90deg, var(--primary-color), rgba(var(--primary-rgb), 0.8))';
        }

        // Reset text elements
        const textElement = document.getElementById('appx-progress-text');
        if (textElement) {
            textElement.style.color = 'var(--text-primary)';
            textElement.style.fontWeight = '500';
        }

        // Hide current package section
        const currentPackageSection = document.getElementById('appx-current-package');
        if (currentPackageSection) {
            currentPackageSection.style.display = 'none';
        }

        // Reset output section to collapsed state
        const outputSection = document.querySelector('.progress-output-section');
        if (outputSection) {
            outputSection.classList.add('collapsed');
            const toggleBtn = document.getElementById('appx-toggle-output');
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('i');
                if (icon) icon.className = 'fas fa-chevron-down';
                toggleBtn.title = 'Expand Output';
            }
        }

        // Hide action buttons
        this.hideActionButtons();

        // Clear output
        const outputElement = document.getElementById('appx-progress-output');
        if (outputElement) {
            outputElement.textContent = '';
        }
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


