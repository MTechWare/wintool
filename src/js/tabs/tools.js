/**
 * WinTool - Tools Tab
 * Handles system tools functionality
 */

// Initialize the tools tab
function initToolsTab() {
    console.log('Initializing tools tab');
    setupToolCards();
}

// Set up tool cards with click handlers
function setupToolCards() {
    const toolCards = document.querySelectorAll('.tool-card');
    
    toolCards.forEach(card => {
        card.addEventListener('click', async () => {
            const toolId = card.dataset.tool;
            
            // Add visual feedback
            card.classList.add('tool-card-active');
            setTimeout(() => {
                card.classList.remove('tool-card-active');
            }, 300);
            
            try {
                // Launch the tool
                await window.electronAPI.launchSystemTool(toolId);
                showNotification(`Launched ${card.querySelector('.tool-name').textContent}`, { type: 'success' });
            } catch (error) {
                console.error('Error launching tool:', error);
                showNotification(`Failed to launch tool: ${error.message}`, { type: 'error' });
            }
        });
    });
}
