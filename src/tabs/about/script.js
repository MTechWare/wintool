// Add any interactive functionality for the About tab here.
// For example, dynamically loading the version number.

document.addEventListener('DOMContentLoaded', async () => {
    // Signal that this tab is ready
    if (window.markTabAsReady) {
        window.markTabAsReady('about');
    }
});