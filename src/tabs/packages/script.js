/**
 * Packages Tab
 */

class PackageManager {
    constructor() {
        this.packages = {};
        this.filteredPackages = {};
        this.selectedPackages = new Set();
        this.currentCategory = 'all';
        this.searchTerm = '';
        this.currentOperation = null;
        this.currentPackageManager = 'winget';
        this.installedPackages = new Set();
        this.packagesWithUpdates = new Set();
        this.currentStatusFilter = 'all';
        this.currentOperationPackage = null;
        this.currentOperationType = null;
        this.securityConfig = {
            allowedWingetCommands: ['install', 'uninstall', 'search', 'list', 'show', 'upgrade'],
            allowedChocoCommands: ['install', 'uninstall', 'search', 'list', 'info', 'upgrade'],
            packageIdMaxLength: 200,
            packageIdPattern: /^[a-zA-Z0-9._-]+$/,
            chocoPackageIdPattern: /^[a-zA-Z0-9._-]+$/,
            maxConcurrentOperations: 3,
        };

        this.lazyHelper = new LazyLoadingHelper('packages');

        this.init();
    }

    validatePackageId(packageId) {
        if (!packageId || typeof packageId !== 'string') {
            return false;
        }

        if (packageId.length > this.securityConfig.packageIdMaxLength) {
            return false;
        }

        return this.securityConfig.packageIdPattern.test(packageId);
    }

    validateWingetCommand(command) {
        return this.securityConfig.allowedWingetCommands.includes(command);
    }

    validateChocoCommand(command) {
        return this.securityConfig.allowedChocoCommands.includes(command);
    }

    sanitizePackageId(packageId) {
        if (!packageId) return '';
        return packageId.replace(/[^a-zA-Z0-9._-]/g, '');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    ensureAllCategoryActive() {
        // Ensure the "All" category is selected and active when packages are loaded
        this.currentCategory = 'all';

        // Update the UI to reflect the active state
        const categoryButtons = document.querySelectorAll('.category-btn');
        categoryButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === 'all') {
                btn.classList.add('active');
            }
        });

        // Update the total package count to reflect all packages
        const totalPackages = Object.keys(this.packages).length;
        this.updateTotalPackageCount(totalPackages);
    }

    setupTabActivationListener() {
        // Listen for custom tab-switched events (if available)
        if (window.electronAPI && window.electronAPI.addTabListener) {
            window.electronAPI.addTabListener('tab-switched', event => {
                const { tabId } = event.detail;
                if (tabId === 'packages' || tabId === 'folder-packages') {
                    this.ensureAllCategoryActive();
                    this.filterPackages();
                }
            });
        }

        // Also listen for visibility changes as a fallback
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Check if packages tab is currently active
                const packagesTab = document.querySelector('.tab-content.active[id*="packages"]');
                if (packagesTab) {
                    this.ensureAllCategoryActive();
                    this.filterPackages();
                }
            }
        });
    }

    async init() {
        // Check if should initialize (lazy loading support)
        if (!this.lazyHelper.shouldInitialize()) {
            this.lazyHelper.markTabReady();
            return;
        }

        // Mark script as executed
        this.lazyHelper.markScriptExecuted();

        try {
            // Check Chocolatey availability
            await this.checkChocoAvailability();

            // Load packages from applications.json
            await this.loadPackages();

            // Setup event listeners
            this.setupEventListeners();

            // Update package manager selector based on availability
            this.updatePackageManagerSelector();

            // Load installed packages
            await this.getInstalledPackages();

            // Automatically check for updates
            await this.checkForUpdates();

            // Apply filters and render initial package list (ensures "All" category is properly loaded)
            this.ensureAllCategoryActive();
            this.filterPackages();

            // Listen for tab activation events to ensure All category is loaded
            this.setupTabActivationListener();

            // Signal that this tab is ready
            this.lazyHelper.markTabReady();
        } catch (error) {
            // Still signal ready even if there was an error
            this.lazyHelper.markTabReady();
        }
    }

    async checkChocoAvailability() {
        // Chocolatey support has been removed
        this.chocoAvailable = false;
    }

    async getInstalledPackages() {
        this.installedPackages.clear();

        try {
            if (this.currentPackageManager === 'winget') {
                await this.getWingetInstalledPackages();
            } else if (this.currentPackageManager === 'choco' && this.chocoAvailable) {
                await this.getChocoInstalledPackages();
            }
        } catch (error) {
            this.showStatus(`Failed to get installed packages: ${error.message}`, 'error');
        }
    }

    async getWingetInstalledPackages() {
        try {
            if (window.electronAPI && window.electronAPI.executeWingetCommand) {
                const result = await window.electronAPI.executeWingetCommand('list');
                if (result && result.output) {
                    this.parseWingetList(result.output);
                }
            }
        } catch (error) {
            // Error getting winget installed packages
        }
    }

    async getChocoInstalledPackages() {
        // Chocolatey support has been removed
        return;
    }

    parseWingetList(output) {
        const lines = output.split('\n');
        let startParsing = false;

        for (const line of lines) {
            // Skip header lines until we find the separator
            if (line.includes('---')) {
                startParsing = true;
                continue;
            }

            if (!startParsing || !line.trim()) continue;

            // Parse winget list output format: Name Id Version Available Source
            const parts = line.trim().split(/\s{2,}/); // Split on multiple spaces
            if (parts.length >= 2) {
                const packageId = parts[1].trim();
                if (packageId) {
                    this.installedPackages.add(packageId.toLowerCase());
                }
            }
        }
    }

    parseChocoList(output) {
        // Chocolatey support has been removed
        return;
    }

    updatePackageManagerSelector() {
        const packageManagerSelect = document.getElementById('package-manager-select');
        const chocoOption = packageManagerSelect?.querySelector('option[value="choco"]');

        if (chocoOption) {
            if (!this.chocoAvailable) {
                chocoOption.disabled = true;
                chocoOption.textContent = 'Chocolatey (Not Installed)';

                // If currently selected choco but it's not available, switch to winget
                if (this.currentPackageManager === 'choco') {
                    this.currentPackageManager = 'winget';
                    packageManagerSelect.value = 'winget';
                }
            } else {
                chocoOption.disabled = false;
                chocoOption.textContent = 'Chocolatey (choco)';
            }
        }
    }

    async loadPackages() {
        try {
            // Try to load from Electron API first (when running in Electron)
            if (window.electronAPI && window.electronAPI.getApplicationsData) {
                this.packages = await window.electronAPI.getApplicationsData();
                const packageCount = Object.keys(this.packages).length;
                this.showStatus(
                    `Successfully loaded ${packageCount} packages from applications.json`,
                    'success'
                );

                // Refresh installed packages and updates after loading
                await this.refreshPackageData();
                return;
            }

            // Fallback: try to load via fetch
            let response;
            const possiblePaths = [
                './src/tabs/packages/applications.json',
                '../packages/applications.json',
                './tabs/packages/applications.json',
                'src/tabs/packages/applications.json',
            ];

            for (const path of possiblePaths) {
                try {
                    response = await fetch(path);
                    if (response.ok) {
                        this.packages = await response.json();
                        const packageCount = Object.keys(this.packages).length;
                        this.showStatus(
                            `Successfully loaded ${packageCount} packages from applications.json`,
                            'success'
                        );

                        // Refresh installed packages and updates after loading
                        await this.refreshPackageData();
                        return;
                    }
                } catch (e) {
                    // Failed to load from this path
                }
            }

            throw new Error('Could not load applications.json from any source');
        } catch (error) {
            this.showStatus(`Failed to load packages: ${error.message}`, 'error');

            // Initialize empty packages if loading fails
            this.packages = {};
            this.filteredPackages = {};
            this.updateTotalPackageCount(0);
        }
    }

    async refreshPackageData() {
        try {
            // Get installed packages
            await this.getInstalledPackages();

            // Check for updates
            await this.checkForUpdates();

            // Apply current filters (including "All" category) after refreshing
            this.ensureAllCategoryActive();
            this.filterPackages();

        } catch (error) {
            // Still apply filters even if refresh fails
            this.ensureAllCategoryActive();
            this.filterPackages();
        }
    }

    setupEventListeners() {
        // Package manager selector
        const packageManagerSelect = document.getElementById('package-manager-select');
        if (packageManagerSelect) {
            packageManagerSelect.addEventListener('change', async e => {
                await this.switchPackageManager(e.target.value);
            });
        }

        // Package status filter
        const packageStatusSelect = document.getElementById('package-status-select');
        if (packageStatusSelect) {
            packageStatusSelect.addEventListener('change', e => {
                this.currentStatusFilter = e.target.value;
                this.filterPackages();
            });
        }

        // Refresh installed packages button
        const refreshInstalledBtn = document.getElementById('refresh-installed');
        if (refreshInstalledBtn) {
            refreshInstalledBtn.addEventListener('click', () => {
                this.refreshInstalledPackages();
            });
        }

        // Header refresh button
        const refreshHeaderBtn = document.getElementById('refresh-packages-header');
        if (refreshHeaderBtn) {
            refreshHeaderBtn.addEventListener('click', () => {
                this.refreshInstalledPackages();
            });
        }

        // Search input
        const searchInput = document.getElementById('package-search');
        if (searchInput) {
            searchInput.addEventListener('input', e => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterPackages();
            });
        }

        // Category buttons
        const categoryButtons = document.querySelectorAll('.category-btn');
        categoryButtons.forEach(btn => {
            btn.addEventListener('click', e => {
                // Remove active class from all buttons
                categoryButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');

                this.currentCategory = e.target.dataset.category;
                this.filterPackages();
            });
        });

        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', e => {
                this.toggleSelectAll(e.target.checked);
            });
        }

        // Action buttons
        const installBtn = document.getElementById('install-selected');
        const uninstallBtn = document.getElementById('uninstall-selected');
        const importBtn = document.getElementById('import-packages');
        const exportBtn = document.getElementById('export-packages');

        if (installBtn) {
            installBtn.addEventListener('click', () => this.installSelected());
        }

        if (uninstallBtn) {
            uninstallBtn.addEventListener('click', () => this.uninstallSelected());
        }

        if (importBtn) {
            importBtn.addEventListener('click', () => this.importPackages());
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportPackages());
        }

        // Progress modal close button will be set up when modal is shown
    }

    async switchPackageManager(packageManager) {
        // Check if trying to switch to Chocolatey when it's not available
        if (packageManager === 'choco' && !this.chocoAvailable) {
            this.showStatus(
                'Chocolatey is not installed. Please install Chocolatey first: https://chocolatey.org/install',
                'error'
            );

            // Reset selector to winget
            const packageManagerSelect = document.getElementById('package-manager-select');
            if (packageManagerSelect) {
                packageManagerSelect.value = 'winget';
            }
            return;
        }

        this.currentPackageManager = packageManager;

        // Update description
        const description = document.getElementById('package-manager-description');
        if (description) {
            if (packageManager === 'choco') {
                description.textContent = 'Manage Windows packages using Chocolatey';
            } else {
                description.textContent = 'Manage Windows packages using winget';
            }
        }

        // Clear current selection and updates
        this.selectedPackages.clear();
        this.packagesWithUpdates.clear();
        this.updateSelectionInfo();

        // Refresh installed packages for the new package manager
        await this.getInstalledPackages();

        // Automatically check for updates with the new package manager
        await this.checkForUpdates();

        // Ensure All category is active and re-render packages to show appropriate package IDs and installation status
        this.ensureAllCategoryActive();
        this.filterPackages();

        // Show status message
        const managerName = packageManager === 'choco' ? 'Chocolatey' : 'Windows Package Manager';
        this.showStatus(`Switched to ${managerName}`, 'success');
    }

    filterPackages() {
        this.filteredPackages = {};



        Object.keys(this.packages).forEach(key => {
            const pkg = this.packages[key];

            // Category filter
            const categoryMatch =
                this.currentCategory === 'all' || pkg.category === this.currentCategory;

            // Search filter
            const searchMatch =
                this.searchTerm === '' ||
                pkg.content.toLowerCase().includes(this.searchTerm) ||
                pkg.description.toLowerCase().includes(this.searchTerm);

            // Status filter (installed/available/updates)
            const packageId = this.currentPackageManager === 'choco' ? pkg.choco : pkg.winget;
            const isInstalled = packageId && this.installedPackages.has(packageId.toLowerCase());
            const hasUpdate = packageId && this.packagesWithUpdates.has(packageId.toLowerCase());

            let statusMatch = true;
            if (this.currentStatusFilter === 'installed') {
                statusMatch = isInstalled;
            } else if (this.currentStatusFilter === 'available') {
                statusMatch = !isInstalled;
            } else if (this.currentStatusFilter === 'updates') {
                statusMatch = hasUpdate;
            }

            if (categoryMatch && searchMatch && statusMatch) {
                this.filteredPackages[key] = pkg;
            }
        });



        this.renderPackages();
        this.updateTotalPackageCount(Object.keys(this.filteredPackages).length);
    }

    async refreshInstalledPackages() {
        this.showStatus('Refreshing installed packages and checking for updates...', 'info');

        try {
            await this.refreshPackageData();

            const updateCount = this.packagesWithUpdates.size;
            const installedCount = this.installedPackages.size;

            if (updateCount > 0) {
                this.showStatus(
                    `Found ${installedCount} installed packages with ${updateCount} updates available`,
                    'success'
                );
            } else {
                this.showStatus(
                    `Found ${installedCount} installed packages - all up to date`,
                    'success'
                );
            }
        } catch (error) {
            console.error('Error refreshing installed packages:', error);
            this.showStatus(`Failed to refresh installed packages: ${error.message}`, 'error');
        }
    }

    async checkForUpdates() {
        this.packagesWithUpdates.clear();

        try {
            if (this.currentPackageManager === 'winget') {
                await this.getWingetUpdates();
            } else if (this.currentPackageManager === 'choco' && this.chocoAvailable) {
                await this.getChocoUpdates();
            }

            console.log(`Found ${this.packagesWithUpdates.size} packages with available updates`);
        } catch (error) {
            console.error('Error checking for updates:', error);
            // Don't show error status since this runs automatically
        }
    }

    async getWingetUpdates() {
        try {
            if (window.electronAPI && window.electronAPI.executeWingetCommand) {
                const result = await window.electronAPI.executeWingetCommand('upgrade');
                if (result && result.output) {
                    this.parseWingetUpgrade(result.output);
                }
            } else {
                console.log('Winget command execution not available (browser mode)');
            }
        } catch (error) {
            console.error('Error getting winget updates:', error);
        }
    }

    async getChocoUpdates() {
        try {
            if (window.electronAPI && window.electronAPI.executeChocoCommand) {
                const result = await window.electronAPI.executeChocoCommand('outdated');
                if (result && result.output) {
                    this.parseChocoOutdated(result.output);
                }
            } else {
                console.log('Choco command execution not available (browser mode)');
            }
        } catch (error) {
            console.error('Error getting choco updates:', error);
        }
    }

    parseWingetUpgrade(output) {
        const lines = output.split('\n');
        let startParsing = false;

        for (const line of lines) {
            // Skip header lines until we find the separator
            if (line.includes('---')) {
                startParsing = true;
                continue;
            }

            if (!startParsing || !line.trim()) continue;

            // Parse winget upgrade output format: Name Id Version Available Source
            const parts = line.trim().split(/\s{2,}/); // Split on multiple spaces
            if (parts.length >= 4) {
                const packageId = parts[1].trim();
                if (packageId && packageId !== 'Id') {
                    // Skip header row
                    this.packagesWithUpdates.add(packageId.toLowerCase());
                }
            }
        }

        console.log(`Found ${this.packagesWithUpdates.size} winget packages with updates`);
    }

    parseChocoOutdated(output) {
        const lines = output.split('\n');

        for (const line of lines) {
            // Skip non-package lines
            if (
                !line.trim() ||
                line.includes('Chocolatey v') ||
                line.includes('packages have newer') ||
                line.includes('Output is package name')
            ) {
                continue;
            }

            // Parse choco outdated output format: packagename|current|available|pinned
            if (line.includes('|')) {
                const parts = line.trim().split('|');
                if (parts.length >= 3) {
                    const packageId = parts[0].trim();
                    if (packageId) {
                        this.packagesWithUpdates.add(packageId.toLowerCase());
                    }
                }
            }
        }

        console.log(`Found ${this.packagesWithUpdates.size} chocolatey packages with updates`);
    }

    refreshPackageDisplay(packageKey) {
        // Find the package item in the DOM
        const packageItem = document.querySelector(`[data-package-key="${packageKey}"]`);
        if (!packageItem) return;

        const pkg = this.packages[packageKey];
        const packageId = this.currentPackageManager === 'choco' ? pkg.choco : pkg.winget;

        if (!pkg || !packageId) return;

        // Check current status
        const isInstalled = this.installedPackages.has(packageId.toLowerCase());
        const hasUpdate = this.packagesWithUpdates.has(packageId.toLowerCase());

        // Update the badge
        const nameContainer = packageItem.querySelector('.package-name-container');
        if (nameContainer) {
            // Remove existing badges
            const existingBadges = nameContainer.querySelectorAll(
                '.update-badge, .installed-badge'
            );
            existingBadges.forEach(badge => badge.remove());

            // Add appropriate badge
            if (hasUpdate) {
                const updateBadge = document.createElement('span');
                updateBadge.className = 'update-badge';
                updateBadge.innerHTML = '<i class="fas fa-arrow-up"></i> Update Available';
                updateBadge.title = 'An update is available for this package';
                nameContainer.appendChild(updateBadge);
            } else if (isInstalled) {
                const installedBadge = document.createElement('span');
                installedBadge.className = 'installed-badge';
                installedBadge.innerHTML = '<i class="fas fa-check-circle"></i> Installed';
                installedBadge.title = 'This package is currently installed';
                nameContainer.appendChild(installedBadge);
            }
        }

        // Update the action buttons
        const actionsContainer = packageItem.querySelector('.package-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = ''; // Clear existing buttons

            if (hasUpdate) {
                // Create update button for packages with available updates
                const updateBtn = document.createElement('button');
                updateBtn.className = 'package-action-btn update-package-btn';
                updateBtn.title = 'Update Package';
                updateBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
                updateBtn.onclick = () => this.updatePackageSecure(packageKey);
                actionsContainer.appendChild(updateBtn);

                // Also add uninstall button for packages with updates
                const uninstallBtn = document.createElement('button');
                uninstallBtn.className = 'package-action-btn uninstall-package-btn';
                uninstallBtn.title = 'Uninstall Package';
                uninstallBtn.innerHTML = '<i class="fas fa-trash"></i>';
                uninstallBtn.onclick = () => this.uninstallPackageSecure(packageKey);
                actionsContainer.appendChild(uninstallBtn);
            } else if (isInstalled) {
                // Create uninstall button for installed packages without updates
                const uninstallBtn = document.createElement('button');
                uninstallBtn.className = 'package-action-btn uninstall-package-btn';
                uninstallBtn.title = 'Uninstall Package';
                uninstallBtn.innerHTML = '<i class="fas fa-trash"></i>';
                uninstallBtn.onclick = () => this.uninstallPackageSecure(packageKey);
                actionsContainer.appendChild(uninstallBtn);
            } else {
                // Create install button for non-installed packages
                const installBtn = document.createElement('button');
                installBtn.className = 'package-action-btn install-package-btn';
                installBtn.title = 'Install Package';
                installBtn.innerHTML = '<i class="fas fa-download"></i>';
                installBtn.onclick = () => this.installPackageSecure(packageKey);
                actionsContainer.appendChild(installBtn);
            }
        }
    }

    renderPackages() {
        const packagesList = document.getElementById('packages-list');
        if (!packagesList) return;

        packagesList.innerHTML = '';

        const packageKeys = Object.keys(this.filteredPackages);

        if (packageKeys.length === 0) {
            packagesList.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #b0b0b0;">
                    <i class="fas fa-search" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                    <p>No packages found matching your criteria</p>
                </div>
            `;
            return;
        }

        packageKeys.forEach(key => {
            const pkg = this.filteredPackages[key];
            const packageItem = this.createPackageItem(key, pkg);
            if (packageItem) {
                // Ensure item is valid before appending
                packagesList.appendChild(packageItem);
            }
        });

        this.updateSelectionInfo();
    }

    createPackageItem(key, pkg) {
        // Get the appropriate package ID based on current package manager
        const packageId = this.currentPackageManager === 'choco' ? pkg.choco : pkg.winget;

        // Validate package data
        if (!pkg || !packageId) {
            console.warn(
                'Invalid package data or missing package ID:',
                key,
                pkg,
                this.currentPackageManager
            );
            return null;
        }

        if (!this.validatePackageId(packageId)) {
            console.warn('Invalid package ID detected:', packageId);
            return null;
        }

        const isSelected = this.selectedPackages.has(key);

        const item = document.createElement('div');
        item.className = 'package-item';
        if (isSelected) {
            item.classList.add('selected');
        }
        item.dataset.packageKey = key;

        // Create checkbox container
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'package-checkbox';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isSelected;
        checkbox.dataset.package = key;
        checkboxContainer.appendChild(checkbox);

        // Create package info section
        const packageInfo = document.createElement('div');
        packageInfo.className = 'package-info';

        // Determine icon based on package name or category
        let iconClass = 'fas fa-cube';
        const contentLower = (pkg.content || '').toLowerCase();
        if (contentLower.includes('password')) iconClass = 'fas fa-key';
        else if (contentLower.includes('zip') || contentLower.includes('archive'))
            iconClass = 'fas fa-file-archive';
        else if (pkg.category === 'Browsers') iconClass = 'fas fa-globe';
        else if (pkg.category === 'Development') iconClass = 'fas fa-code';
        else if (pkg.category === 'Multimedia Tools') iconClass = 'fas fa-music';
        else if (pkg.category === 'Microsoft Tools') iconClass = 'fab fa-microsoft';
        else if (pkg.category === 'Utilities') iconClass = 'fas fa-tools';

        const iconContainer = document.createElement('div');
        iconContainer.className = 'package-icon';
        iconContainer.innerHTML = `<i class="${iconClass}"></i>`;

        const packageName = document.createElement('div');
        packageName.className = 'package-name';

        // Check if package is installed and has updates
        const isInstalled = this.installedPackages.has(packageId.toLowerCase());
        const hasUpdate = this.packagesWithUpdates.has(packageId.toLowerCase());

        const nameContainer = document.createElement('div');
        nameContainer.className = 'package-name-container';

        if (pkg.link) {
            const link = document.createElement('a');
            link.href = pkg.link;
            link.textContent = pkg.content || 'Unknown Package';
            link.target = '_blank'; // Open in new tab
            link.title = `Visit ${pkg.content} website`;
            nameContainer.appendChild(link);
        } else {
            const nameText = document.createElement('span');
            nameText.textContent = pkg.content || 'Unknown Package';
            nameContainer.appendChild(nameText);
        }

        // Add status badges
        if (hasUpdate) {
            const updateBadge = document.createElement('span');
            updateBadge.className = 'update-badge';
            updateBadge.innerHTML = '<i class="fas fa-arrow-up"></i> Update Available';
            updateBadge.title = 'An update is available for this package';
            nameContainer.appendChild(updateBadge);
        } else if (isInstalled) {
            const installedBadge = document.createElement('span');
            installedBadge.className = 'installed-badge';
            installedBadge.innerHTML = '<i class="fas fa-check-circle"></i> Installed';
            installedBadge.title = 'This package is currently installed';
            nameContainer.appendChild(installedBadge);
        }

        packageName.appendChild(nameContainer);
        packageInfo.appendChild(iconContainer);
        packageInfo.appendChild(packageName);

        // Create publisher section
        const publisher = document.createElement('div');
        publisher.className = 'package-publisher';
        publisher.textContent = pkg.publisher || 'N/A';

        // Create description section
        const description = document.createElement('div');
        description.className = 'package-description';
        description.textContent = pkg.description || 'No description available';

        // Create actions section
        const actions = document.createElement('div');
        actions.className = 'package-actions';

        // Show appropriate buttons based on installation and update status
        if (hasUpdate) {
            // Create update button for packages with available updates
            const updateBtn = document.createElement('button');
            updateBtn.className = 'package-action-btn update-package-btn';
            updateBtn.title = 'Update Package';
            updateBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
            updateBtn.onclick = () => this.updatePackageSecure(key);
            actions.appendChild(updateBtn);

            // Also add uninstall button for packages with updates
            const uninstallBtn = document.createElement('button');
            uninstallBtn.className = 'package-action-btn uninstall-package-btn';
            uninstallBtn.title = 'Uninstall Package';
            uninstallBtn.innerHTML = '<i class="fas fa-trash"></i>';
            uninstallBtn.onclick = () => this.uninstallPackageSecure(key);
            actions.appendChild(uninstallBtn);
        } else if (isInstalled) {
            // Create uninstall button for installed packages without updates
            const uninstallBtn = document.createElement('button');
            uninstallBtn.className = 'package-action-btn uninstall-package-btn';
            uninstallBtn.title = 'Uninstall Package';
            uninstallBtn.innerHTML = '<i class="fas fa-trash"></i>';
            uninstallBtn.onclick = () => this.uninstallPackageSecure(key);
            actions.appendChild(uninstallBtn);
        } else {
            // Create install button for non-installed packages
            const installBtn = document.createElement('button');
            installBtn.className = 'package-action-btn install-package-btn';
            installBtn.title = 'Install Package';
            installBtn.innerHTML = '<i class="fas fa-download"></i>';
            installBtn.onclick = () => this.installPackageSecure(key);
            actions.appendChild(installBtn);
        }

        // Assemble the item
        item.appendChild(checkboxContainer);
        item.appendChild(packageInfo);
        item.appendChild(publisher);
        item.appendChild(description);
        item.appendChild(actions);

        // Add checkbox event listener
        checkbox.addEventListener('change', e => {
            if (e.target.checked) {
                this.selectedPackages.add(key);
                item.classList.add('selected');
            } else {
                this.selectedPackages.delete(key);
                item.classList.remove('selected');
            }
            this.updateSelectionInfo();
        });

        return item;
    }

    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.package-item input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const packageKey = checkbox.dataset.package;
            const packageItem = checkbox.closest('.package-item');

            if (checked) {
                this.selectedPackages.add(packageKey);
                packageItem.classList.add('selected');
            } else {
                this.selectedPackages.delete(packageKey);
                packageItem.classList.remove('selected');
            }
        });

        this.updateSelectionInfo();
    }

    updateSelectionInfo() {
        const count = this.selectedPackages.size;
        const countElement = document.getElementById('selection-count');
        const installBtn = document.getElementById('install-selected');
        const uninstallBtn = document.getElementById('uninstall-selected');
        const exportBtn = document.getElementById('export-packages');

        if (countElement) {
            countElement.textContent = `${count} package${count !== 1 ? 's' : ''} selected`;
        }

        if (installBtn) installBtn.disabled = count === 0;
        if (uninstallBtn) uninstallBtn.disabled = count === 0;
        if (exportBtn) exportBtn.disabled = count === 0;

        // Update select all checkbox state
        const selectAllCheckbox = document.getElementById('select-all');
        const totalVisible = Object.keys(this.filteredPackages).length;

        if (selectAllCheckbox && totalVisible > 0) {
            selectAllCheckbox.indeterminate = count > 0 && count < totalVisible;
            selectAllCheckbox.checked = count === totalVisible;
        }
    }

    async installPackageSecure(packageKey) {
        const pkg = this.packages[packageKey];
        const packageId = this.currentPackageManager === 'choco' ? pkg.choco : pkg.winget;

        if (!pkg || !packageId) {
            const managerName = this.currentPackageManager === 'choco' ? 'Chocolatey' : 'winget';
            this.showStatus(`Package not found or ${managerName} ID missing`, 'error');
            return;
        }

        // Validate package ID
        if (!this.validatePackageId(packageId)) {
            this.showStatus('Invalid package ID detected', 'error');
            return;
        }

        // Check if operation is already running
        if (this.currentOperation && !this.currentOperation.cancelled) {
            this.showStatus('Another operation is already in progress', 'warning');
            return;
        }

        const sanitizedPackageId = this.sanitizePackageId(packageId);

        // Set operation tracking
        this.currentOperationPackage = { key: packageKey, id: sanitizedPackageId };
        this.currentOperationType = 'install';

        this.showProgress(
            'Installing Package',
            `Installing ${this.escapeHtml(pkg.content)}...`,
            'installing'
        );

        try {
            if (this.currentPackageManager === 'choco') {
                // Execute chocolatey install command
                await this.executeChocoCommandWithProgressSecure('install', sanitizedPackageId, [
                    '-y',
                ]);
            } else {
                // Execute winget install command with validated parameters
                await this.executeWingetCommandWithProgressSecure('install', sanitizedPackageId, [
                    '--accept-package-agreements',
                    '--accept-source-agreements',
                ]);
            }
        } catch (error) {
            this.updateProgressError(`Error: ${error.message}`);
            this.currentOperationPackage = null;
            this.currentOperationType = null;
        }
    }

    async updatePackageSecure(packageKey) {
        const pkg = this.packages[packageKey];
        const packageId = this.currentPackageManager === 'choco' ? pkg.choco : pkg.winget;

        if (!pkg || !packageId) {
            const managerName = this.currentPackageManager === 'choco' ? 'Chocolatey' : 'winget';
            this.showStatus(`Package not found or ${managerName} ID missing`, 'error');
            return;
        }

        // Validate package ID
        if (!this.validatePackageId(packageId)) {
            this.showStatus('Invalid package ID detected', 'error');
            return;
        }

        // Check if operation is already running
        if (this.currentOperation && !this.currentOperation.cancelled) {
            this.showStatus('Another operation is already in progress', 'warning');
            return;
        }

        const sanitizedPackageId = this.sanitizePackageId(packageId);

        // Set operation tracking
        this.currentOperationPackage = { key: packageKey, id: sanitizedPackageId };
        this.currentOperationType = 'update';

        this.showProgress(
            'Updating Package',
            `Updating ${this.escapeHtml(pkg.content)}...`,
            'updating'
        );

        try {
            if (this.currentPackageManager === 'choco') {
                // Execute chocolatey upgrade command
                await this.executeChocoCommandWithProgressSecure('upgrade', sanitizedPackageId, [
                    '-y',
                ]);
            } else {
                // Execute winget upgrade command with validated parameters
                await this.executeWingetCommandWithProgressSecure('upgrade', sanitizedPackageId, [
                    '--accept-package-agreements',
                    '--accept-source-agreements',
                ]);
            }
        } catch (error) {
            this.updateProgressError(`Error: ${error.message}`);
            this.currentOperationPackage = null;
            this.currentOperationType = null;
        }
    }

    async uninstallPackageSecure(packageKey) {
        const pkg = this.packages[packageKey];
        const packageId = this.currentPackageManager === 'choco' ? pkg.choco : pkg.winget;

        if (!pkg || !packageId) {
            const managerName = this.currentPackageManager === 'choco' ? 'Chocolatey' : 'winget';
            this.showStatus(`Package not found or ${managerName} ID missing`, 'error');
            return;
        }

        // Validate package ID
        if (!this.validatePackageId(packageId)) {
            this.showStatus('Invalid package ID detected', 'error');
            return;
        }

        // Check if operation is already running
        if (this.currentOperation && !this.currentOperation.cancelled) {
            this.showStatus('Another operation is already in progress', 'warning');
            return;
        }

        // Confirm uninstallation
        const confirmed = confirm(
            `Are you sure you want to uninstall "${pkg.content}"?\n\n` +
            `This action cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        const sanitizedPackageId = this.sanitizePackageId(packageId);

        // Set operation tracking
        this.currentOperationPackage = { key: packageKey, id: sanitizedPackageId };
        this.currentOperationType = 'uninstall';

        this.showProgress(
            'Uninstalling Package',
            `Uninstalling ${this.escapeHtml(pkg.content)}...`,
            'uninstalling'
        );

        try {
            if (this.currentPackageManager === 'choco') {
                // Execute chocolatey uninstall command
                await this.executeChocoCommandWithProgressSecure('uninstall', sanitizedPackageId, [
                    '-y',
                ]);
            } else {
                // Execute winget uninstall command with validated parameters
                await this.executeWingetCommandWithProgressSecure(
                    'uninstall',
                    sanitizedPackageId,
                    []
                );
            }
        } catch (error) {
            this.updateProgressError(`Error: ${error.message}`);
            this.currentOperationPackage = null;
            this.currentOperationType = null;
        }
    }

    // Legacy functions for backward compatibility (deprecated)
    async installPackage(packageKey) {
        return this.installPackageSecure(packageKey);
    }

    async uninstallPackage(packageKey) {
        return this.uninstallPackageSecure(packageKey);
    }

    async installSelected() {
        if (this.selectedPackages.size === 0) return;

        // Check if operation is already running
        if (this.currentOperation && !this.currentOperation.cancelled) {
            this.showStatus('Another operation is already in progress', 'warning');
            return;
        }

        // Validate all selected packages first
        const validPackages = [];
        const invalidPackages = [];

        for (const packageKey of this.selectedPackages) {
            const pkg = this.packages[packageKey];
            const packageId = this.currentPackageManager === 'choco' ? pkg.choco : pkg.winget;

            if (pkg && packageId && this.validatePackageId(packageId)) {
                validPackages.push({ key: packageKey, pkg, packageId });
            } else {
                invalidPackages.push(packageKey);
            }
        }

        if (invalidPackages.length > 0) {
            this.showStatus(
                `${invalidPackages.length} packages have invalid IDs and will be skipped`,
                'warning'
            );
        }

        if (validPackages.length === 0) {
            this.showStatus('No valid packages selected for installation', 'error');
            return;
        }

        // Confirm batch installation
        const confirmed = confirm(
            `Install ${validPackages.length} selected packages?\n\n` +
            `This operation may take several minutes to complete.`
        );

        if (!confirmed) {
            return;
        }

        this.showProgress(
            'Installing Selected Packages',
            `Installing ${validPackages.length} packages`,
            'installing'
        );

        let completed = 0;
        const total = validPackages.length;

        for (const { key, pkg, packageId } of validPackages) {
            if (this.currentOperation && this.currentOperation.cancelled) {
                break;
            }

            try {
                // Update current package display
                this.updateCurrentPackage({
                    name: pkg.content,
                    publisher: pkg.publisher || 'Unknown Publisher',
                    version: pkg.version || 'Latest',
                    status: 'Installing',
                    statusClass: '',
                });

                this.updateProgressMessage(`Installing ${this.escapeHtml(pkg.content)}...`);
                this.updateProgressDetails(`Package ${completed + 1} of ${total}`);
                this.appendProgressOutput(`\n--- Installing ${pkg.content} ---`);

                const sanitizedPackageId = this.sanitizePackageId(packageId);

                if (this.currentPackageManager === 'choco') {
                    await this.executeChocoCommandWithProgressSecure(
                        'install',
                        sanitizedPackageId,
                        ['-y']
                    );
                } else {
                    await this.executeWingetCommandWithProgressSecure(
                        'install',
                        sanitizedPackageId,
                        ['--accept-package-agreements', '--accept-source-agreements']
                    );
                }

                // Update package status to completed
                this.updateCurrentPackage({
                    name: pkg.content,
                    publisher: pkg.publisher || 'Unknown Publisher',
                    version: pkg.version || 'Latest',
                    status: 'Installed',
                    statusClass: 'success',
                });

                completed++;
                this.updateProgressPercentage((completed / total) * 100);
            } catch (error) {
                // Update package status to error
                this.updateCurrentPackage({
                    name: pkg.content,
                    publisher: pkg.publisher || 'Unknown Publisher',
                    version: pkg.version || 'Latest',
                    status: 'Error',
                    statusClass: 'error',
                });

                this.appendProgressOutput(`Error installing ${pkg.content}: ${error.message}`);
            }
        }

        this.completeProgress('Installation process completed');
    }

    async uninstallSelected() {
        if (this.selectedPackages.size === 0) return;

        // Check if operation is already running
        if (this.currentOperation && !this.currentOperation.cancelled) {
            this.showStatus('Another operation is already in progress', 'warning');
            return;
        }

        // Validate all selected packages first
        const validPackages = [];
        const invalidPackages = [];

        for (const packageKey of this.selectedPackages) {
            const pkg = this.packages[packageKey];
            const packageId = this.currentPackageManager === 'choco' ? pkg.choco : pkg.winget;

            if (pkg && packageId && this.validatePackageId(packageId)) {
                validPackages.push({ key: packageKey, pkg, packageId });
            } else {
                invalidPackages.push(packageKey);
            }
        }

        if (invalidPackages.length > 0) {
            this.showStatus(
                `${invalidPackages.length} packages have invalid IDs and will be skipped`,
                'warning'
            );
        }

        if (validPackages.length === 0) {
            this.showStatus('No valid packages selected for uninstallation', 'error');
            return;
        }

        // Confirm batch uninstallation
        const confirmed = confirm(
            `Uninstall ${validPackages.length} selected packages?\n\n` +
            `This action cannot be undone and may take several minutes to complete.`
        );

        if (!confirmed) {
            return;
        }

        this.showProgress(
            'Uninstalling Selected Packages',
            `Uninstalling ${validPackages.length} packages`,
            'uninstalling'
        );

        let completed = 0;
        const total = validPackages.length;

        for (const { key, pkg, packageId } of validPackages) {
            if (this.currentOperation && this.currentOperation.cancelled) {
                break;
            }

            try {
                this.updateProgressMessage(`Uninstalling ${this.escapeHtml(pkg.content)}...`);
                this.updateProgressDetails(`Package ${completed + 1} of ${total}`);
                this.appendProgressOutput(`\n--- Uninstalling ${pkg.content} ---`);

                const sanitizedPackageId = this.sanitizePackageId(packageId);

                if (this.currentPackageManager === 'choco') {
                    await this.executeChocoCommandWithProgressSecure(
                        'uninstall',
                        sanitizedPackageId,
                        ['-y']
                    );
                } else {
                    await this.executeWingetCommandWithProgressSecure(
                        'uninstall',
                        sanitizedPackageId,
                        []
                    );
                }

                completed++;
                this.updateProgressPercentage((completed / total) * 100);
            } catch (error) {
                this.appendProgressOutput(`Error uninstalling ${pkg.content}: ${error.message}`);
            }
        }

        this.completeProgress('Uninstallation process completed');
    }

    async executeWingetCommand(command) {
        try {
            if (window.electronAPI && window.electronAPI.executeWingetCommand) {
                // Use real winget command execution
                const result = await window.electronAPI.executeWingetCommand(command);
                return result.output;
            }
        } catch (error) {
            throw new Error(`Winget command failed: ${error.message}`);
        }
    }

    async executeChocoCommandWithProgressSecure(command, packageId, additionalArgs = []) {
        // Validate command
        if (!this.validateChocoCommand(command)) {
            throw new Error(`Invalid chocolatey command: ${command}`);
        }

        // Validate package ID
        if (!this.validatePackageId(packageId)) {
            throw new Error(`Invalid package ID: ${packageId}`);
        }

        // Sanitize inputs
        const sanitizedCommand = command;
        const sanitizedPackageId = this.sanitizePackageId(packageId);
        const sanitizedArgs = additionalArgs.filter(
            arg => typeof arg === 'string' && (arg.startsWith('-') || arg.startsWith('--'))
        );

        this.currentOperation = { cancelled: false };

        try {
            if (window.electronAPI && window.electronAPI.executeChocoCommandWithProgress) {
                // Use chocolatey command execution with progress
                const commandString =
                    `${sanitizedCommand} ${sanitizedPackageId} ${sanitizedArgs.join(' ')}`.trim();
                await window.electronAPI.executeChocoCommandWithProgress(
                    commandString,
                    progressData => {
                        if (this.currentOperation && this.currentOperation.cancelled) return;

                        if (progressData.type === 'progress') {
                            this.updateProgressPercentage(progressData.percentage);
                            if (progressData.message) {
                                this.updateProgressDetails(progressData.message);
                            }
                        } else if (progressData.type === 'output') {
                            this.appendProgressOutput(progressData.message);
                        } else if (progressData.type === 'error') {
                            this.updateProgressError(progressData.message);
                        } else if (progressData.type === 'complete') {
                            this.completeProgress(progressData.message || 'Operation completed');
                        }
                    }
                );
            } else {
                // Fallback to simulation for browser testing
                await this.simulateProgressOperation(
                    `choco ${sanitizedCommand} ${sanitizedPackageId}`
                );
            }
        } catch (error) {
            if (this.currentOperation && !this.currentOperation.cancelled) {
                this.updateProgressError(`Chocolatey command failed: ${error.message}`);
            }
        }
    }

    async executeWingetCommandWithProgressSecure(command, packageId, additionalArgs = []) {
        // Validate command
        if (!this.validateWingetCommand(command)) {
            throw new Error(`Invalid winget command: ${command}`);
        }

        // Validate package ID
        if (!this.validatePackageId(packageId)) {
            throw new Error(`Invalid package ID: ${packageId}`);
        }

        // Sanitize inputs
        const sanitizedCommand = command;
        const sanitizedPackageId = this.sanitizePackageId(packageId);
        const sanitizedArgs = additionalArgs.filter(
            arg => typeof arg === 'string' && arg.startsWith('--')
        );

        this.currentOperation = { cancelled: false };

        try {
            if (window.electronAPI && window.electronAPI.executeWingetCommandWithProgressSecure) {
                // Use secure winget command execution with validated parameters
                await window.electronAPI.executeWingetCommandWithProgressSecure(
                    sanitizedCommand,
                    sanitizedPackageId,
                    sanitizedArgs,
                    progressData => {
                        if (this.currentOperation && this.currentOperation.cancelled) return;

                        if (progressData.type === 'progress') {
                            this.updateProgressPercentage(progressData.percentage);
                            if (progressData.message) {
                                this.updateProgressDetails(progressData.message);
                            }
                        } else if (progressData.type === 'output') {
                            this.appendProgressOutput(progressData.data);
                        } else if (progressData.type === 'error') {
                            this.updateProgressError(progressData.message);
                        } else if (progressData.type === 'complete') {
                            this.completeProgress(progressData.message || 'Operation completed');
                        }
                    }
                );
            } else if (window.electronAPI && window.electronAPI.executeWingetCommandWithProgress) {
                // Fallback to legacy method with command string validation
                const commandString =
                    `${sanitizedCommand} ${sanitizedPackageId} ${sanitizedArgs.join(' ')}`.trim();
                await window.electronAPI.executeWingetCommandWithProgress(
                    commandString,
                    progressData => {
                        if (this.currentOperation && this.currentOperation.cancelled) return;

                        if (progressData.type === 'progress') {
                            this.updateProgressPercentage(progressData.percentage);
                            if (progressData.message) {
                                this.updateProgressDetails(progressData.message);
                            }
                        } else if (progressData.type === 'output') {
                            this.appendProgressOutput(progressData.data);
                        } else if (progressData.type === 'error') {
                            this.updateProgressError(progressData.message);
                        } else if (progressData.type === 'complete') {
                            this.completeProgress(progressData.message || 'Operation completed');
                        }
                    }
                );
            } else {
                // Fallback to simulation for browser testing
                await this.simulateProgressOperation(`${sanitizedCommand} ${sanitizedPackageId}`);
            }
        } catch (error) {
            if (this.currentOperation && !this.currentOperation.cancelled) {
                this.updateProgressError(`Winget command failed: ${error.message}`);
            }
        }
    }

    // Legacy function for backward compatibility (deprecated)
    async executeWingetCommandWithProgress(command) {
        console.warn(
            'executeWingetCommandWithProgress is deprecated, use executeWingetCommandWithProgressSecure instead'
        );

        // Parse legacy command string for security
        const parts = command.split(' ');
        const cmd = parts[0];
        const packageId = parts[1];
        const args = parts.slice(2);

        return this.executeWingetCommandWithProgressSecure(cmd, packageId, args);
    }

    async simulateProgressOperation(command) {
        const steps = [
            { message: 'Initializing...', percentage: 10 },
            { message: 'Downloading package...', percentage: 30 },
            { message: 'Verifying package...', percentage: 60 },
            { message: 'Installing package...', percentage: 80 },
            { message: 'Finalizing...', percentage: 95 },
        ];

        for (const step of steps) {
            if (this.currentOperation && this.currentOperation.cancelled) return;

            this.updateProgressDetails(step.message);
            this.updateProgressPercentage(step.percentage);
            this.appendProgressOutput(`${step.message}\n`);

            await new Promise(resolve => setTimeout(resolve, 800));
        }

        if (this.currentOperation && !this.currentOperation.cancelled) {
            this.appendProgressOutput(
                `Simulated execution of: winget ${command}\n\nThis is a demo - actual winget integration would require Electron main process communication.`
            );
            this.completeProgress('Operation completed successfully');
        }
    }

    updateTotalPackageCount(count) {
        const totalCountElement = document.getElementById('total-packages-count');
        if (totalCountElement) {
            totalCountElement.textContent = `${count} packages available`;
        }
    }

    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('status-message');
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

    // Progress Modal Methods
    showProgress(title, message, operation) {
        this.currentOperation = { type: operation, cancelled: false };

        const modal = document.getElementById('packages-progress-modal');
        const titleElement = document.getElementById('packages-progress-title');
        const subtitleElement = document.getElementById('packages-progress-subtitle');
        const textElement = document.getElementById('packages-progress-text');
        const outputElement = document.getElementById('packages-progress-output');
        const progressBar = document.getElementById('packages-progress-bar');
        const statusElement = document.getElementById('packages-operation-status');
        const percentageElement = document.getElementById('packages-progress-percentage');
        const timeElement = document.getElementById('packages-time-elapsed');

        if (modal && titleElement && textElement) {
            // Set title and subtitle
            titleElement.textContent = title;
            if (subtitleElement) {
                subtitleElement.textContent = this.getOperationSubtitle(operation);
            }

            // Set appropriate icon
            this.updateProgressIcon(operation);

            // Initialize status
            if (statusElement) statusElement.textContent = 'Initializing...';
            if (percentageElement) percentageElement.textContent = '0%';
            if (timeElement) timeElement.textContent = '00:00';

            // Set progress text
            textElement.textContent = message;

            // Reset styling and state
            modal.className = 'progress-modal';
            textElement.style.color = 'var(--text-primary)';
            textElement.style.fontWeight = '500';

            if (outputElement) outputElement.textContent = '';
            if (progressBar) {
                progressBar.style.width = '0%';
            }

            // Hide action buttons initially
            this.hideActionButtons();

            // Hide current package section initially
            const currentPackageSection = document.getElementById('packages-current-package');
            if (currentPackageSection) {
                currentPackageSection.style.display = 'none';
            }

            // Start with output section collapsed to prevent UI issues
            const outputSection = document.querySelector('.progress-output-section');
            if (outputSection) {
                outputSection.classList.add('collapsed');
                const toggleBtn = document.getElementById('packages-toggle-output');
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

            modal.style.display = 'flex';
            modal.style.animation = 'fadeIn 0.3s ease-out';
        }
    }

    getOperationSubtitle(operationType) {
        const subtitles = {
            install: 'Installing packages to your system',
            uninstall: 'Removing packages from your system',
            update: 'Updating packages to latest versions',
            upgrade: 'Upgrading packages to latest versions',
        };
        return subtitles[operationType] || 'Processing package operation';
    }

    updateProgressIcon(operationType) {
        const iconElement = document.getElementById('packages-progress-icon');
        if (!iconElement) return;

        const icons = {
            install: 'fas fa-download',
            uninstall: 'fas fa-trash',
            update: 'fas fa-sync-alt',
            upgrade: 'fas fa-arrow-up',
        };

        const iconClass = icons[operationType] || 'fas fa-cog';
        iconElement.innerHTML = `<i class="${iconClass}"></i>`;
    }

    startTimer() {
        this.operationStartTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.operationStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            const timeElement = document.getElementById('packages-time-elapsed');
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
        const buttons = ['packages-retry-operation', 'packages-view-logs', 'packages-done-modal'];
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
        const minimizeBtn = document.getElementById('packages-minimize-modal');
        if (minimizeBtn && !minimizeBtn.hasAttribute('data-listener-attached')) {
            minimizeBtn.addEventListener('click', () => this.toggleMinimize());
            minimizeBtn.setAttribute('data-listener-attached', 'true');
        }

        // Setup cancel button
        const cancelBtn = document.getElementById('packages-cancel-operation');
        if (cancelBtn && !cancelBtn.hasAttribute('data-listener-attached')) {
            cancelBtn.addEventListener('click', () => this.cancelOperation());
            cancelBtn.setAttribute('data-listener-attached', 'true');
        }

        // Setup output controls
        this.setupOutputControls();

        // Setup action buttons
        this.setupActionButtons();

        // Add click-outside-to-close functionality
        const modal = document.getElementById('packages-progress-modal');
        if (modal) {
            modal.onclick = e => {
                if (e.target === modal) {
                    this.hideProgress();
                }
            };
        }

        // Add escape key to close
        const escapeHandler = e => {
            if (e.key === 'Escape') {
                this.hideProgress();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    setupCloseButton() {
        const closeBtn = document.getElementById('packages-close-modal');
        if (closeBtn && !closeBtn.hasAttribute('data-listener-attached')) {
            console.log('Setting up close button event listener');
            closeBtn.addEventListener('click', e => {
                console.log('Close button clicked');
                e.preventDefault();
                e.stopPropagation();

                // Force close the modal immediately
                const modal = document.getElementById('packages-progress-modal');
                if (modal) {
                    modal.style.display = 'none';
                    console.log('Modal force-closed');
                }

                this.hideProgress();
            });
            closeBtn.setAttribute('data-listener-attached', 'true');
        }
    }

    setupOutputControls() {
        // Clear output button
        const clearBtn = document.getElementById('packages-clear-output');
        if (clearBtn && !clearBtn.hasAttribute('data-listener-attached')) {
            clearBtn.addEventListener('click', () => {
                const outputElement = document.getElementById('packages-progress-output');
                if (outputElement) outputElement.textContent = '';
            });
            clearBtn.setAttribute('data-listener-attached', 'true');
        }

        // Copy output button
        const copyBtn = document.getElementById('packages-copy-output');
        if (copyBtn && !copyBtn.hasAttribute('data-listener-attached')) {
            copyBtn.addEventListener('click', () => {
                const outputElement = document.getElementById('packages-progress-output');
                if (outputElement && navigator.clipboard) {
                    navigator.clipboard.writeText(outputElement.textContent);
                    this.showTemporaryTooltip(copyBtn, 'Copied!');
                }
            });
            copyBtn.setAttribute('data-listener-attached', 'true');
        }

        // Toggle output button
        const toggleBtn = document.getElementById('packages-toggle-output');
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
        const retryBtn = document.getElementById('packages-retry-operation');
        if (retryBtn && !retryBtn.hasAttribute('data-listener-attached')) {
            retryBtn.addEventListener('click', () => {
                // Implement retry logic based on last operation
                this.retryLastOperation();
            });
            retryBtn.setAttribute('data-listener-attached', 'true');
        }

        // View logs button
        const logsBtn = document.getElementById('packages-view-logs');
        if (logsBtn && !logsBtn.hasAttribute('data-listener-attached')) {
            logsBtn.addEventListener('click', () => {
                this.openLogsWindow();
            });
            logsBtn.setAttribute('data-listener-attached', 'true');
        }

        // Done button
        const doneBtn = document.getElementById('packages-done-modal');
        if (doneBtn && !doneBtn.hasAttribute('data-listener-attached')) {
            doneBtn.addEventListener('click', () => {
                this.hideProgress();
            });
            doneBtn.setAttribute('data-listener-attached', 'true');
        }
    }

    toggleMinimize() {
        const modal = document.getElementById('packages-progress-modal');
        if (modal) {
            modal.classList.toggle('minimized');
            const minimizeBtn = document.getElementById('packages-minimize-modal');
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
        tooltip.style.top = rect.top - 30 + 'px';

        document.body.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 2000);
    }

    retryLastOperation() {
        // Implement retry logic based on the last operation
        console.log('Retry operation requested');
        // This would need to be implemented based on the specific operation
    }

    openLogsWindow() {
        // Open a new window or modal with detailed logs
        console.log('Open logs window requested');
        // This would open a detailed log viewer
    }

    updateProgress(message, percentage) {
        const textElement = document.getElementById('packages-progress-text');
        const progressBar = document.getElementById('packages-progress-bar');
        const statusElement = document.getElementById('packages-operation-status');
        const percentageElement = document.getElementById('packages-progress-percentage');

        if (textElement) {
            textElement.textContent = message;
        }

        if (statusElement) {
            statusElement.textContent = message;
        }

        if (percentageElement) {
            percentageElement.textContent = `${Math.round(percentage)}%`;
        }

        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    updateProgressMessage(message) {
        const textElement = document.getElementById('packages-progress-text');
        const statusElement = document.getElementById('packages-operation-status');

        if (textElement) {
            textElement.textContent = message;
        }

        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    updateProgressDetails(details) {
        // For compatibility - append to output
        this.appendProgressOutput(`${details}\n`);
    }

    updateProgressPercentage(percentage) {
        const progressBar = document.getElementById('packages-progress-bar');
        const percentageElement = document.getElementById('packages-progress-percentage');

        if (progressBar) {
            const clampedPercentage = Math.min(100, Math.max(0, percentage));
            progressBar.style.width = `${clampedPercentage}%`;
        }

        if (percentageElement) {
            percentageElement.textContent = `${Math.round(percentage)}%`;
        }
    }

    updateCurrentPackage(packageInfo) {
        const currentPackageSection = document.getElementById('packages-current-package');
        const nameElement = document.getElementById('packages-current-name');
        const publisherElement = document.getElementById('packages-current-publisher');
        const versionElement = document.getElementById('packages-current-version');
        const statusElement = document.getElementById('packages-current-status');

        if (packageInfo && currentPackageSection) {
            currentPackageSection.style.display = 'block';

            if (nameElement) nameElement.textContent = packageInfo.name || 'Unknown Package';
            if (publisherElement)
                publisherElement.textContent = packageInfo.publisher || 'Unknown Publisher';
            if (versionElement)
                versionElement.textContent = packageInfo.version || 'Unknown Version';
            if (statusElement) {
                statusElement.textContent = packageInfo.status || 'Processing';
                statusElement.className = `status-badge ${packageInfo.statusClass || ''}`;
            }
        } else if (currentPackageSection) {
            currentPackageSection.style.display = 'none';
        }
    }

    appendProgressOutput(text) {
        const outputElement = document.getElementById('packages-progress-output');
        if (outputElement) {
            outputElement.textContent += text;
            outputElement.scrollTop = outputElement.scrollHeight;
        }
    }

    updateProgressError(message) {
        // Clear operation tracking on error
        this.currentOperationPackage = null;
        this.currentOperationType = null;

        // Stop timer
        this.stopTimer();

        const modal = document.getElementById('packages-progress-modal');
        const progressBar = document.getElementById('packages-progress-bar');
        const textElement = document.getElementById('packages-progress-text');
        const statusElement = document.getElementById('packages-operation-status');
        const iconElement = document.getElementById('packages-progress-icon');

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
        const currentStatusElement = document.getElementById('packages-current-status');
        if (currentStatusElement) {
            currentStatusElement.textContent = 'Error';
            currentStatusElement.className = 'status-badge error';
        }

        this.appendProgressOutput(`\n❌ ERROR: ${message}\n`);

        // Show retry button
        this.showActionButton('packages-retry-operation');
        this.showActionButton('packages-view-logs');

        // Auto-close after 10 seconds for errors (increased time)
        setTimeout(() => {
            this.hideProgress();
        }, 10000);
    }

    hideProgress() {
        console.log('hideProgress() called');
        const modal = document.getElementById('packages-progress-modal');
        if (modal) {
            console.log('Modal found, hiding immediately');

            // Hide immediately without animation for now
            modal.style.display = 'none';

            // Reset styling
            const progressBar = document.getElementById('packages-progress-bar');
            const textElement = document.getElementById('packages-progress-text');

            if (progressBar) {
                progressBar.style.background =
                    'linear-gradient(90deg, var(--primary-color), rgba(var(--primary-rgb), 0.8))';
                progressBar.style.width = '0%';
            }

            if (textElement) {
                textElement.style.color = 'var(--text-primary)';
                textElement.style.fontWeight = '500';
            }

            console.log('Modal hidden successfully');
        } else {
            console.warn('Modal not found when trying to hide');
        }
        this.currentOperation = null;
    }

    cancelCurrentOperation() {
        // This method is kept for potential future use
        if (this.currentOperation) {
            this.currentOperation.cancelled = true;
        }
        this.hideProgress();
    }

    completeProgress(message = 'Operation completed') {
        // Stop timer
        this.stopTimer();

        this.updateProgress(message, 100);

        const modal = document.getElementById('packages-progress-modal');
        const progressBar = document.getElementById('packages-progress-bar');
        const textElement = document.getElementById('packages-progress-text');
        const statusElement = document.getElementById('packages-operation-status');
        const iconElement = document.getElementById('packages-progress-icon');

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
        const currentStatusElement = document.getElementById('packages-current-status');
        if (currentStatusElement) {
            currentStatusElement.textContent = 'Completed';
            currentStatusElement.className = 'status-badge success';
        }

        // Handle badge updates for successful operations
        if (this.currentOperationPackage && this.currentOperationType) {
            const { key, id } = this.currentOperationPackage;
            const packageIdLower = id.toLowerCase();

            switch (this.currentOperationType) {
                case 'install':
                    this.installedPackages.add(packageIdLower);
                    break;
                case 'update':
                    this.packagesWithUpdates.delete(packageIdLower);
                    break;
                case 'uninstall':
                    this.installedPackages.delete(packageIdLower);
                    this.packagesWithUpdates.delete(packageIdLower);
                    break;
            }

            // Refresh the package display
            this.refreshPackageDisplay(key);

            // Clear operation tracking
            this.currentOperationPackage = null;
            this.currentOperationType = null;
        }

        // Refresh all packages after operation completion
        this.schedulePackageRefresh();

        // Show done button
        this.showActionButton('packages-done-modal');

        // Auto-close after 3 seconds
        setTimeout(() => {
            this.hideProgress();
        }, 3000);
    }

    schedulePackageRefresh() {
        // Schedule a package refresh after a short delay to allow operations to complete
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        this.refreshTimeout = setTimeout(async () => {
            try {
                console.log('Refreshing packages after operation completion...');

                // Update status to show refresh is happening
                this.updateProgressMessage('Refreshing package list...');
                this.appendProgressOutput('\n--- Refreshing package information ---\n');

                // Update progress bar to show refresh activity
                const progressBar = document.getElementById('packages-progress-bar');
                if (progressBar) {
                    progressBar.style.width = '100%';
                    progressBar.style.background = 'linear-gradient(90deg, #17a2b8, #138496)';
                }

                // Update status
                const statusElement = document.getElementById('packages-operation-status');
                if (statusElement) {
                    statusElement.textContent = 'Refreshing package list...';
                }

                // Refresh installed packages
                await this.getInstalledPackages();

                // Check for updates
                await this.checkForUpdates();

                // Re-render the package list to reflect changes
                this.filterPackages();

                // Clear selection since package states may have changed
                this.selectedPackages.clear();

                // Update selection info
                this.updateSelectionInfo();

                // Update status to completed
                if (statusElement) {
                    statusElement.textContent = 'Package list refreshed';
                }

                console.log('Package refresh completed');
                this.appendProgressOutput('Package list refreshed successfully\n');
            } catch (error) {
                console.error('Error refreshing packages:', error);
                this.appendProgressOutput(`Error refreshing packages: ${error.message}\n`);

                // Update status to show error
                const statusElement = document.getElementById('packages-operation-status');
                if (statusElement) {
                    statusElement.textContent = 'Refresh failed';
                }
            }
        }, 1000); // 1 second delay to allow operations to settle
    }

    hideProgress() {
        console.log('hideProgress() called');

        // Stop timer
        this.stopTimer();

        const modal = document.getElementById('packages-progress-modal');
        const container = document.getElementById('progress-container');

        if (modal) {
            console.log('Modal found, hiding');
            modal.style.display = 'none';
            modal.className = 'progress-modal'; // Reset modal class
        }

        if (container) {
            container.style.display = 'none';
        }

        this.currentOperation = null;

        // Clear operation tracking
        this.currentOperationPackage = null;
        this.currentOperationType = null;

        // Reset modal content
        this.resetModalContent();
    }

    resetModalContent() {
        // Reset progress bar
        const progressBar = document.getElementById('packages-progress-bar');
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.style.background =
                'linear-gradient(90deg, var(--primary-color), rgba(var(--primary-rgb), 0.8))';
        }

        // Reset text elements
        const textElement = document.getElementById('packages-progress-text');
        if (textElement) {
            textElement.style.color = 'var(--text-primary)';
            textElement.style.fontWeight = '500';
        }

        // Hide current package section
        const currentPackageSection = document.getElementById('packages-current-package');
        if (currentPackageSection) {
            currentPackageSection.style.display = 'none';
        }

        // Reset output section to collapsed state
        const outputSection = document.querySelector('.progress-output-section');
        if (outputSection) {
            outputSection.classList.add('collapsed');
            const toggleBtn = document.getElementById('packages-toggle-output');
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('i');
                if (icon) icon.className = 'fas fa-chevron-down';
                toggleBtn.title = 'Expand Output';
            }
        }

        // Hide action buttons
        this.hideActionButtons();

        // Clear output
        const outputElement = document.getElementById('packages-progress-output');
        if (outputElement) {
            outputElement.textContent = '';
        }
    }

    cancelOperation() {
        if (this.currentOperation) {
            this.currentOperation.cancelled = true;
            const container = document.getElementById('progress-container');
            if (container) {
                container.className = 'progress-container cancelled';
            }
            this.updateProgressMessage('Operation cancelled');
            this.updateProgressDetails('Cancelling...');

            setTimeout(() => {
                this.hideProgress();
            }, 1500);
        }
    }

    handleProgressClick(event) {
        // Don't close if clicking on the cancel button
        if (event.target.closest('.progress-cancel')) {
            return;
        }

        const container = document.getElementById('progress-container');
        if (
            container &&
            (container.classList.contains('completed') ||
                container.classList.contains('error') ||
                container.classList.contains('cancelled'))
        ) {
            this.hideProgress();
        }
    }

    async exportPackages() {
        if (this.selectedPackages.size === 0) {
            this.showStatus('No packages selected for export.', 'warning');
            return;
        }

        const packagesToExport = {};
        for (const packageKey of this.selectedPackages) {
            if (this.packages[packageKey]) {
                packagesToExport[packageKey] = this.packages[packageKey];
            }
        }

        if (Object.keys(packagesToExport).length === 0) {
            this.showStatus('Could not find data for selected packages.', 'error');
            return;
        }

        try {
            if (window.electronAPI && window.electronAPI.showSaveDialog) {
                const result = await window.electronAPI.showSaveDialog({
                    title: 'Export Selected Packages',
                    defaultPath: 'wintool-packages.json',
                    filters: [
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] },
                    ],
                });

                if (!result.canceled && result.filePath) {
                    await window.electronAPI.writeFile(
                        result.filePath,
                        JSON.stringify(packagesToExport, null, 2)
                    );
                    this.showStatus(
                        `Successfully exported ${Object.keys(packagesToExport).length} packages to ${result.filePath}`,
                        'success'
                    );
                }
            } else {
                this.showStatus(
                    'Export functionality is not available in this environment.',
                    'error'
                );
            }
        } catch (error) {
            this.showStatus(`Error exporting packages: ${error.message}`, 'error');
            console.error('Export error:', error);
        }
    }

    async importPackages() {
        try {
            if (window.electronAPI && window.electronAPI.showOpenDialog) {
                const result = await window.electronAPI.showOpenDialog({
                    title: 'Import Packages',
                    properties: ['openFile'],
                    filters: [
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] },
                    ],
                });

                if (!result.canceled && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    const fileContent = await window.electronAPI.readFile(filePath);
                    const importedPackages = JSON.parse(fileContent);

                    if (typeof importedPackages !== 'object' || importedPackages === null) {
                        throw new Error('Invalid file format. Expected a JSON object.');
                    }

                    let importedCount = 0;
                    for (const packageKey in importedPackages) {
                        if (this.packages[packageKey]) {
                            this.selectedPackages.add(packageKey);
                            importedCount++;
                        } else {
                            console.warn(
                                `Imported package key "${packageKey}" not found in the current package list. Skipping.`
                            );
                        }
                    }

                    this.renderPackages(); // Re-render to update selection visuals
                    this.updateSelectionInfo();
                    this.showStatus(
                        `Successfully imported and selected ${importedCount} packages.`,
                        'success'
                    );
                }
            } else {
                this.showStatus(
                    'Import functionality is not available in this environment.',
                    'error'
                );
            }
        } catch (error) {
            this.showStatus(`Error importing packages: ${error.message}`, 'error');
            console.error('Import error:', error);
        }
    }
}

// Initialize package manager when the tab loads
let packageManager;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        packageManager = new PackageManager();
        // Create global reset function for refresh functionality
        if (packageManager && packageManager.lazyHelper) {
            packageManager.lazyHelper.createGlobalResetFunction();
        }
    });
} else {
    packageManager = new PackageManager();
    // Create global reset function for refresh functionality
    if (packageManager && packageManager.lazyHelper) {
        packageManager.lazyHelper.createGlobalResetFunction();
    }
}

// Expose package manager methods to the command palette
window.installPackage = packageName => {
    if (packageManager) {
        packageManager.installPackage(packageName);
    }
};

window.uninstallPackage = packageName => {
    if (packageManager) {
        packageManager.uninstallPackage(packageName);
    }
};

// Ensure All category is active when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all elements are rendered
    setTimeout(() => {
        const allCategoryBtn = document.querySelector('.category-btn[data-category="all"]');
        if (allCategoryBtn && !allCategoryBtn.classList.contains('active')) {
            // Remove active from all buttons first
            document
                .querySelectorAll('.category-btn')
                .forEach(btn => btn.classList.remove('active'));
            // Add active to All button
            allCategoryBtn.classList.add('active');
            console.log('Ensured "All" category button is active on DOM ready');
        }
    }, 100);
});
