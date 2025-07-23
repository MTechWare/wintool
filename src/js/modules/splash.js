
export function showSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        splashScreen.classList.remove('hidden');
        console.log('Splash screen shown');
    }
}


export function updateSplashProgress(message, percentage) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    if (progressFill) {
        progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }

    if (progressText) {
        progressText.textContent = message;
    }

    console.log(`Splash progress: ${percentage}% - ${message}`);
}


export function hideSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    const appContainer = document.querySelector('.app-container');

    if (splashScreen) {
        splashScreen.classList.add('hidden');

        if (appContainer) {
            appContainer.classList.add('loaded');
        }

        setTimeout(() => {
            if (splashScreen.parentNode) {
                splashScreen.parentNode.removeChild(splashScreen);
            }
        }, 1000);

        console.log('Splash screen hidden');
    }
}
