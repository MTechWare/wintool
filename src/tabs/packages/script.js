/**
 * Packages Tab - Windows Package Manager using winget
 * Enhanced with security validations and XSS protection
 */

class PackageManager {
    constructor() {
        this.packages = {};
        this.filteredPackages = {};
        this.selectedPackages = new Set();
        this.currentCategory = 'all';
        this.searchTerm = '';
        this.currentOperation = null;
        this.currentPackageManager = 'winget'; // Default to winget
        this.chocoAvailable = false; // Will be checked during init

        // Security configuration
        this.securityConfig = {
            allowedWingetCommands: ['install', 'uninstall', 'search', 'list', 'show', 'upgrade'],
            allowedChocoCommands: ['install', 'uninstall', 'search', 'list', 'info', 'upgrade'],
            packageIdMaxLength: 200,
            packageIdPattern: /^[a-zA-Z0-9._-]+$/,
            chocoPackageIdPattern: /^[a-zA-Z0-9._-]+$/,
            maxConcurrentOperations: 3,
            trustedPublishers: [
                'Microsoft Corporation',
                'Microsoft',
                'Google LLC',
                'Mozilla',
                'Adobe Inc.',
                'Oracle Corporation'
            ]
        };

        this.init();
    }

    // Security validation methods
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

    isTrustedPublisher(publisher) {
        return this.securityConfig.trustedPublishers.includes(publisher);
    }

    async init() {
        console.log('Initializing Package Manager...');

        try {
            // Check Chocolatey availability
            await this.checkChocoAvailability();

            // Load packages from applications.json
            await this.loadPackages();

            // Setup event listeners
            this.setupEventListeners();

            // Update package manager selector based on availability
            this.updatePackageManagerSelector();

            // Render initial package list
            this.renderPackages();

            console.log('Package Manager initialized');

            // Signal that this tab is ready
            if (window.markTabAsReady && typeof tabId !== 'undefined') {
                window.markTabAsReady(tabId);
            }
        } catch (error) {
            console.error('Error initializing Package Manager:', error);
            // Still signal ready even if there was an error
            if (window.markTabAsReady && typeof tabId !== 'undefined') {
                window.markTabAsReady(tabId);
            }
        }
    }

    async checkChocoAvailability() {
        try {
            if (window.electronAPI && window.electronAPI.checkChocoAvailability) {
                this.chocoAvailable = await window.electronAPI.checkChocoAvailability();
                console.log('Chocolatey availability:', this.chocoAvailable);
            } else {
                this.chocoAvailable = false;
                console.log('Chocolatey check not available (browser mode)');
            }
        } catch (error) {
            console.error('Error checking Chocolatey availability:', error);
            this.chocoAvailable = false;
        }
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
                console.log('Loading packages from Electron API...');
                this.packages = await window.electronAPI.getApplicationsData();
                this.filteredPackages = { ...this.packages };
                const packageCount = Object.keys(this.packages).length;
                console.log('Loaded packages from Electron API:', packageCount);
                this.showStatus(`Successfully loaded ${packageCount} packages from applications.json`, 'success');
                this.updateTotalPackageCount(packageCount);
                return;
            }

            // Fallback: try to load via fetch (for browser testing)
            console.log('Electron API not available, trying fetch...');
            let response;
            const possiblePaths = [
                './src/tabs/packages/applications.json',
                '../packages/applications.json',
                './tabs/packages/applications.json',
                'src/tabs/packages/applications.json'
            ];

            for (const path of possiblePaths) {
                try {
                    response = await fetch(path);
                    if (response.ok) {
                        console.log(`Successfully loaded packages from: ${path}`);
                        this.packages = await response.json();
                        this.filteredPackages = { ...this.packages };
                        const packageCount = Object.keys(this.packages).length;
                        console.log('Loaded packages via fetch:', packageCount);
                        this.showStatus(`Successfully loaded ${packageCount} packages from applications.json`, 'success');
                        this.updateTotalPackageCount(packageCount);
                        return;
                    }
                } catch (e) {
                    console.log(`Failed to load from: ${path}`);
                }
            }

            throw new Error('Could not load applications.json from any source');

        } catch (error) {
            console.error('Error loading packages:', error);
            this.showStatus(`Failed to load packages: ${error.message}`, 'error');

            // Initialize empty packages if loading fails
            this.packages = {};
            this.filteredPackages = {};
            this.updateTotalPackageCount(0);
        }
    }

    setupEventListeners() {
        // Package manager selector
        const packageManagerSelect = document.getElementById('package-manager-select');
        if (packageManagerSelect) {
            packageManagerSelect.addEventListener('change', (e) => {
                this.switchPackageManager(e.target.value);
            });
        }

        // Search input
        const searchInput = document.getElementById('package-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterPackages();
            });
        }

        // Category buttons
        const categoryButtons = document.querySelectorAll('.category-btn');
        categoryButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
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
            selectAllCheckbox.addEventListener('change', (e) => {
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
    }

    switchPackageManager(packageManager) {
        // Check if trying to switch to Chocolatey when it's not available
        if (packageManager === 'choco' && !this.chocoAvailable) {
            this.showStatus('Chocolatey is not installed. Please install Chocolatey first: https://chocolatey.org/install', 'error');

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

        // Clear current selection
        this.selectedPackages.clear();
        this.updateSelectionInfo();

        // Re-render packages to show appropriate package IDs
        this.renderPackages();

        // Show status message
        const managerName = packageManager === 'choco' ? 'Chocolatey' : 'Windows Package Manager';
        this.showStatus(`Switched to ${managerName}`, 'success');
    }

    filterPackages() {
        this.filteredPackages = {};
        
        Object.keys(this.packages).forEach(key => {
            const pkg = this.packages[key];
            
            // Category filter
            const categoryMatch = this.currentCategory === 'all' || pkg.category === this.currentCategory;
            
            // Search filter
            const searchMatch = this.searchTerm === '' || 
                pkg.content.toLowerCase().includes(this.searchTerm) ||
                pkg.description.toLowerCase().includes(this.searchTerm);
            
            if (categoryMatch && searchMatch) {
                this.filteredPackages[key] = pkg;
            }
        });
        
        this.renderPackages();
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
            if (packageItem) { // Ensure item is valid before appending
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
            console.warn('Invalid package data or missing package ID:', key, pkg, this.currentPackageManager);
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
        else if (contentLower.includes('zip') || contentLower.includes('archive')) iconClass = 'fas fa-file-archive';
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

        if (pkg.link) {
            const link = document.createElement('a');
            link.href = pkg.link;
            link.textContent = pkg.content || 'Unknown Package';
            link.target = '_blank'; // Open in new tab
            link.title = `Visit ${pkg.content} website`;
            packageName.appendChild(link);
        } else {
            packageName.textContent = pkg.content || 'Unknown Package';
        }

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

        // Create install button
        const installBtn = document.createElement('button');
        installBtn.className = 'package-action-btn install-package-btn';
        installBtn.title = 'Install Package';
        installBtn.innerHTML = '<i class="fas fa-download"></i>';
        installBtn.onclick = () => this.installPackageSecure(key);

        // Create uninstall button
        const uninstallBtn = document.createElement('button');
        uninstallBtn.className = 'package-action-btn uninstall-package-btn';
        uninstallBtn.title = 'Uninstall Package';
        uninstallBtn.innerHTML = '<i class="fas fa-trash"></i>';
        uninstallBtn.onclick = () => this.uninstallPackageSecure(key);

        actions.appendChild(installBtn);
        actions.appendChild(uninstallBtn);

        // Assemble the item
        item.appendChild(checkboxContainer);
        item.appendChild(packageInfo);
        item.appendChild(publisher);
        item.appendChild(description);
        item.appendChild(actions);

        // Add checkbox event listener
        checkbox.addEventListener('change', (e) => {
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

        // Confirm installation for untrusted publishers
        if (pkg.publisher && !this.isTrustedPublisher(pkg.publisher)) {
            const confirmed = confirm(
                `Warning: This package is from "${pkg.publisher}" which is not in the trusted publishers list.\n\n` +
                `Package: ${pkg.content}\n` +
                `Publisher: ${pkg.publisher}\n\n` +
                `Do you want to continue with the installation?`
            );

            if (!confirmed) {
                return;
            }
        }

        const sanitizedPackageId = this.sanitizePackageId(packageId);
        this.showProgress('Installing Package', `Installing ${this.escapeHtml(pkg.content)}...`, 'installing');

        try {
            if (this.currentPackageManager === 'choco') {
                // Execute chocolatey install command
                await this.executeChocoCommandWithProgressSecure('install', sanitizedPackageId, ['-y']);
            } else {
                // Execute winget install command with validated parameters
                await this.executeWingetCommandWithProgressSecure('install', sanitizedPackageId, [
                    '--accept-package-agreements',
                    '--accept-source-agreements'
                ]);
            }
        } catch (error) {
            this.updateProgressError(`Error: ${error.message}`);
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
        this.showProgress('Uninstalling Package', `Uninstalling ${this.escapeHtml(pkg.content)}...`, 'uninstalling');

        try {
            if (this.currentPackageManager === 'choco') {
                // Execute chocolatey uninstall command
                await this.executeChocoCommandWithProgressSecure('uninstall', sanitizedPackageId, ['-y']);
            } else {
                // Execute winget uninstall command with validated parameters
                await this.executeWingetCommandWithProgressSecure('uninstall', sanitizedPackageId, []);
            }
        } catch (error) {
            this.updateProgressError(`Error: ${error.message}`);
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
            this.showStatus(`${invalidPackages.length} packages have invalid IDs and will be skipped`, 'warning');
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

        this.showProgress('Installing Selected Packages', `Installing ${validPackages.length} packages`, 'installing');

        let completed = 0;
        const total = validPackages.length;

        for (const { key, pkg, packageId } of validPackages) {
            if (this.currentOperation && this.currentOperation.cancelled) {
                break;
            }

            try {
                this.updateProgressMessage(`Installing ${this.escapeHtml(pkg.content)}...`);
                this.updateProgressDetails(`Package ${completed + 1} of ${total}`);
                this.appendProgressOutput(`\n--- Installing ${pkg.content} ---`);

                const sanitizedPackageId = this.sanitizePackageId(packageId);

                if (this.currentPackageManager === 'choco') {
                    await this.executeChocoCommandWithProgressSecure('install', sanitizedPackageId, ['-y']);
                } else {
                    await this.executeWingetCommandWithProgressSecure('install', sanitizedPackageId, [
                        '--accept-package-agreements',
                        '--accept-source-agreements'
                    ]);
                }

                completed++;
                this.updateProgressPercentage((completed / total) * 100);
            } catch (error) {
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
            this.showStatus(`${invalidPackages.length} packages have invalid IDs and will be skipped`, 'warning');
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

        this.showProgress('Uninstalling Selected Packages', `Uninstalling ${validPackages.length} packages`, 'uninstalling');

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
                    await this.executeChocoCommandWithProgressSecure('uninstall', sanitizedPackageId, ['-y']);
                } else {
                    await this.executeWingetCommandWithProgressSecure('uninstall', sanitizedPackageId, []);
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
            } else {
                // Fallback to simulation for browser testing
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(`Simulated execution of: winget ${command}\n\nThis is a demo - actual winget integration would require Electron main process communication.`);
                    }, 1000);
                });
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
        const sanitizedArgs = additionalArgs.filter(arg =>
            typeof arg === 'string' && (arg.startsWith('-') || arg.startsWith('--'))
        );

        this.currentOperation = { cancelled: false };

        try {
            if (window.electronAPI && window.electronAPI.executeChocoCommandWithProgress) {
                // Use chocolatey command execution with progress
                const commandString = `${sanitizedCommand} ${sanitizedPackageId} ${sanitizedArgs.join(' ')}`.trim();
                await window.electronAPI.executeChocoCommandWithProgress(commandString, (progressData) => {
                    if (this.currentOperation.cancelled) return;

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
                });
            } else {
                // Fallback to simulation for browser testing
                await this.simulateProgressOperation(`choco ${sanitizedCommand} ${sanitizedPackageId}`);
            }
        } catch (error) {
            if (!this.currentOperation.cancelled) {
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
        const sanitizedArgs = additionalArgs.filter(arg =>
            typeof arg === 'string' && arg.startsWith('--')
        );

        this.currentOperation = { cancelled: false };

        try {
            if (window.electronAPI && window.electronAPI.executeWingetCommandWithProgressSecure) {
                // Use secure winget command execution with validated parameters
                await window.electronAPI.executeWingetCommandWithProgressSecure(
                    sanitizedCommand,
                    sanitizedPackageId,
                    sanitizedArgs,
                    (progressData) => {
                        if (this.currentOperation.cancelled) return;

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
                const commandString = `${sanitizedCommand} ${sanitizedPackageId} ${sanitizedArgs.join(' ')}`.trim();
                await window.electronAPI.executeWingetCommandWithProgress(commandString, (progressData) => {
                    if (this.currentOperation.cancelled) return;

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
                });
            } else {
                // Fallback to simulation for browser testing
                await this.simulateProgressOperation(`${sanitizedCommand} ${sanitizedPackageId}`);
            }
        } catch (error) {
            if (!this.currentOperation.cancelled) {
                this.updateProgressError(`Winget command failed: ${error.message}`);
            }
        }
    }

    // Legacy function for backward compatibility (deprecated)
    async executeWingetCommandWithProgress(command) {
        console.warn('executeWingetCommandWithProgress is deprecated, use executeWingetCommandWithProgressSecure instead');

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
            { message: 'Finalizing...', percentage: 95 }
        ];

        for (const step of steps) {
            if (this.currentOperation.cancelled) return;

            this.updateProgressDetails(step.message);
            this.updateProgressPercentage(step.percentage);
            this.appendProgressOutput(`${step.message}\n`);

            await new Promise(resolve => setTimeout(resolve, 800));
        }

        if (!this.currentOperation.cancelled) {
            this.appendProgressOutput(`Simulated execution of: winget ${command}\n\nThis is a demo - actual winget integration would require Electron main process communication.`);
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

    // Progress Bar Methods
    showProgress(title, message, type = 'installing') {
        const container = document.getElementById('progress-container');
        const titleElement = document.getElementById('progress-title');
        const messageElement = document.getElementById('progress-message');
        const detailsElement = document.getElementById('progress-details');
        const outputElement = document.getElementById('progress-output');
        const fillElement = document.getElementById('progress-fill');
        const percentageElement = document.getElementById('progress-percentage');

        if (container && titleElement && messageElement) {
            titleElement.textContent = title;
            messageElement.textContent = message;
            detailsElement.textContent = '';
            outputElement.textContent = '';
            fillElement.style.width = '0%';
            percentageElement.textContent = '0%';

            container.className = `progress-container ${type}`;
            container.style.display = 'block';

            // Scroll to progress bar
            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    updateProgressMessage(message) {
        const messageElement = document.getElementById('progress-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }

    updateProgressDetails(details) {
        const detailsElement = document.getElementById('progress-details');
        if (detailsElement) {
            detailsElement.textContent = details;
        }
    }

    updateProgressPercentage(percentage) {
        const fillElement = document.getElementById('progress-fill');
        const percentageElement = document.getElementById('progress-percentage');

        if (fillElement && percentageElement) {
            const clampedPercentage = Math.min(100, Math.max(0, percentage));
            fillElement.style.width = `${clampedPercentage}%`;
            percentageElement.textContent = `${Math.round(clampedPercentage)}%`;
        }
    }

    appendProgressOutput(text) {
        const outputElement = document.getElementById('progress-output');
        if (outputElement) {
            outputElement.textContent += text;
            outputElement.scrollTop = outputElement.scrollHeight;
        }
    }

    updateProgressError(message) {
        const container = document.getElementById('progress-container');
        if (container) {
            container.className = 'progress-container error';
        }
        this.updateProgressMessage('Error occurred');
        this.updateProgressDetails(message);
        this.appendProgressOutput(`\nERROR: ${message}\n`);
    }

    completeProgress(message) {
        const container = document.getElementById('progress-container');
        if (container) {
            container.className = 'progress-container completed';
        }
        this.updateProgressMessage(message);
        this.updateProgressDetails('Click to close');
        this.updateProgressPercentage(100);

        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.hideProgress();
        }, 3000);
    }

    hideProgress() {
        const container = document.getElementById('progress-container');
        if (container) {
            container.style.display = 'none';
        }
        this.currentOperation = null;
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
        if (container && (container.classList.contains('completed') || container.classList.contains('error') || container.classList.contains('cancelled'))) {
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
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (!result.canceled && result.filePath) {
                    await window.electronAPI.writeFile(result.filePath, JSON.stringify(packagesToExport, null, 2));
                    this.showStatus(`Successfully exported ${Object.keys(packagesToExport).length} packages to ${result.filePath}`, 'success');
                }
            } else {
                this.showStatus('Export functionality is not available in this environment.', 'error');
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
                        { name: 'All Files', extensions: ['*'] }
                    ]
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
                            console.warn(`Imported package key "${packageKey}" not found in the current package list. Skipping.`);
                        }
                    }

                    this.renderPackages(); // Re-render to update selection visuals
                    this.updateSelectionInfo();
                    this.showStatus(`Successfully imported and selected ${importedCount} packages.`, 'success');
                }
            } else {
                this.showStatus('Import functionality is not available in this environment.', 'error');
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
    });
} else {
    packageManager = new PackageManager();
}

console.log('Packages tab script loaded');
