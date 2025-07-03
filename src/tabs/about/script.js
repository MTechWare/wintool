// Add any interactive functionality for the About tab here.
// For example, dynamically loading the version number.

document.addEventListener('DOMContentLoaded', () => {
    // You can fetch the app version from package.json or a config file
    // and display it in the 'wintool-version' span.

    // Signal that this tab is ready
    if (window.markTabAsReady && typeof tabId !== 'undefined') {
        window.markTabAsReady(tabId);
    }
});