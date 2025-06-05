/**
 * Packages Tab - Windows Package Manager using winget
 */

class PackageManager {
    constructor() {
        this.packages = {};
        this.filteredPackages = {};
        this.selectedPackages = new Set();
        this.currentCategory = 'all';
        this.searchTerm = '';
        this.init();
    }

    async init() {
        console.log('Initializing Package Manager...');

        try {
            // Load packages from applications.json
            await this.loadPackages();

            // Setup event listeners
            this.setupEventListeners();

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
        
        if (installBtn) {
            installBtn.addEventListener('click', () => this.installSelected());
        }
        
        if (uninstallBtn) {
            uninstallBtn.addEventListener('click', () => this.uninstallSelected());
        }
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
            packagesList.appendChild(packageItem);
        });
        
        this.updateSelectionInfo();
    }

    createPackageItem(key, pkg) {
        const item = document.createElement('div');
        item.className = 'package-item';
        item.dataset.packageKey = key;
        
        // Determine icon based on package name or category
        let icon = 'fas fa-cube';
        if (pkg.content.toLowerCase().includes('password')) icon = 'fas fa-key';
        else if (pkg.content.toLowerCase().includes('zip') || pkg.content.toLowerCase().includes('archive')) icon = 'fas fa-file-archive';
        else if (pkg.category === 'Browsers') icon = 'fas fa-globe';
        else if (pkg.category === 'Development') icon = 'fas fa-code';
        else if (pkg.category === 'Multimedia Tools') icon = 'fas fa-music';
        else if (pkg.category === 'Microsoft Tools') icon = 'fab fa-microsoft';
        else if (pkg.category === 'Utilities') icon = 'fas fa-tools';
        
        item.innerHTML = `
            <div class="package-checkbox">
                <input type="checkbox" data-package="${key}">
            </div>
            <div class="package-info">
                <div class="package-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="package-name">${pkg.content}</div>
            </div>
            <div class="package-description">${pkg.description}</div>
            <div class="package-actions">
                <button class="package-action-btn install-package-btn" onclick="packageManager.installPackage('${key}')">
                    <i class="fas fa-download"></i>
                </button>
                <button class="package-action-btn uninstall-package-btn" onclick="packageManager.uninstallPackage('${key}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Add checkbox event listener
        const checkbox = item.querySelector('input[type="checkbox"]');
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
        
        if (countElement) {
            countElement.textContent = `${count} package${count !== 1 ? 's' : ''} selected`;
        }
        
        if (installBtn) installBtn.disabled = count === 0;
        if (uninstallBtn) uninstallBtn.disabled = count === 0;
        
        // Update select all checkbox state
        const selectAllCheckbox = document.getElementById('select-all');
        const totalVisible = Object.keys(this.filteredPackages).length;
        
        if (selectAllCheckbox && totalVisible > 0) {
            selectAllCheckbox.indeterminate = count > 0 && count < totalVisible;
            selectAllCheckbox.checked = count === totalVisible;
        }
    }

    async installPackage(packageKey) {
        const pkg = this.packages[packageKey];
        if (!pkg || !pkg.winget) {
            this.showStatus('Package not found or winget ID missing', 'error');
            return;
        }

        this.showProgress('Installing Package', `Installing ${pkg.content}...`, 'installing');

        try {
            // Execute winget install command with progress streaming
            await this.executeWingetCommandWithProgress(`install ${pkg.winget} --accept-package-agreements --accept-source-agreements`);
        } catch (error) {
            this.updateProgressError(`Error: ${error.message}`);
        }
    }

    async uninstallPackage(packageKey) {
        const pkg = this.packages[packageKey];
        if (!pkg || !pkg.winget) {
            this.showStatus('Package not found or winget ID missing', 'error');
            return;
        }

        this.showProgress('Uninstalling Package', `Uninstalling ${pkg.content}...`, 'uninstalling');

        try {
            // Execute winget uninstall command with progress streaming
            await this.executeWingetCommandWithProgress(`uninstall ${pkg.winget}`);
        } catch (error) {
            this.updateProgressError(`Error: ${error.message}`);
        }
    }

    async installSelected() {
        if (this.selectedPackages.size === 0) return;

        const packageNames = Array.from(this.selectedPackages).map(key => this.packages[key].content).join(', ');
        this.showProgress('Installing Selected Packages', `Installing ${this.selectedPackages.size} packages`, 'installing');

        let completed = 0;
        const total = this.selectedPackages.size;

        for (const packageKey of this.selectedPackages) {
            const pkg = this.packages[packageKey];
            if (pkg && pkg.winget) {
                try {
                    this.updateProgressMessage(`Installing ${pkg.content}...`);
                    this.updateProgressDetails(`Package ${completed + 1} of ${total}`);
                    this.appendProgressOutput(`\n--- Installing ${pkg.content} ---`);

                    await this.executeWingetCommandWithProgress(`install ${pkg.winget} --accept-package-agreements --accept-source-agreements`);
                    completed++;
                    this.updateProgressPercentage((completed / total) * 100);
                } catch (error) {
                    this.appendProgressOutput(`Error installing ${pkg.content}: ${error.message}`);
                }
            }
        }

        this.completeProgress('Installation process completed');
    }

    async uninstallSelected() {
        if (this.selectedPackages.size === 0) return;

        const packageNames = Array.from(this.selectedPackages).map(key => this.packages[key].content).join(', ');
        this.showProgress('Uninstalling Selected Packages', `Uninstalling ${this.selectedPackages.size} packages`, 'uninstalling');

        let completed = 0;
        const total = this.selectedPackages.size;

        for (const packageKey of this.selectedPackages) {
            const pkg = this.packages[packageKey];
            if (pkg && pkg.winget) {
                try {
                    this.updateProgressMessage(`Uninstalling ${pkg.content}...`);
                    this.updateProgressDetails(`Package ${completed + 1} of ${total}`);
                    this.appendProgressOutput(`\n--- Uninstalling ${pkg.content} ---`);

                    await this.executeWingetCommandWithProgress(`uninstall ${pkg.winget}`);
                    completed++;
                    this.updateProgressPercentage((completed / total) * 100);
                } catch (error) {
                    this.appendProgressOutput(`Error uninstalling ${pkg.content}: ${error.message}`);
                }
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

    async executeWingetCommandWithProgress(command) {
        this.currentOperation = { cancelled: false };

        try {
            if (window.electronAPI && window.electronAPI.executeWingetCommandWithProgress) {
                // Use real winget command execution with progress streaming
                await window.electronAPI.executeWingetCommandWithProgress(command, (progressData) => {
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
                await this.simulateProgressOperation(command);
            }
        } catch (error) {
            if (!this.currentOperation.cancelled) {
                this.updateProgressError(`Winget command failed: ${error.message}`);
            }
        }
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
