import { THEMES, rainbowAnimationId, setRainbowAnimationId } from './state.js';
import { showNotification } from './notifications.js';
import { closeModal } from './modals.js';

export async function applyTheme(themeName) {
    const theme = THEMES[themeName];
    if (!theme) return;

    if (themeName === 'custom') {
        await loadCustomTheme();
    } else {
        for (const [key, value] of Object.entries(theme)) {
            document.documentElement.style.setProperty(key, value);
        }
    }

    const colorPicker = document.getElementById('primary-color-picker');
    const colorPreview = document.getElementById('primary-color-preview');
    if (colorPicker && colorPreview) {
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue(
            '--primary-color'
        );
        colorPicker.value = primaryColor.trim();
        colorPreview.textContent = primaryColor.trim();
    }
}

export function updatePrimaryColorVariables(color) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const darkerColor = darkenColor(color, 0.15);
    const darkestColor = darkenColor(color, 0.3);

    document.documentElement.style.setProperty('--primary-color', color);
    document.documentElement.style.setProperty('--primary-dark', darkerColor);
    document.documentElement.style.setProperty('--primary-darker', darkestColor);
    document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
}

function darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = (num >> 16) - amt;
    const G = ((num >> 8) & 0x00ff) - amt;
    const B = (num & 0x0000ff) - amt;
    return (
        '#' +
        (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        )
            .toString(16)
            .slice(1)
    );
}

function hslToHex(h, s, l) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
            .toString(16)
            .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export function applyRainbowEffect(speed = 5) {
    if (rainbowAnimationId) {
        cancelAnimationFrame(rainbowAnimationId);
    }

    let hue = 0;
    const cycleDuration = speed * 1000;
    let startTime = null;

    function updateRainbowColors(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsedTime = timestamp - startTime;

        hue = ((elapsedTime / cycleDuration) * 360) % 360;

        const colorHex = hslToHex(hue, 100, 50);
        updatePrimaryColorVariables(colorHex);

        setRainbowAnimationId(requestAnimationFrame(updateRainbowColors));
    }

    setRainbowAnimationId(requestAnimationFrame(updateRainbowColors));
}

export function removeRainbowEffect() {
    if (rainbowAnimationId) {
        cancelAnimationFrame(rainbowAnimationId);
        setRainbowAnimationId(null);
    }
}

export function openThemeCreator() {
    const modal = document.getElementById('theme-creator-modal');
    if (modal) {
        const customTheme = THEMES['custom'];

        // Load existing custom theme or defaults
        const themeData = {
            name: customTheme.name || 'My Custom Theme',
            '--primary-color': customTheme['--primary-color'] || '#ff9800',
            '--background-dark': customTheme['--background-dark'] || '#1c1c1e',
            '--background-light': customTheme['--background-light'] || '#2c2c2e',
            '--background-card': customTheme['--background-card'] || '#3a3a3c',
            '--border-color': customTheme['--border-color'] || '#444444',
            '--hover-color': customTheme['--hover-color'] || '#4f4f52',
            '--background-content': customTheme['--background-content'] || '#1c1c1e'
        };

        // Set form values
        document.getElementById('theme-name-input').value = themeData.name;

        // Set color inputs and text inputs
        Object.keys(themeData).forEach(key => {
            if (key !== 'name') {
                const colorInput = document.getElementById(`theme-${key.replace('--', '').replace(/-/g, '-')}`);
                const textInput = document.getElementById(`theme-${key.replace('--', '').replace(/-/g, '-')}-text`);

                if (colorInput) colorInput.value = themeData[key];
                if (textInput) textInput.value = themeData[key];
            }
        });

        // Initialize live preview
        initThemeCreatorListeners();
        updateThemePreview();

        modal.style.display = 'flex';
    }
}

// Initialize theme creator event listeners
function initThemeCreatorListeners() {
    const colorInputs = [
        'theme-primary-color',
        'theme-background-dark',
        'theme-background-light',
        'theme-background-card',
        'theme-border-color',
        'theme-hover-color',
        'theme-background-content'
    ];

    colorInputs.forEach(inputId => {
        const colorInput = document.getElementById(inputId);
        const textInput = document.getElementById(`${inputId}-text`);

        if (colorInput && textInput) {
            // Sync color picker with text input
            colorInput.addEventListener('input', (e) => {
                textInput.value = e.target.value;
                updateThemePreview();
            });

            // Sync text input with color picker
            textInput.addEventListener('input', (e) => {
                const color = e.target.value;
                if (isValidHexColor(color)) {
                    colorInput.value = color;
                    updateThemePreview();
                }
            });
        }
    });
}

// Update live preview
function updateThemePreview() {
    const previewContainer = document.getElementById('theme-preview-container');
    if (!previewContainer) return;

    const themeData = {
        '--primary-color': document.getElementById('theme-primary-color')?.value || '#ff9800',
        '--background-dark': document.getElementById('theme-background-dark')?.value || '#1c1c1e',
        '--background-light': document.getElementById('theme-background-light')?.value || '#2c2c2e',
        '--background-card': document.getElementById('theme-background-card')?.value || '#3a3a3c',
        '--border-color': document.getElementById('theme-border-color')?.value || '#444444',
        '--hover-color': document.getElementById('theme-hover-color')?.value || '#4f4f52',
        '--background-content': document.getElementById('theme-background-content')?.value || '#1c1c1e'
    };

    // Calculate derived colors
    const primaryRgb = hexToRgb(themeData['--primary-color']);
    themeData['--primary-rgb'] = `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`;
    themeData['--primary-dark'] = darkenColor(themeData['--primary-color'], 0.15);
    themeData['--primary-darker'] = darkenColor(themeData['--primary-color'], 0.3);

    // Apply theme to preview container
    Object.entries(themeData).forEach(([key, value]) => {
        previewContainer.style.setProperty(key, value);
    });
}

// Validate hex color
function isValidHexColor(hex) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

// Convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 152, b: 0 };
}

export async function saveCustomTheme() {
    const themeName = document.getElementById('theme-name-input').value;
    const primaryColor = document.getElementById('theme-primary-color').value;

    const theme = {
        name: themeName,
        description: 'Custom user-created theme',
        icon: 'fas fa-paint-brush',
        category: 'custom',
        '--primary-color': primaryColor,
        '--primary-dark': darkenColor(primaryColor, 0.15),
        '--primary-darker': darkenColor(primaryColor, 0.3),
        '--primary-rgb': (() => {
            const rgb = hexToRgb(primaryColor);
            return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
        })(),
        '--background-dark': document.getElementById('theme-background-dark').value,
        '--background-light': document.getElementById('theme-background-light').value,
        '--background-card': document.getElementById('theme-background-card').value,
        '--border-color': document.getElementById('theme-border-color').value,
        '--hover-color': document.getElementById('theme-hover-color').value,
        '--background-content': document.getElementById('theme-background-content').value,
    };

    THEMES['custom'] = theme;
    await window.electronAPI.setSetting('customTheme', theme);
    await applyTheme('custom');

    // Update theme selector
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
        themeSelector.value = 'custom';
    }

    // Update theme presets display
    if (typeof window.generateThemePresets === 'function') {
        window.generateThemePresets();
    }

    closeModal('theme-creator-modal');
    showNotification('Custom theme saved successfully!', 'success');

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
    input.onchange = e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async e => {
                try {
                    const theme = JSON.parse(e.target.result);
                    THEMES['custom'] = theme;
                    await window.electronAPI.setSetting('customTheme', theme);
                    await applyTheme('custom');
                    document.getElementById('theme-selector').value = 'custom';
                    showNotification(
                        'Theme imported successfully! Restart to apply all changes.',
                        'success'
                    );

                    if (
                        confirm('A restart is required to fully apply the new theme. Restart now?')
                    ) {
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
    const defaultValues = {
        'theme-name-input': 'My Custom Theme',
        'theme-primary-color': '#ff9800',
        'theme-background-dark': '#1c1c1e',
        'theme-background-light': '#2c2c2e',
        'theme-background-card': '#3a3a3c',
        'theme-border-color': '#444444',
        'theme-hover-color': '#4f4f52',
        'theme-background-content': '#1c1c1e'
    };

    Object.entries(defaultValues).forEach(([id, value]) => {
        const element = document.getElementById(id);
        const textElement = document.getElementById(`${id}-text`);

        if (element) element.value = value;
        if (textElement) textElement.value = value;
    });

    // Update live preview
    updateThemePreview();
    showNotification('Custom theme colors reset. Click "Save Theme" to apply.', 'success');
}
