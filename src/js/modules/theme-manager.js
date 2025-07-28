// Advanced Theme Management System
import { THEMES } from './state.js';
import { applyTheme, generateThemeFromColor } from './theme.js';
import { showNotification } from './notifications.js';

export class ThemeManager {
    constructor() {
        this.themeHistory = [];
        this.maxHistorySize = 10;
        this.autoSaveEnabled = true;
        this.themePresets = new Map();
        this.init();
    }

    async init() {
        // Load theme history from storage
        this.themeHistory = await window.electronAPI.getSetting('themeHistory', []);
        
        // Load custom presets
        const savedPresets = await window.electronAPI.getSetting('themePresets', {});
        Object.entries(savedPresets).forEach(([name, theme]) => {
            this.themePresets.set(name, theme);
        });

        // Set up auto-save if enabled
        if (this.autoSaveEnabled) {
            this.setupAutoSave();
        }
    }

    async addToHistory(themeName) {
        const theme = THEMES[themeName];
        if (!theme) return;

        const historyEntry = {
            name: themeName,
            displayName: theme.name || themeName,
            timestamp: Date.now(),
            preview: {
                primary: theme['--primary-color'],
                background: theme['--background-dark']
            }
        };

        // Remove if already exists
        this.themeHistory = this.themeHistory.filter(entry => entry.name !== themeName);
        
        // Add to beginning
        this.themeHistory.unshift(historyEntry);
        
        // Limit size
        if (this.themeHistory.length > this.maxHistorySize) {
            this.themeHistory = this.themeHistory.slice(0, this.maxHistorySize);
        }

        // Save to storage
        await window.electronAPI.setSetting('themeHistory', this.themeHistory);
    }

    getThemeHistory() {
        return this.themeHistory;
    }

    async clearHistory() {
        this.themeHistory = [];
        await window.electronAPI.setSetting('themeHistory', []);
        showNotification('Theme history cleared', 'success');
    }

    async savePreset(name, theme) {
        this.themePresets.set(name, theme);
        
        const presetsObj = Object.fromEntries(this.themePresets);
        await window.electronAPI.setSetting('themePresets', presetsObj);
        
        showNotification(`Theme preset "${name}" saved`, 'success');
    }

    async loadPreset(name) {
        const theme = this.themePresets.get(name);
        if (!theme) {
            showNotification(`Preset "${name}" not found`, 'error');
            return false;
        }

        THEMES['custom'] = theme;
        await applyTheme('custom');
        await this.addToHistory('custom');
        
        return true;
    }

    getPresets() {
        return Array.from(this.themePresets.entries()).map(([name, theme]) => ({
            name,
            displayName: theme.name || name,
            preview: {
                primary: theme['--primary-color'],
                background: theme['--background-dark']
            }
        }));
    }

    async deletePreset(name) {
        if (this.themePresets.delete(name)) {
            const presetsObj = Object.fromEntries(this.themePresets);
            await window.electronAPI.setSetting('themePresets', presetsObj);
            showNotification(`Preset "${name}" deleted`, 'success');
            return true;
        }
        return false;
    }

    setupAutoSave() {
        // Auto-save current theme every 30 seconds if modified
        setInterval(async () => {
            const currentTheme = await window.electronAPI.getSetting('theme', 'classic-dark');
            if (currentTheme === 'custom') {
                const customTheme = THEMES['custom'];
                if (customTheme && Object.keys(customTheme).length > 0) {
                    await this.savePreset('auto-save', customTheme);
                }
            }
        }, 30000);
    }

    async generateRandomTheme() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = 60 + Math.floor(Math.random() * 40); // 60-100%
        const lightness = 45 + Math.floor(Math.random() * 20);  // 45-65%
        
        const baseColor = this.hslToHex(hue, saturation, lightness);
        const theme = generateThemeFromColor(baseColor, 'Random Theme');
        
        THEMES['custom'] = theme;
        await applyTheme('custom');
        await this.addToHistory('custom');
        
        showNotification('Random theme generated!', 'success');
        return theme;
    }

    async generateComplementaryTheme(baseThemeName) {
        const baseTheme = THEMES[baseThemeName];
        if (!baseTheme) return null;

        const basePrimary = baseTheme['--primary-color'];
        const [h, s, l] = this.hexToHsl(basePrimary);
        const complementaryH = (h + 180) % 360;
        const complementaryColor = this.hslToHex(complementaryH, s, l);
        
        const theme = generateThemeFromColor(complementaryColor, `Complementary ${baseTheme.name || baseThemeName}`);
        
        THEMES['custom'] = theme;
        await applyTheme('custom');
        await this.addToHistory('custom');
        
        showNotification('Complementary theme generated!', 'success');
        return theme;
    }

    async exportThemeCollection() {
        const collection = {
            themes: Object.fromEntries(
                Object.entries(THEMES).filter(([key]) => key !== 'custom')
            ),
            presets: Object.fromEntries(this.themePresets),
            history: this.themeHistory,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(collection, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `wintool-theme-collection-${Date.now()}.json`;
        link.click();

        showNotification('Theme collection exported!', 'success');
    }

    async importThemeCollection(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const collection = JSON.parse(e.target.result);
                    
                    if (collection.presets) {
                        Object.entries(collection.presets).forEach(([name, theme]) => {
                            this.themePresets.set(name, theme);
                        });
                        
                        const presetsObj = Object.fromEntries(this.themePresets);
                        await window.electronAPI.setSetting('themePresets', presetsObj);
                    }

                    showNotification(`Imported ${Object.keys(collection.presets || {}).length} theme presets`, 'success');
                    resolve(collection);
                } catch (error) {
                    showNotification('Error importing theme collection: Invalid file format', 'error');
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }

    // Utility methods
    hexToHsl(hex) {
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

    hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }
}

// Create global instance
export const themeManager = new ThemeManager();

// Export utility functions for backward compatibility
export const addToThemeHistory = (themeName) => themeManager.addToHistory(themeName);
export const getThemeHistory = () => themeManager.getThemeHistory();
export const generateRandomTheme = () => themeManager.generateRandomTheme();