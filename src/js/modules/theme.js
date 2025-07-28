import { THEMES, rainbowAnimationId, setRainbowAnimationId } from './state.js';
import { showNotification } from './notifications.js';
import { closeModal } from './modals.js';


export async function applyTheme(themeName, options = {}) {
    const theme = THEMES[themeName];
    if (!theme) return;

    // Store current theme info
    await window.electronAPI.setSetting('theme', themeName);

    // Add theme transition class for smooth changes
    if (!options.skipTransition) {
        document.documentElement.classList.add('theme-transitioning');
    }

    if (themeName === 'custom') {
        await loadCustomTheme();
    } else {
        // Apply theme variables, skipping metadata
        for (const [key, value] of Object.entries(theme)) {
            if (key.startsWith('--')) {
                document.documentElement.style.setProperty(key, value);
            }
        }

        // Update body class for theme-specific styling
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${themeName}`);

        // Auto-generate additional color variants
        generateColorVariants(theme['--primary-color']);
    }

    // Update UI elements
    updateThemeUI(theme);

    // Update theme selector dropdown
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector && themeSelector.value !== themeName) {
        themeSelector.value = themeName;
    }

    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { themeName, theme }
    }));

    // Remove transition class after animation
    if (!options.skipTransition) {
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transitioning');
        }, 300);
    }
}


export function updatePrimaryColorVariables(color) {
    generateColorVariants(color);
}

function generateColorVariants(color) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Generate multiple variants
    const darkerColor = darkenColor(color, 0.15);
    const darkestColor = darkenColor(color, 0.3);
    const lighterColor = lightenColor(color, 0.15);
    const lightestColor = lightenColor(color, 0.3);
    const mutedColor = adjustSaturation(color, -0.3);

    // Apply all variants
    document.documentElement.style.setProperty('--primary-color', color);
    document.documentElement.style.setProperty('--primary-dark', darkerColor);
    document.documentElement.style.setProperty('--primary-darker', darkestColor);
    document.documentElement.style.setProperty('--primary-light', lighterColor);
    document.documentElement.style.setProperty('--primary-lighter', lightestColor);
    document.documentElement.style.setProperty('--primary-muted', mutedColor);
    document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);

    // Generate complementary colors
    const complementary = getComplementaryColor(color);
    const analogous = getAnalogousColors(color);

    document.documentElement.style.setProperty('--primary-complementary', complementary);
    document.documentElement.style.setProperty('--primary-analogous-1', analogous[0]);
    document.documentElement.style.setProperty('--primary-analogous-2', analogous[1]);
}


function darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = Math.max(0, Math.min(255, (num >> 16) - amt));
    const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) - amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) - amt));
    return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

function lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

function adjustSaturation(hex, percent) {
    const [h, s, l] = hexToHsl(hex);
    const newS = Math.max(0, Math.min(100, s + (s * percent)));
    return hslToHex(h, newS, l);
}

function getComplementaryColor(hex) {
    const [h, s, l] = hexToHsl(hex);
    const complementaryH = (h + 180) % 360;
    return hslToHex(complementaryH, s, l);
}

function getAnalogousColors(hex) {
    const [h, s, l] = hexToHsl(hex);
    return [
        hslToHex((h + 30) % 360, s, l),
        hslToHex((h - 30 + 360) % 360, s, l)
    ];
}

function hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}


export function applyRainbowEffect(speed = 5, options = {}) {
    if (rainbowAnimationId) {
        cancelAnimationFrame(rainbowAnimationId);
    }

    const {
        saturation = 100,
        lightness = 50,
        smooth = true,
        reverse = false
    } = options;

    let hue = 0;
    const cycleDuration = speed * 1000;
    let startTime = null;
    let lastHue = 0;

    function updateRainbowColors(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsedTime = timestamp - startTime;

        let progress = (elapsedTime / cycleDuration) % 1;
        if (reverse) progress = 1 - progress;

        // Smooth easing for more natural color transitions
        if (smooth) {
            progress = 0.5 * (1 + Math.sin(2 * Math.PI * progress - Math.PI / 2));
        }

        hue = progress * 360;

        // Only update if hue changed significantly (performance optimization)
        if (Math.abs(hue - lastHue) > 1) {
            const colorHex = hslToHex(hue, saturation, lightness);
            updatePrimaryColorVariables(colorHex);
            lastHue = hue;

            // Dispatch rainbow update event
            window.dispatchEvent(new CustomEvent('rainbowUpdate', {
                detail: { hue, color: colorHex }
            }));
        }

        setRainbowAnimationId(requestAnimationFrame(updateRainbowColors));
    }

    // Add rainbow mode class for CSS targeting
    document.body.classList.add('rainbow-mode');
    setRainbowAnimationId(requestAnimationFrame(updateRainbowColors));
}

export function removeRainbowEffect() {
    if (rainbowAnimationId) {
        cancelAnimationFrame(rainbowAnimationId);
        setRainbowAnimationId(null);
    }

    // Remove rainbow mode class
    document.body.classList.remove('rainbow-mode');

    // Dispatch rainbow stop event
    window.dispatchEvent(new CustomEvent('rainbowStop'));
}


export function openThemeCreator() {
    const modal = document.getElementById('theme-creator-modal');
    if (modal) {

        const customTheme = THEMES['custom'];
        document.getElementById('theme-name-input').value = customTheme.name || 'My Custom Theme';
        document.getElementById('theme-primary-color').value = customTheme['--primary-color'] || '#ff9800';
        document.getElementById('theme-background-dark').value = customTheme['--background-dark'] || '#1c1c1e';
        document.getElementById('theme-background-light').value = customTheme['--background-light'] || '#2c2c2e';
        document.getElementById('theme-background-card').value = customTheme['--background-card'] || '#3a3a3c';
        document.getElementById('theme-border-color').value = customTheme['--border-color'] || '#444444';
        document.getElementById('theme-hover-color').value = customTheme['--hover-color'] || '#4f4f52';
        document.getElementById('theme-background-content').value = customTheme['--background-content'] || '#1c1c1e';
        modal.style.display = 'flex';
    }
}

export async function saveCustomTheme() {
    const themeName = document.getElementById('theme-name-input').value;
    const theme = {
        name: themeName,
        '--primary-color': document.getElementById('theme-primary-color').value,
        '--background-dark': document.getElementById('theme-background-dark').value,
        '--background-light': document.getElementById('theme-background-light').value,
        '--background-card': document.getElementById('theme-background-card').value,
        '--border-color': document.getElementById('theme-border-color').value,
        '--hover-color': document.getElementById('theme-hover-color').value,
        '--background-content': document.getElementById('theme-background-content').value
    };

    THEMES['custom'] = theme;
    await window.electronAPI.setSetting('customTheme', theme);
    await applyTheme('custom');
    closeModal('theme-creator-modal');
    showNotification('Custom theme saved! Restart to apply all changes.', 'success');

    if (confirm('A restart is required to fully apply the new theme. Restart now?')) {
        window.electronAPI.restartApplication();
    }

    const primaryColorPicker = document.getElementById('primary-color-picker');
    const primaryColorPreview = document.getElementById('primary-color-preview');
    if (primaryColorPicker && primaryColorPreview) {
        primaryColorPicker.value = theme['--primary-color'];
        primaryColorPreview.textContent = theme['--primary-color'];
    }
}

export async function loadCustomTheme() {
    const customTheme = await window.electronAPI.getSetting('customTheme', {});
    THEMES['custom'] = customTheme;
    if (Object.keys(customTheme).length > 0) {
        for (const [key, value] of Object.entries(customTheme)) {
            if (key !== 'name') {
                document.documentElement.style.setProperty(key, value);
            }
        }
    }
}

export function importTheme() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const theme = JSON.parse(e.target.result);
                    THEMES['custom'] = theme;
                    await window.electronAPI.setSetting('customTheme', theme);
                    await applyTheme('custom');
                    document.getElementById('theme-selector').value = 'custom';
                    showNotification('Theme imported successfully! Restart to apply all changes.', 'success');

                    if (confirm('A restart is required to fully apply the new theme. Restart now?')) {
                        window.electronAPI.restartApplication();
                    }
                } catch (error) {
                    showNotification('Error importing theme: Invalid file format', 'error');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

export function exportTheme() {
    const currentThemeName = document.getElementById('theme-selector').value;
    if (currentThemeName === 'custom') {
        const dataStr = JSON.stringify(THEMES['custom'], null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'wintool-custom-theme.json';
        link.click();
    } else {
        showNotification('Please select the custom theme to export.', 'warning');
    }
}

export function resetCustomTheme() {
    document.getElementById('theme-name-input').value = 'My Custom Theme';
    document.getElementById('theme-primary-color').value = '#ff9800';
    document.getElementById('theme-background-dark').value = '#1c1c1e';
    document.getElementById('theme-background-light').value = '#2c2c2e';
    document.getElementById('theme-background-card').value = '#3a3a3c';
    document.getElementById('theme-border-color').value = '#444444';
    document.getElementById('theme-hover-color').value = '#4f4f52';
    document.getElementById('theme-background-content').value = '#1c1c1e';
    showNotification('Custom theme colors reset. Click "Save Theme" to apply.', 'success');
}

// New utility functions for enhanced theme management

function updateThemeUI(theme) {
    const colorPicker = document.getElementById('primary-color-picker');
    const colorPreview = document.getElementById('primary-color-preview');
    if (colorPicker && colorPreview) {
        const primaryColor = theme['--primary-color'] || getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
        colorPicker.value = primaryColor.trim();
        colorPreview.textContent = primaryColor.trim();
    }
}

export function getThemeCategories() {
    const categories = {};
    Object.entries(THEMES).forEach(([key, theme]) => {
        if (key === 'custom') return;
        const category = theme.category || 'other';
        if (!categories[category]) categories[category] = [];
        categories[category].push({ key, ...theme });
    });
    return categories;
}

export function getThemePreview(themeName) {
    const theme = THEMES[themeName];
    if (!theme) return null;

    return {
        name: theme.name || themeName,
        description: theme.description || 'Custom theme',
        primaryColor: theme['--primary-color'],
        backgroundColor: theme['--background-dark'],
        cardColor: theme['--background-card']
    };
}

export function validateTheme(themeData) {
    const requiredProperties = [
        '--primary-color',
        '--background-dark',
        '--background-light',
        '--background-card',
        '--border-color',
        '--text-primary'
    ];

    const missing = requiredProperties.filter(prop => !themeData[prop]);
    return {
        valid: missing.length === 0,
        missing: missing
    };
}

export async function duplicateTheme(sourceThemeName, newName) {
    const sourceTheme = THEMES[sourceThemeName];
    if (!sourceTheme) return false;

    const newTheme = { ...sourceTheme };
    newTheme.name = newName;

    THEMES['custom'] = newTheme;
    await window.electronAPI.setSetting('customTheme', newTheme);

    showNotification(`Theme duplicated as "${newName}"`, 'success');
    return true;
}

export function generateThemeFromColor(baseColor, themeName = 'Generated Theme') {
    const [h, s, l] = hexToHsl(baseColor);

    // Generate a complete theme based on the base color
    const theme = {
        name: themeName,
        description: `Auto-generated theme from ${baseColor}`,
        category: 'generated',
        '--primary-color': baseColor,
        '--primary-dark': darkenColor(baseColor, 0.15),
        '--primary-darker': darkenColor(baseColor, 0.3),
        '--primary-rgb': hexToRgb(baseColor),
        '--background-dark': hslToHex(h, Math.max(10, s * 0.3), Math.max(5, l * 0.1)),
        '--background-light': hslToHex(h, Math.max(15, s * 0.4), Math.max(10, l * 0.15)),
        '--background-card': hslToHex(h, Math.max(20, s * 0.5), Math.max(15, l * 0.2)),
        '--border-color': hslToHex(h, Math.max(25, s * 0.6), Math.max(20, l * 0.25)),
        '--hover-color': hslToHex(h, Math.max(30, s * 0.7), Math.max(25, l * 0.3)),
        '--background-content': hslToHex(h, Math.max(15, s * 0.4), Math.max(10, l * 0.15)),
        '--text-primary': l > 50 ? '#000000' : '#ffffff',
        '--text-secondary': l > 50 ? '#666666' : '#b0b0b0',
        '--success-color': '#4caf50',
        '--error-color': '#f44336',
        '--warning-color': '#ff9800'
    };

    return theme;
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

export function createThemeFromImage(imageData) {
    // This would analyze an image and extract a color palette
    // For now, return a placeholder implementation
    return new Promise((resolve) => {
        // In a real implementation, you'd use canvas to analyze the image
        // and extract dominant colors using algorithms like k-means clustering
        resolve(generateThemeFromColor('#ff6b35', 'Image Theme'));
    });
}
