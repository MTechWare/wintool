// Theme Preview Component
export class ThemePreview {
    constructor(container, theme, options = {}) {
        this.container = container;
        this.theme = theme;
        this.options = {
            size: 'medium', // small, medium, large
            interactive: true,
            showName: true,
            showDescription: false,
            ...options
        };
        this.render();
    }

    render() {
        const preview = document.createElement('div');
        preview.className = `theme-preview theme-preview-${this.options.size}`;
        
        if (this.options.interactive) {
            preview.classList.add('theme-preview-interactive');
            preview.addEventListener('click', () => this.onSelect());
        }

        // Create preview elements
        const previewContent = `
            <div class="theme-preview-visual" style="
                background: ${this.theme['--background-dark']};
                border: 1px solid ${this.theme['--border-color']};
            ">
                <div class="theme-preview-header" style="
                    background: ${this.theme['--background-card']};
                    border-bottom: 1px solid ${this.theme['--border-color']};
                ">
                    <div class="theme-preview-dot" style="background: ${this.theme['--primary-color']};"></div>
                    <div class="theme-preview-line" style="background: ${this.theme['--text-primary']};"></div>
                </div>
                <div class="theme-preview-body" style="background: ${this.theme['--background-light']};">
                    <div class="theme-preview-card" style="
                        background: ${this.theme['--background-card']};
                        border: 1px solid ${this.theme['--border-color']};
                    ">
                        <div class="theme-preview-accent" style="background: ${this.theme['--primary-color']};"></div>
                    </div>
                </div>
            </div>
            ${this.options.showName ? `<div class="theme-preview-name">${this.theme.name || 'Custom Theme'}</div>` : ''}
            ${this.options.showDescription ? `<div class="theme-preview-description">${this.theme.description || ''}</div>` : ''}
        `;

        preview.innerHTML = previewContent;
        this.container.appendChild(preview);
        this.element = preview;
    }

    onSelect() {
        if (this.options.onSelect) {
            this.options.onSelect(this.theme);
        }
    }

    setSelected(selected) {
        if (selected) {
            this.element.classList.add('theme-preview-selected');
        } else {
            this.element.classList.remove('theme-preview-selected');
        }
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// CSS for theme previews (to be added to styles.css)
export const THEME_PREVIEW_CSS = `
.theme-preview {
    cursor: pointer;
    transition: all 0.3s ease;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
}

.theme-preview-interactive:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.theme-preview-selected {
    box-shadow: 0 0 0 2px var(--primary-color);
}

.theme-preview-visual {
    border-radius: 6px;
    overflow: hidden;
    position: relative;
}

.theme-preview-small .theme-preview-visual {
    width: 60px;
    height: 40px;
}

.theme-preview-medium .theme-preview-visual {
    width: 120px;
    height: 80px;
}

.theme-preview-large .theme-preview-visual {
    width: 180px;
    height: 120px;
}

.theme-preview-header {
    height: 25%;
    display: flex;
    align-items: center;
    padding: 0 8px;
    gap: 6px;
}

.theme-preview-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
}

.theme-preview-line {
    height: 2px;
    flex: 1;
    border-radius: 1px;
    opacity: 0.7;
}

.theme-preview-body {
    height: 75%;
    padding: 6px;
}

.theme-preview-card {
    width: 100%;
    height: 100%;
    border-radius: 4px;
    position: relative;
    overflow: hidden;
}

.theme-preview-accent {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
}

.theme-preview-name {
    margin-top: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-primary);
    text-align: center;
}

.theme-preview-description {
    margin-top: 4px;
    font-size: 0.8rem;
    color: var(--text-secondary);
    text-align: center;
    line-height: 1.3;
}

.theme-preview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 16px;
    margin: 20px 0;
}

.theme-history-container {
    margin: 20px 0;
}

.theme-history-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 12px;
}

.theme-history-grid {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 8px 0;
}

.theme-history-item {
    flex-shrink: 0;
}
`;

export function createThemeGrid(container, themes, options = {}) {
    // Clear the container first to prevent duplicates
    container.innerHTML = '';
    
    // Use the container directly as the grid instead of creating a nested div
    container.className = 'theme-preview-grid';
    
    const previews = [];
    
    Object.entries(themes).forEach(([key, theme]) => {
        if (key === 'custom' && Object.keys(theme).length === 0) return;
        
        // Create a simple div that will be the grid item
        const gridItem = document.createElement('div');
        gridItem.className = 'theme-grid-item';
        
        const preview = new ThemePreview(gridItem, theme, {
            ...options,
            onSelect: (selectedTheme) => {
                // Deselect all others
                previews.forEach(p => p.setSelected(false));
                // Select this one
                preview.setSelected(true);
                // Call callback
                if (options.onThemeSelect) {
                    options.onThemeSelect(key, selectedTheme);
                }
            }
        });
        
        previews.push(preview);
        container.appendChild(gridItem);
    });
    
    return { grid: container, previews };
}