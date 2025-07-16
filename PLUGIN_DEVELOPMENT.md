# <div align="center">🔌 WinTool Plugin Development Guide</div>

<div align="center">

**Welcome, developer!**

This guide will walk you through creating your own plugins to extend the functionality of WinTool. The plugin system is designed to be simple yet powerful, allowing you to build rich system utilities using standard web technologies.

</div>

---

## 📋 Table of Contents

- [🛠️ Plugin CLI Tool](#️-plugin-cli-tool)
  - [Installation](#installation)
  - [Creating Plugins](#creating-plugins)
  - [Validation and Testing](#validation-and-testing)
  - [Building and Distribution](#building-and-distribution)
- [🚀 Getting Started](#-getting-started)
  - [Using the Plugin CLI (Recommended)](#using-the-plugin-cli-recommended)
  - [Using the Plugin Template](#using-the-plugin-template)
  - [Manual Setup](#manual-setup)
- [🏗️ Plugin Anatomy](#️-plugin-anatomy)
  - [Plugin Structure](#plugin-structure)
  - [The Manifest (`plugin.json`)](#the-manifest-pluginjson)
- [🌉 The Plugin API Reference](#-the-plugin-api-reference)
  - [Frontend API (`window.wintoolAPI`)](#frontend-api-windowwintoolapi)
  - [Backend API (`api` object)](#backend-api-api-object)
- [🔒 Enhanced Security Model](#-enhanced-security-model)
  - [Plugin Sandboxing](#plugin-sandboxing)
  - [Permission System](#permission-system)
  - [Security Policies](#security-policies)
  - [Resource Limits](#resource-limits)
- [🎨 UI Component Guide](#-ui-component-guide)
- [✅ Development Best Practices](#-development-best-practices)
- [📦 Distributing Your Plugin](#-distributing-your-plugin)
- [📦 Backend Dependency Management (npm)](#-backend-dependency-management-npm)
  - [Using `package.json`](#using-packagejson)
  - [Loading Dependencies in `backend.js`](#loading-dependencies-in-backendjs)

---

## ⚙️ Enabling Developer Mode

Before you begin developing or testing plugins, it is highly recommended that you enable Developer Mode. This mode provides access to several tools that are invaluable for debugging and performance monitoring.

**Developer tools include:**
-   **In-App Log Viewer**: A separate window that displays real-time `console.log` messages from both the main and renderer processes.
-   **Performance Overlay**: A small overlay in the bottom-right corner of the application that shows real-time FPS, CPU, and memory usage.

**How to Enable:**
1.  Open WinTool and click the **Settings** button in the sidebar.
2.  Navigate to the **Application** settings panel.
3.  Check the box for **Enable Developer Tools**.
4.  Save your settings. A restart may be required for all developer features to become active.

---

## 🛠️ Plugin CLI Tool

WinTool now includes a powerful command-line tool for plugin development that streamlines the entire development workflow from creation to distribution.

> **🔘 Important:** For detailed information about how buttons work in plugins, see [PLUGIN_BUTTON_GUIDE.md](PLUGIN_BUTTON_GUIDE.md)

### Installation

#### Global Installation (Recommended)

```bash
cd cli
npm install -g .
```

Or use the PowerShell installer:

```powershell
.\cli\install.ps1
```

After installation, you can use the CLI from anywhere:

```bash
wintool-plugin-cli --help
```

### Creating Plugins

> **🔘 Critical:** Buttons in WinTool plugins require specific patterns to work. See [PLUGIN_BUTTON_GUIDE.md](PLUGIN_BUTTON_GUIDE.md) for complete button implementation details.

The CLI supports three plugin types:

#### Basic Plugin
```bash
wintool-plugin-cli create my-plugin --type=basic
```
Creates a frontend-only plugin with HTML, CSS, and JavaScript.

#### Advanced Plugin
```bash
wintool-plugin-cli create my-plugin --type=advanced --author="Your Name"
```
Creates a plugin with backend support and Node.js integration.

#### Minimal Plugin
```bash
wintool-plugin-cli create my-plugin --type=minimal
```
Creates a bare minimum plugin structure.

#### Additional Options
- `--author=<name>`: Set plugin author
- `--description=<desc>`: Set plugin description
- `--version=<version>`: Set plugin version
- `--icon=<icon>`: Set Font Awesome icon class
- `--dev`: Create in development directory

### Validation and Testing

#### Validate Plugin Structure
```bash
wintool-plugin-cli validate ./my-plugin
```
Checks file structure, manifest format, and code quality.

#### Security Scan
```bash
wintool-plugin-cli security ./my-plugin
```
Performs comprehensive security analysis including:
- Dangerous code pattern detection
- External resource scanning
- Dependency analysis
- File permission checks

#### Run Tests
```bash
wintool-plugin-cli test ./my-plugin
```
Executes automated tests for validation, security, and functionality.

### Building and Distribution

#### Build Plugin Package
```bash
wintool-plugin-cli build ./my-plugin
```
Creates a ZIP package ready for distribution with integrity hash generation.

#### List Installed Plugins
```bash
wintool-plugin-cli list
```
Shows all installed plugins with metadata and validation status.

---

## 🚀 Getting Started

### Using the Plugin CLI (Recommended)

> **⚡ Important:** The CLI now generates plugins with working buttons out of the box! All generated code follows the correct patterns for WinTool's tab system.

The fastest way to start developing is with the CLI tool:

```bash
# Create a new plugin
wintool-plugin-cli create my-awesome-plugin --type=advanced --author="Your Name"

# Navigate to plugin directory
cd my-awesome-plugin

# Validate your plugin
wintool-plugin-cli validate

# Test your plugin
wintool-plugin-cli test

# Build for distribution
wintool-plugin-cli build
```

### Using the Plugin Template

The easiest way to start is by using the official plugin template.

1.  **Locate the Template**: In the WinTool source code, navigate to `AppData\Local\MTechTool\Plugins\`.
2.  **Copy and Rename**: Copy the `template` directory and paste it into the same `AppData\Local\MTechTool\Plugins\` directory. Rename the copied folder to your plugin's name (e.g., `my-cool-plugin`).
3.  **Customize the Manifest**: Open `config.json` inside your new plugin folder and edit the `name`, `description`, `author`, and `icon` fields.
4.  **Start Coding**: Open `index.html`, `script.js`, and `styles.css` to begin building your plugin. The template provides a solid foundation and working examples.
5.  **Run WinTool**: The application will automatically detect and load your new plugin.

### Manual Setup

If you prefer to start from scratch:

1.  **Create a Folder**: Create a new folder for your plugin inside `AppData\Local\MTechTool\Plugins\`.
2.  **Create Core Files**: Inside the new folder, create `config.json`, `index.html`, `script.js`, and `styles.css`.
3.  **Populate Files**: Add the basic content to each file.
4.  **Run WinTool**: The application will load your plugin.

---

## 🏗️ Plugin Anatomy

> **🔧 Key Insight:** WinTool plugins work like tabs, not standalone web pages. They must use container-scoped element selection and follow specific initialization patterns.

### Plugin Structure

Every plugin is a directory inside `AppData\Local\MTechTool\Plugins\` and must contain these core files:

```
/AppData\Local\MTechTool\Plugins\
└── my-cool-plugin/
    ├── plugin.json     // (Required) Manifest file with metadata.
    ├── index.html      // (Required) The UI of the plugin.
    ├── script.js       // (Required) The logic for the UI.
    ├── styles.css      // (Optional) The styling for the UI.
    ├── backend.js      // (Optional) The Node.js backend logic.
    └── package.json    // (Optional) For backend dependencies.
```

### The Manifest: `plugin.json`

This file tells WinTool how to load your plugin.

```json
{
  "name": "My Cool Plugin",
  "icon": "fas fa-star",
  "backend": "backend.js",
  "description": "A brief description of what this plugin does.",
  "version": "1.0.0",
  "author": "Your Name"
}
```

**Manifest Fields:**

*   `name` (string, required): The human-readable name of your plugin, which will appear in the sidebar.
*   `icon` (string, required): The [Font Awesome](https://fontawesome.com/v5/search?m=free) icon class (e.g., `"fas fa-cogs"`).
*   `backend` (string, optional): The path to the plugin's backend script. If provided, WinTool will load this script in the main process.
*   `description` (string, optional): A brief summary of your plugin's functionality.
*   `version` (string, optional): The version of your plugin (recommended: semantic versioning).
*   `author` (string, optional): Your name or username.
*   `permissions` (array, optional): List of permissions required by your plugin (see Security Model).
*   `dependencies` (object, optional): External dependencies required by your plugin.

---

## 🌉 The Plugin API Reference

> **🔘 Button Implementation:** Before diving into the API, ensure your buttons work correctly. See [PLUGIN_BUTTON_GUIDE.md](PLUGIN_BUTTON_GUIDE.md) for essential button patterns.

WinTool provides a rich, secure API to plugins. The API is split into two parts: a **Frontend API** available in your `script.js`, and a **Backend API** available in your `backend.js`.

### Frontend API (`window.wintoolAPI`)

This object is exposed globally in your plugin's renderer process (`script.js`). It is the primary way for your UI to interact with the WinTool application and its secure main process. All methods return a `Promise`.

---

#### **`invoke(pluginId, handlerName, ...args)`**
The most important frontend function. It calls a function (`handler`) that you have registered in your plugin's `backend.js`.

-   **`pluginId`** (string): Your plugin's folder name.
-   **`handlerName`** (string): The name of the handler to call.
-   **`...args`**: Any arguments to pass to the backend handler.
-   **Returns**: A `Promise` that resolves with the value returned by the backend handler.

```javascript
// In script.js
const result = await window.wintoolAPI.invoke('my-plugin', 'my-handler', 'arg1', 2);
console.log(result); // Logs the value returned from the backend.
```

---

#### **`getSystemInfo(type)`**
Fetches a specific category of system information.

-   **`type`** (string): The type of information to get (e.g., `'cpu'`, `'mem'`, `'osInfo'`).
-   **Returns**: A `Promise` that resolves with the requested system information object.

```javascript
const cpuInfo = await window.wintoolAPI.getSystemInfo('cpu');
console.log(`CPU Brand: ${cpuInfo.brand}`);
```

---

#### **`runPluginScript(pluginId, scriptPath)`**
Securely executes a PowerShell script that is bundled with your plugin.

-   **`pluginId`** (string): Your plugin's folder name.
-   **`scriptPath`** (string): The relative path to the script inside your plugin's folder.
-   **Returns**: A `Promise` that resolves with the script's standard output.

```javascript
const output = await window.wintoolAPI.runPluginScript('my-plugin', 'scripts/my-script.ps1');
console.log(output);
```

---

#### **`showNotification({ title, body, type })`**
Displays a native-style notification.

-   **`options`** (object):
    -   `title` (string): The notification title.
    -   `body` (string): The main content of the notification.
    -   `type` (string, optional): `'info'`, `'success'`, `'warning'`, or `'error'`. Defaults to `'info'`.

```javascript
window.wintoolAPI.showNotification({
  title: 'Success!',
  body: 'The operation completed successfully.',
  type: 'success'
});
```

---

#### **`storage.get(pluginId, key)`**
Retrieves a value from your plugin's persistent, namespaced storage.

-   **`pluginId`** (string): Your plugin's folder name.
-   **`key`** (string): The key of the data to retrieve.
-   **Returns**: A `Promise` resolving to the stored value, or `null` if not found.

```javascript
const mySetting = await window.wintoolAPI.storage.get('my-plugin', 'user-preference');
```

---

#### **`storage.set(pluginId, key, value)`**
Saves a value to your plugin's persistent, namespaced storage.

-   **`pluginId`** (string): Your plugin's folder name.
-   **`key`** (string): The key to save the data under.
-   **`value`** (any): The value to store.
-   **Returns**: A `Promise` that resolves when the operation is complete.

```javascript
await window.wintoolAPI.storage.set('my-plugin', 'user-preference', { theme: 'dark' });
```

---

#### **`dialog.showOpenDialog(options)`**
Shows a native file open dialog.

-   **`options`** (object): Electron `showOpenDialog` options.
-   **Returns**: A `Promise` resolving to `{ canceled, file }`. `file` is `{ path, content }`.

```javascript
const result = await window.wintoolAPI.dialog.showOpenDialog({ title: 'Open My Data File' });
if (!result.canceled) {
  console.log(result.file.content);
}
```

---

#### **`dialog.showSaveDialog(options, content)`**
Shows a native file save dialog.

-   **`options`** (object): Electron `showSaveDialog` options.
-   **`content`** (string): The string content to write to the file if saved.
-   **Returns**: A `Promise` resolving to `{ canceled, path }`.

```javascript
const result = await window.wintoolAPI.dialog.showSaveDialog({ title: 'Save Report' }, 'My report data');
if (!result.canceled) {
  console.log(`File saved to ${result.path}`);
}
```

---

#### **`tabs.on(eventName, callback)`** / **`tabs.off(eventName, callback)`**
Lets you listen to events happening in the application, such as tab switching.

-   **`eventName`** (string): The name of the event (e.g., `'tab-switched'`).
-   **`callback`** (function): The function to execute when the event occurs.

```javascript
function handleTabSwitch(event) {
  console.log(`Switched to tab: ${event.detail.newTabId}`);
}
// Add listener
window.wintoolAPI.tabs.on('tab-switched', handleTabSwitch);
// Remove listener
window.wintoolAPI.tabs.off('tab-switched', handleTabSwitch);
```

### Backend API (`api` object)

If your plugin includes a `backend.js` file, it must export an `initialize` function. This function receives a secure `api` object with methods for interacting with the system and registering handlers.

```javascript
// my-plugin/backend.js
module.exports = {
  initialize: (api) => {
    // Use the api object here
  }
};
```

---

#### **`registerHandler(name, func)`**
Registers a function that can be called from the frontend using `wintoolAPI.invoke()`.

-   **`name`** (string): The name of the handler.
-   **`func`** (function): The function to execute. Can be `async`.

```javascript
// In backend.js
api.registerHandler('get-data', async (someId) => {
  // do something with someId
  return { message: 'Data retrieved!' };
});
```

---

#### **`require(moduleName)`**
Loads a dependency from your plugin's local `node_modules` directory. See the "Backend Dependency Management" section for more details.

-   **`moduleName`** (string): The name of the npm package to load.
-   **Returns**: The loaded module.

```javascript
// In backend.js
const _ = api.require('lodash');
const sorted = _.sortBy([3, 1, 2]); // Returns [1, 2, 3]
```

---

#### **`axios`**
A pre-configured instance of the `axios` library for making HTTP requests from your backend.

```javascript
// In backend.js
api.registerHandler('fetch-user', async () => {
  const response = await api.axios.get('https://randomuser.me/api/');
  return response.data.results[0];
});
```

---

#### **`getStore()`**
Gets an instance of the `electron-store` object, allowing you to access the same persistent storage as the frontend API.

-   **Returns**: A `Promise` that resolves with the store instance.

```javascript
// In backend.js
api.registerHandler('save-backend-setting', async (value) => {
  const store = await api.getStore();
  store.set('my-plugin_internal-setting', value);
});
```

---

#### **`dialog`**
The raw Electron `dialog` object. This allows your backend to show message boxes or other dialogs directly.

```javascript
// In backend.js
api.registerHandler('show-error', async (message) => {
  await api.dialog.showErrorBox('An Error Occurred', message);
});
```

---

## 🔒 Enhanced Security Model

WinTool features a comprehensive multi-layered security system that protects users while enabling powerful plugin functionality.

### Plugin Sandboxing

Each plugin runs in an isolated sandbox with the following protections:

#### Resource Limits
- **Memory Usage**: Configurable per plugin (default: 50MB, trusted: 100MB)
- **Execution Time**: Maximum runtime limits (default: 30s, trusted: 60s)
- **API Call Limits**: Rate limiting on API calls to prevent abuse
- **Network Requests**: Controlled and monitored HTTP requests

#### Code Isolation
- **Separate Context**: Each plugin runs in its own isolated JavaScript context
- **API Mediation**: All system access goes through secure API wrappers
- **Module Sandboxing**: Backend modules are loaded in controlled environments

### Permission System

Plugins must declare required permissions in their manifest:

```json
{
  "name": "My Plugin",
  "permissions": [
    "storage.read",
    "storage.write",
    "notifications.show",
    "network.request",
    "fs.readUserFile"
  ]
}
```

#### Available Permissions
- `storage.read`: Read from plugin storage
- `storage.write`: Write to plugin storage
- `notifications.show`: Display notifications
- `network.request`: Make HTTP requests
- `fs.readUserFile`: Access user-selected files
- `system.info`: Access system information

### Security Policies

Plugins are assigned security policies based on trust level:

#### Default Policy
- Limited memory (50MB) and execution time (30s)
- Basic permissions only
- No external network access
- Strict code analysis

#### Trusted Policy
- Higher resource limits (100MB, 60s)
- Extended permissions
- Allowed domains for network requests
- Relaxed restrictions for verified plugins

#### Restricted Policy
- Minimal resources (25MB, 15s)
- Read-only permissions
- No network access
- Enhanced monitoring

### Resource Limits

The security system enforces both per-plugin and global limits:

#### Per-Plugin Limits
- Memory usage monitoring
- CPU time tracking
- Network request quotas
- File access logging

#### Global Limits
- Maximum active plugins (50)
- Total memory usage (500MB)
- Concurrent network requests (10)

### Security Validation

All plugins undergo comprehensive security analysis:

#### Static Analysis
- Dangerous pattern detection (eval, Function constructor)
- External resource scanning
- Inline event handler detection
- JavaScript protocol usage

#### Runtime Monitoring
- API usage pattern analysis
- Resource consumption tracking
- Suspicious activity detection
- Violation response handling

### User-Mediated File Access
Plugins cannot access the file system directly. They **must** use the secure file access APIs that require user interaction, ensuring users maintain control over their data.

---

## 🎨 UI Component Guide

To ensure a consistent look and feel, plugins are encouraged to use the application's built-in UI components. These styles are available automatically to your plugin.

### Buttons (`.btn`)

Use for any action a user can take.

- **Primary Action**: `.btn .btn-primary` (e.g., "Run", "Save")
- **Secondary Action**: `.btn .btn-secondary` (e.g., "Cancel", "Export")
- **Success Action**: `.btn .btn-success` (e.g., "Add", "Start")
- **Destructive Action**: `.btn .btn-danger` (e.g., "Delete", "Stop")

**Example:**
```html
<button class="btn btn-primary">
    <i class="fas fa-play"></i> Run Script
</button>
```

### Cards

Cards are used to group related content into modular blocks.

**Example:**
```html
<div class="plugin-card">
    <div class="plugin-card-header">
        <i class="fas fa-cogs"></i>
        <h4>My Awesome Plugin</h4>
    </div>
    <p>This is a description of what my plugin does.</p>
    <div class="plugin-card-footer">
        <span>Version 1.0.0</span>
        <span>by Developer</span>
    </div>
</div>
```

### Forms

Use these classes to create styled inputs for collecting user data.

- **Container**: `.form-group`
- **Text Input**: `.form-input`
- **Dropdown**: `.settings-select`
- **Checkbox**: `.settings-checkbox`

**Example:**
```html
<div class="form-group">
    <label for="my-input">My Setting</label>
    <input type="text" id="my-input" class="form-input" placeholder="Enter a value...">
</div>
```

### Modals

Modals are used to display content or forms in a focused overlay. You will need to use JavaScript to toggle the `display` style between `none` and `flex` to show and hide them.

**Example:**
```html
<div id="my-modal" class="modal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3>My Modal</h3>
            <button class="modal-close" onclick="hideModal()">&times;</button>
        </div>
        <div class="modal-body">
            <p>This is the content of my modal.</p>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="hideModal()">Close</button>
        </div>
    </div>
</div>
```

### Tables

The application uses custom-styled tables per tab (e.g., `.services-table`). It's recommended to define a simple table style in your plugin's own `styles.css` for consistency.


---

## ✅ Development Best Practices

### Development Workflow

1.  **Use the CLI Tool**: Start with `wintool-plugin-cli create` for consistent project structure
2.  **Validate Early**: Run `wintool-plugin-cli validate` frequently during development
3.  **Security First**: Use `wintool-plugin-cli security` to catch security issues early
4.  **Test Thoroughly**: Run `wintool-plugin-cli test` before distribution

### Code Quality

1.  **Use CSS Variables**: Use the application's CSS variables (e.g., `var(--primary-color)`, `var(--background-card)`) for consistent theming
2.  **Handle Asynchronous Operations**: All `wintoolAPI` calls are asynchronous. Use `async/await` for clean code
3.  **Signal Tab Readiness**: Call `window.markTabAsReady(tabId)` once your tab is loaded
4.  **Error Handling**: Always wrap API calls in try-catch blocks
5.  **Input Validation**: Validate all user inputs before processing

### Security Best Practices

1.  **Declare Permissions**: Only request permissions your plugin actually needs
2.  **Avoid Dangerous Patterns**: Never use `eval()`, `Function()` constructor, or `innerHTML` with user data
3.  **Sanitize Inputs**: Always sanitize user inputs and external data
4.  **Use Secure APIs**: Use the provided secure APIs instead of direct system access
5.  **Minimize Dependencies**: Only include necessary dependencies to reduce attack surface

### Performance Optimization

1.  **Resource Management**: Monitor memory usage and clean up resources
2.  **Lazy Loading**: Load resources only when needed
3.  **Efficient DOM Updates**: Minimize DOM manipulations and use document fragments
4.  **Debounce Events**: Debounce frequent events like input changes
5.  **Cache Results**: Cache expensive computations and API results

---

## 📦 Distributing Your Plugin

### Using the CLI Tool (Recommended)

The CLI tool provides the best way to package and distribute plugins:

```bash
# Build your plugin
wintool-plugin-cli build ./my-plugin

# This creates:
# - A ZIP package ready for distribution
# - An integrity hash for verification
# - Validation report
```

### Manual Distribution

To manually share your plugin:

1. **Validate First**: Ensure your plugin passes validation
2. **Create ZIP**: Compress your plugin folder into a ZIP file
3. **Include Documentation**: Add a README with installation instructions
4. **Share**: Distribute the ZIP file to users

### Installation for Users

Users can install plugins in several ways:

#### Through WinTool UI
1. Open WinTool Settings
2. Go to Plugins section
3. Click "Install Plugin"
4. Select the ZIP file

#### Manual Installation
1. Extract ZIP to `AppData\Local\MTechTool\Plugins`
2. Restart WinTool
3. Plugin appears in sidebar

### Plugin Verification

WinTool includes a verification system:

- **Hash Verification**: Plugins are verified against known good hashes
- **Security Scanning**: Automatic security analysis on installation
- **Trust Levels**: Plugins can be marked as trusted, default, or restricted
- **Update Notifications**: Users are notified of plugin updates

---

## 📦 Backend Dependency Management (npm)

For plugins that require a `backend.js`, you can manage dependencies using `npm`. This is the recommended approach for any backend development, as it is more robust and scalable than manual library management.

### Using `package.json`

1.  **Create `package.json`**: In the root of your plugin's folder, create a standard `package.json` file.
2.  **Add Dependencies**: Add your required packages to the `dependencies` section.

    ```json
    {
      "name": "my-cool-plugin",
      "version": "1.0.0",
      "dependencies": {
        "lodash": "^4.17.21",
        "uuid": "^9.0.0"
      }
    }
    ```

3.  **Automatic Installation**: When WinTool starts, it will automatically detect the `package.json` file and run `npm install` inside your plugin's directory if it finds that the `node_modules` folder is missing.

### Loading Dependencies in `backend.js`

To maintain security and prevent conflicts between plugins, you cannot use a global `require()` in your `backend.js`. Instead, the `initialize` function of your backend is passed a secure `api` object which contains a special `require` function.

-   **`api.require(moduleName)`**: Loads a module from your plugin's local `node_modules` directory.

#### Example:

Here is how you would load the `lodash` and `uuid` packages defined in the `package.json` above.

```javascript
// my-cool-plugin/backend.js

module.exports = {
  initialize: (api) => {
    // Load dependencies using the provided API
    const _ = api.require('lodash');
    const { v4: uuidv4 } = api.require('uuid');

    // Register a handler that uses a dependency
    api.registerHandler('get-unique-id', async () => {
      return uuidv4();
    });

    // Register another handler using a different dependency
    api.registerHandler('sort-array', async (data) => {
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array.');
      }
      return _.sortBy(data);
    });
  }
};
```

---

## 🔧 Troubleshooting

### Common Issues

#### Buttons Not Working ⚠️ **MOST COMMON ISSUE**
- **Root cause**: Using `document.getElementById()` instead of `container.querySelector()`
- **Why it happens**: WinTool plugins work like tabs and need container scoping
- **Quick fix**: Replace all `document.getElementById()` with `container.querySelector()`
- **Complete solution**: See [PLUGIN_BUTTON_GUIDE.md](PLUGIN_BUTTON_GUIDE.md) for detailed patterns
- **Generated code**: New CLI plugins have working buttons by default

#### Plugin Not Loading
- Check that `plugin.json` is valid JSON
- Ensure all required files are present
- Verify plugin directory is in correct location
- Check console for error messages

#### Security Violations
- Review security scan results with `wintool-plugin-cli security`
- Remove dangerous code patterns (eval, Function constructor)
- Declare required permissions in manifest
- Use secure APIs instead of direct system access

#### Performance Issues
- Monitor resource usage in developer tools
- Check for memory leaks in long-running plugins
- Optimize DOM operations and event handlers
- Use the CLI validation to identify performance issues

#### Build Failures
- Ensure all dependencies are installed
- Check that plugin passes validation
- Verify security scan passes
- Review build logs for specific errors

### Debug Mode

Enable debug mode for detailed logging:

```bash
DEBUG=1 wintool-plugin-cli validate ./my-plugin
```

### Getting Help

- 📖 **Documentation**: This guide and CLI README
- 🐛 **Issues**: Report bugs on GitHub
- 💬 **Community**: Join discussions for help and tips
- 🔍 **CLI Help**: Run `wintool-plugin-cli help` for command reference

---

## 🚀 Advanced Topics

### Custom Security Policies

For enterprise or specialized deployments, you can create custom security policies:

```json
{
  "my-plugin": {
    "maxMemoryUsage": 104857600,
    "maxExecutionTime": 60000,
    "allowedDomains": ["api.mycompany.com"],
    "permissions": ["storage.read", "storage.write", "network.request"]
  }
}
```

### Plugin Development Server

For advanced development workflows, use the development server:

```javascript
const PluginDevServer = require('./src/dev/plugin-dev-server');

const devServer = new PluginDevServer({
  hotReload: true,
  autoValidate: true,
  debugMode: true
});

await devServer.start();
```

### Integration with CI/CD

Integrate plugin validation into your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Validate Plugin
  run: |
    npm install -g ./cli
    wintool-plugin-cli validate ./my-plugin
    wintool-plugin-cli security ./my-plugin
    wintool-plugin-cli test ./my-plugin
```

<div align="center">

**Happy coding!**

🔌 Build amazing plugins for WinTool! 🔌

</div>
