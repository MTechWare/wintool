// c/Users/userv/Desktop/WIN/src/js/modules/fps-counter.js

let fpsElement;
let lastFrameTime = performance.now();
let frameCount = 0;
let animationFrameId;
let isInitialized = false;

function createFpsElement() {
    if (fpsElement) return;
    fpsElement = document.createElement('div');
    fpsElement.id = 'fps-counter';
    fpsElement.innerHTML = `
        <span id="fps-value">FPS: --</span>
        <span id="mem-value">MEM: --%</span>
    `;
    document.body.appendChild(fpsElement);
}

function updateFps() {
    const now = performance.now();
    frameCount++;
    if (now >= lastFrameTime + 1000) {
        document.getElementById('fps-value').textContent = `FPS: ${frameCount}`;
        frameCount = 0;
        lastFrameTime = now;
    }
    animationFrameId = requestAnimationFrame(updateFps);
}

export function showFpsCounter() {
    if (!fpsElement) {
        createFpsElement();
    }
    fpsElement.style.display = 'flex';
    if (!animationFrameId) {
        lastFrameTime = performance.now();
        frameCount = 0;
        updateFps();
    }
    window.electronAPI.startPerformanceUpdates();
}

export function hideFpsCounter() {
    if (fpsElement) {
        fpsElement.style.display = 'none';
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    window.electronAPI.stopPerformanceUpdates();
}

export async function initFpsCounter() {
    if (isInitialized) return;

    createFpsElement(); // Create the element once
    window.electronAPI.onPerformanceUpdate(metrics => {
        if (fpsElement.style.display !== 'none') {
            document.getElementById('mem-value').textContent = `MEM: ${metrics.mem}%`;
        }
    });

    try {
        const enableDevTools = await window.electronAPI.getSetting('enableDevTools', false);
        if (enableDevTools) {
            showFpsCounter();
        } else {
            hideFpsCounter();
        }
    } catch (error) {
        console.error('Error initializing FPS counter:', error);
        hideFpsCounter();
    }
    isInitialized = true;
}
