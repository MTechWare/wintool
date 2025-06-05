# WinTool - Tab System

This directory contains folder-based tabs for WinTool. Each tab is a self-contained module with its own HTML, CSS, JavaScript, and configuration.

## How to Add a New Tab

1. **Create a new folder** in the `src/tabs/` directory with your tab name (e.g., `my-awesome-tab`)

2. **Create the required files** in your tab folder:
   - `config.json` - Tab metadata and configuration
   - `index.html` - Tab content (HTML)
   - `styles.css` - Tab-specific styles (optional)
   - `script.js` - Tab-specific JavaScript (optional)

3. **Restart the application** - The tab will be automatically discovered and loaded

## File Structure

```
src/tabs/
├── README.md (this file)
├── example-tab/
│   ├── config.json
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── system-info/
│   ├── config.json
│   ├── index.html
│   ├── styles.css
│   └── script.js
└── your-new-tab/
    ├── config.json
    ├── index.html
    ├── styles.css (optional)
    └── script.js (optional)
```

## File Descriptions

### config.json
Contains tab metadata. Example:
```json
{
    "name": "My Tab",
    "icon": "fas fa-star",
    "description": "Description of what this tab does",
    "version": "1.0.0",
    "author": "Your Name"
}
```

**Required fields:**
- `name` - Display name for the tab
- `icon` - FontAwesome icon class (e.g., "fas fa-star")

**Optional fields:**
- `description` - Brief description
- `version` - Tab version
- `author` - Tab author

### index.html
Contains the tab's HTML content. This should be a fragment (no `<html>`, `<head>`, or `<body>` tags).

**Example structure:**
```html
<div class="tab-header">
    <h1><i class="fas fa-star"></i> My Tab</h1>
    <p>Description of your tab</p>
</div>

<div class="my-tab-content">
    <!-- Your content here -->
</div>
```

### styles.css (optional)
Contains tab-specific CSS. Styles are automatically scoped to your tab to prevent conflicts.

**Tips:**
- Use CSS custom properties (variables) defined in the main stylesheet
- Styles will be prefixed with your tab's scope automatically
- You can reference global variables like `var(--primary-color)`

### script.js (optional)
Contains tab-specific JavaScript. Runs in a limited scope for security.

**Available in scope:**
- `tabId` - Your tab's unique ID
- `tabContainer` - Your tab's DOM container
- `console` - Console for logging

**Example:**
```javascript
console.log('My tab loaded!');

// Wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyTab);
} else {
    initMyTab();
}

function initMyTab() {
    const container = document.querySelector('[data-tab="folder-my-tab"]');
    // Your initialization code here
}
```

## Best Practices

1. **Use unique class names** to avoid conflicts with other tabs
2. **Scope your JavaScript** to your tab container
3. **Handle loading states** - your tab might load before the DOM is ready
4. **Use semantic HTML** for accessibility
5. **Follow the existing design patterns** for consistency
6. **Test your tab** thoroughly before sharing

## Available Resources

### CSS Variables
You can use these predefined CSS variables:
- `--primary-color` - Main theme color
- `--primary-dark` - Darker theme color
- `--background-dark` - Dark background
- `--background-light` - Light background
- `--background-card` - Card background
- `--text-primary` - Primary text color
- `--text-secondary` - Secondary text color
- `--border-color` - Border color
- `--hover-color` - Hover state color
- `--success-color` - Success color
- `--error-color` - Error color

### FontAwesome Icons
The app includes FontAwesome 6.0.0. Use any icon with classes like:
- `fas fa-star` (solid)
- `far fa-star` (regular)
- `fab fa-github` (brands)

### Electron APIs
If running in Electron, you have access to:
- `window.electronAPI.getSystemInfo()` - Get system information
- `window.electronAPI.getSetting(key, default)` - Get app setting
- `window.electronAPI.setSetting(key, value)` - Set app setting

## Examples

Check out the included example tabs:
- `example-tab/` - Demonstrates basic tab structure and features
- `system-info/` - Shows how to use Electron APIs and real-time updates

## Troubleshooting

**Tab not appearing?**
- Check that your folder is in `src/tabs/`
- Ensure `config.json` is valid JSON
- Restart the application
- Check the console for errors

**Styles not working?**
- Make sure your CSS file is named `styles.css`
- Check for syntax errors in your CSS
- Remember that styles are automatically scoped

**JavaScript not running?**
- Ensure your file is named `script.js`
- Check the console for JavaScript errors
- Make sure you're waiting for DOM ready state

**Need help?**
- Look at the example tabs for reference
- Check the browser console for error messages
- Ensure all file names are correct and lowercase
