/**
 * WinTool - About Tab JavaScript
 * Handles functionality specific to the about tab
 */

// Initialize the about tab
function initAboutTab() {
    console.log('About tab initialized');
    
    // Update the copyright year dynamically
    updateCopyrightYear();
    
    // Set up any links or buttons in the about tab
    setupLinks();
}

// Update the copyright year to the current year
function updateCopyrightYear() {
    const currentYear = new Date().getFullYear();
    const copyrightElement = document.querySelector('.feature-section div[style*="font-size:0.98rem"]');
    
    if (copyrightElement) {
        copyrightElement.innerHTML = copyrightElement.innerHTML.replace(/\d{4} WinTool/, `${currentYear} WinTool`);
    }
}

// Set up links and buttons in the about tab
function setupLinks() {
    // Add event listeners to any buttons or links that need special handling
    // For example, you could add a "Check for Updates" button here
}

// Export the initialization function
window.initAboutTab = initAboutTab;
