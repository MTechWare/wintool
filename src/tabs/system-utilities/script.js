/**
 * System Utilities Tab JavaScript
 *
 * This script handles launching Windows system utilities and administrative tools
 */

console.log('System Utilities tab script loaded');

/**
 * Launch a system utility
 * @param {string} utilityCommand - The command or utility to launch
 */
async function launchUtility(utilityCommand) {
    try {
        // Add loading state to the clicked card
        const clickedCard = event.target.closest('.utility-card');
        if (clickedCard) {
            clickedCard.classList.add('loading');
        }

        if (window.electronAPI && window.electronAPI.launchSystemUtility) {
            // Use real system utility launcher
            const result = await window.electronAPI.launchSystemUtility(utilityCommand);
            if (result.success) {
                showStatusMessage('success', result.message);
            }
        } else {
            // Fallback for browser testing
            showStatusMessage('warning', `This would launch: ${utilityCommand}\n\nIn the full implementation, this would open the actual Windows utility.`);
        }

    } catch (error) {
        console.error('Error launching utility:', error);
        showStatusMessage('error', `Failed to launch ${utilityCommand}: ${error.message}`);
    } finally {
        // Remove loading state
        const clickedCard = event.target.closest('.utility-card');
        if (clickedCard) {
            clickedCard.classList.remove('loading');
        }
    }
}

/**
 * Launch disk check utility with drive selection
 */
async function launchDiskCheck() {
    try {
        const clickedCard = event.target.closest('.utility-card');
        if (clickedCard) {
            clickedCard.classList.add('loading');
        }

        // For disk check, we'll open command prompt with chkdsk command
        // Users can then specify the drive they want to check
        if (window.electronAPI && window.electronAPI.launchSystemUtility) {
            const result = await window.electronAPI.launchSystemUtility('cmd');
            if (result.success) {
                showStatusMessage('success', 'Command Prompt opened. Use "chkdsk C: /f" to check C: drive (requires admin privileges)');
            }
        } else {
            showStatusMessage('warning', 'This would open Command Prompt for disk checking.\n\nUse "chkdsk C: /f" to check C: drive.');
        }

    } catch (error) {
        console.error('Error launching disk check:', error);
        showStatusMessage('error', `Failed to launch disk check: ${error.message}`);
    } finally {
        const clickedCard = event.target.closest('.utility-card');
        if (clickedCard) {
            clickedCard.classList.remove('loading');
        }
    }
}

/**
 * Show status message to user
 * @param {string} type - Message type: 'success', 'error', 'warning'
 * @param {string} message - Message to display
 */
function showStatusMessage(type, message) {
    const statusElement = document.getElementById('status-message');
    if (!statusElement) return;

    // Clear existing classes and content
    statusElement.className = 'status-message';
    statusElement.classList.add(type);
    statusElement.textContent = message;
    statusElement.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

/**
 * Search utilities based on name and description
 * @param {string} searchTerm - The search term to filter utilities
 */
function searchUtilities(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const sections = document.querySelectorAll('.utilities-section');
    const noResultsElement = document.getElementById('no-results');
    let visibleUtilities = 0;
    let visibleSections = 0;

    sections.forEach(section => {
        const cards = section.querySelectorAll('.utility-card');
        let sectionHasVisibleCards = false;

        cards.forEach(card => {
            const utilityName = card.querySelector('h4').textContent.toLowerCase();
            const utilityDescription = card.querySelector('p').textContent.toLowerCase();
            const isMatch = term === '' ||
                           utilityName.includes(term) ||
                           utilityDescription.includes(term);

            if (isMatch) {
                card.classList.remove('hidden');
                sectionHasVisibleCards = true;
                visibleUtilities++;
            } else {
                card.classList.add('hidden');
            }
        });

        // Hide section if no cards are visible
        if (sectionHasVisibleCards) {
            section.classList.remove('hidden');
            visibleSections++;
        } else {
            section.classList.add('hidden');
        }
    });

    // Update utility count
    updateUtilityCount(visibleUtilities, term);

    // Show/hide no results message
    if (visibleUtilities === 0 && term !== '') {
        noResultsElement.style.display = 'block';
    } else {
        noResultsElement.style.display = 'none';
    }
}

/**
 * Update the utility count display
 * @param {number} visibleCount - Number of visible utilities
 * @param {string} searchTerm - Current search term
 */
function updateUtilityCount(visibleCount, searchTerm) {
    const totalCountElement = document.getElementById('total-utilities-count');
    const filteredCountElement = document.getElementById('filtered-utilities-count');

    if (searchTerm && searchTerm.trim() !== '') {
        filteredCountElement.textContent = `${visibleCount} utilities found`;
        filteredCountElement.style.display = 'inline';
    } else {
        filteredCountElement.textContent = '';
        filteredCountElement.style.display = 'none';
    }
}

/**
 * Initialize the System Utilities tab
 */
function initSystemUtilities() {
    console.log('Initializing System Utilities tab');

    // Setup search functionality
    const searchInput = document.getElementById('utilities-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchUtilities(e.target.value);
        });

        // Clear search on Escape key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                searchUtilities('');
                searchInput.blur();
            }
        });
    }

    // Add keyboard shortcuts for common utilities
    document.addEventListener('keydown', (event) => {
        // Only handle shortcuts when this tab is active
        const activeTab = document.querySelector('.tab-content.active[data-tab*="system-utilities"]');
        if (!activeTab) return;

        // Ctrl+Shift+T for Task Manager
        if (event.ctrlKey && event.shiftKey && event.key === 'T') {
            event.preventDefault();
            launchUtility('taskmgr');
        }

        // Ctrl+Shift+R for Registry Editor
        if (event.ctrlKey && event.shiftKey && event.key === 'R') {
            event.preventDefault();
            launchUtility('regedit');
        }

        // Ctrl+Shift+D for Device Manager
        if (event.ctrlKey && event.shiftKey && event.key === 'D') {
            event.preventDefault();
            launchUtility('devmgmt.msc');
        }

        // Ctrl+Shift+S for Services
        if (event.ctrlKey && event.shiftKey && event.key === 'S') {
            event.preventDefault();
            launchUtility('services.msc');
        }

        // Ctrl+F to focus search
        if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            const searchInput = document.getElementById('utilities-search');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    });

    // Add tooltips enhancement
    const utilityCards = document.querySelectorAll('.utility-card');
    utilityCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            // Add subtle animation on hover
            card.style.transition = 'all 0.3s ease';
        });
    });

    console.log('System Utilities tab initialized successfully');

    // Signal that this tab is ready
    if (window.markTabAsReady && typeof tabId !== 'undefined') {
        console.log('Marking system-utilities tab as ready');
        window.markTabAsReady(tabId);
    }
}

/**
 * Handle utility card click events
 */
function handleUtilityClick(utilityCommand, event) {
    event.preventDefault();
    event.stopPropagation();
    launchUtility(utilityCommand);
}

// Make functions globally available for onclick handlers
window.launchUtility = launchUtility;
window.launchDiskCheck = launchDiskCheck;
window.showStatusMessage = showStatusMessage;
window.initSystemUtilities = initSystemUtilities;
window.handleUtilityClick = handleUtilityClick;
window.searchUtilities = searchUtilities;
window.updateUtilityCount = updateUtilityCount;

// Initialize when the tab is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSystemUtilities);
} else {
    initSystemUtilities();
}
