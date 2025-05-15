/**
 * WinTool - Welcome Tab JavaScript
 * Handles functionality for the welcome tab
 */

// Initialize the welcome tab
function initWelcomeTab() {
    console.log('Welcome tab initialized');

    // Set up quick access buttons
    setupQuickAccessButtons();

    // Set up tutorial functionality
    setupTutorial();

    // Add subtle animations
    addAnimations();
}

// Set up quick access buttons to navigate to different tabs
function setupQuickAccessButtons() {
    const quickAccessButtons = document.querySelectorAll('.quick-access-btn');

    quickAccessButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) {
                console.log(`Quick access button clicked for tab: ${tabName}`);
                navigateToTab(tabName);
            }
        });
    });
}

// Helper function to navigate to a tab
function navigateToTab(tabName) {
    // Use the loadTabContent function to navigate to the tab
    if (typeof window.loadTabContent === 'function') {
        window.loadTabContent(tabName);
    } else {
        console.error('loadTabContent function not found');
        // Fallback to switchTab if loadTabContent is not available
        if (typeof window.switchTab === 'function') {
            window.switchTab(tabName);
        }
    }
}

// Set up tutorial functionality
function setupTutorial() {
    // Get tutorial elements
    const tutorialBtn = document.getElementById('start-tutorial-btn');
    const tutorialModal = document.getElementById('tutorial-modal');
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    const closeBtn = document.getElementById('close-tutorial');
    const closeTutorialBtn = document.getElementById('close-tutorial-btn');
    const tabPreviews = document.querySelectorAll('.tab-preview');

    // Function to open the tutorial
    function openTutorial() {
        if (tutorialModal && tutorialOverlay) {
            tutorialModal.style.display = 'block';
            tutorialOverlay.style.display = 'block';

            // Add staggered animation to cards
            const cards = document.querySelectorAll('.tutorial-card');
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';

                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 100 + (index * 100));
            });
        }
    }

    // Function to close the tutorial
    function closeTutorial() {
        if (tutorialModal && tutorialOverlay) {
            tutorialModal.style.display = 'none';
            tutorialOverlay.style.display = 'none';
        }
    }

    // Set up event listeners
    if (tutorialBtn) {
        tutorialBtn.addEventListener('click', openTutorial);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeTutorial);
    }

    if (closeTutorialBtn) {
        closeTutorialBtn.addEventListener('click', closeTutorial);
    }

    // Set up tab preview buttons
    tabPreviews.forEach(preview => {
        preview.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) {
                // Close the tutorial
                closeTutorial();

                // Navigate to the tab
                navigateToTab(tabName);
            }
        });
    });

    // Close tutorial when clicking on overlay
    if (tutorialOverlay) {
        tutorialOverlay.addEventListener('click', closeTutorial);
    }
}

// Add subtle animations to elements
function addAnimations() {
    // Add staggered fade-in animation to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
    });

    // Add staggered fade-in animation to quick access buttons
    const quickAccessButtons = document.querySelectorAll('.quick-access-btn');
    quickAccessButtons.forEach((button, index) => {
        button.style.opacity = '0';
        button.style.transform = 'translateY(20px)';
        button.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

        setTimeout(() => {
            button.style.opacity = '1';
            button.style.transform = 'translateY(0)';
        }, 300 + (index * 100));
    });
}

// Export the initialization function
window.initWelcomeTab = initWelcomeTab;
