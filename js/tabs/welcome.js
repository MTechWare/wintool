/**
 * WinTool - Welcome Tab JavaScript
 * Handles functionality specific to the welcome tab
 */

// Initialize the welcome tab
function initWelcomeTab() {
    console.log('Welcome tab initialized');
    
    // Set up feature links
    setupFeatureLinks();
    
    // Set up tutorial functionality
    setupTutorial();
}

// Set up feature links to navigate to different tabs
function setupFeatureLinks() {
    console.log('Setting up feature links');
    const featureLinks = document.querySelectorAll('.feature-link');
    featureLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = link.getAttribute('data-tab');
            if (tabName) {
                // Use the existing tab navigation function
                window.switchTab(tabName);
            }
        });
    });
}

// Set up tutorial functionality
function setupTutorial() {
    console.log('Setting up tutorial');
    
    // Get elements
    const tutorial = document.getElementById('first-time-tutorial');
    const overlay = document.querySelector('.tutorial-overlay');
    const closeBtn = document.getElementById('close-tutorial');
    const tutorialBtn = document.getElementById('start-tutorial-btn');
    
    console.log('Tutorial elements:', {tutorial, overlay, closeBtn, tutorialBtn});
    
    // Check if elements exist
    if (!tutorial || !closeBtn || !tutorialBtn) {
        console.error('Tutorial elements not found');
        return;
    }
    
    // Function to show tutorial
    function showTutorial() {
        console.log('Showing tutorial');
        if (overlay) overlay.style.display = 'block';
        tutorial.style.display = 'block';
    }
    
    // Function to hide tutorial
    function hideTutorial() {
        console.log('Hiding tutorial');
        if (overlay) overlay.style.display = 'none';
        tutorial.style.display = 'none';
    }
    
    // Show tutorial on first visit
    if (!localStorage.getItem('wintool_tutorial_shown')) {
        console.log('First time user, showing tutorial');
        setTimeout(showTutorial, 500); // Slight delay to ensure DOM is ready
    }
    
    // Close tutorial and save preference
    closeBtn.addEventListener('click', function() {
        console.log('Close button clicked');
        hideTutorial();
        localStorage.setItem('wintool_tutorial_shown', '1');
    });
    
    // Show tutorial on button click
    tutorialBtn.addEventListener('click', function() {
        console.log('Tutorial button clicked');
        showTutorial();
    });
}

// Export the initialization function
window.initWelcomeTab = initWelcomeTab;
