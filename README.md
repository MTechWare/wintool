# <div align="center">WinTool</div>

<div align="center">

![WinTool Portable](https://img.shields.io/badge/WinTool-v0.0.9w-orange?style=for-the-badge&logo=windows&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey?style=for-the-badge&logo=windows)
![License](https://img.shields.io/badge/License-GPL--3.0--or--later-blue?style=for-the-badge)

**A Professional Suite of Tools for Windows System Management**

*Comprehensive. Intuitive. Professional.*

</div>

WinTool is a powerful and intuitive application for Windows system management, designed for IT professionals, system administrators, and power users. It offers a unified interface for managing all aspects of a Windows system, with real-time data, a comprehensive set of utilities, and seamless administration tools, all wrapped in a secure, extensible platform.

---

## 📋 Table of Contents

- [🚀 Features](#-features)
  - [Core Features](#-core-features)
  - [Extensibility and Customization](#-extensibility-and-customization)
- [📦 Installation](#-installation)
- [🔌 Plugin System](#-plugin-system)
- [🎯 Quick Start](#-quick-start)
- [🧩 Modular Architecture](#-modular-architecture)
- [🔧 Configuration](#-configuration)
- [🤝 Support](#-support)
- [🏗 Built With](#-built-with)
- [📄 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)

---

## 🚀 Features

WinTool is packed with features designed for power users, system administrators, and IT professionals.

### ✨ Core Features

- **🔧 12+ System Management Tools**: A complete suite for system administration.
- **💻 24+ Integrated System Utilities**: Access essential Windows utilities from a single interface.
- **📊 Real-time System Monitoring**: Live data on hardware, performance, and system health.
- **🔌 Extensible through Plugins**: Add new features and tools with a simple and secure plugin system.
- **🎨 Customizable Interface**: Personalize the look and feel with themes, colors, and layout options.
- **⌨️ Keyboard-Driven**: Use keyboard shortcuts and a command palette for quick access to all features.
- **⚡ Portable**: No installation required. Run it from anywhere.

| Tool                          | Description                                         | Key Capabilities                                            |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| **System Information**        | Real-time system monitoring                         | Hardware, performance, and system overview                  |
| **System Utilities**          | Windows administrative tools                        | 24+ utilities across 6 categories                           |
| **Services Manager**          | Windows service management                          | Start/stop/restart services, customizable quick access      |
| **Package Manager**           | Software package management                         | Install and manage packages with winget integration         |
| **Network Tools**             | Network monitoring and analysis                     | Interface status and connectivity information               |
| **System Cleanup**            | Performance optimization                            | Clean temporary files and optimize system performance       |
| **Disk Usage Analyzer**       | Disk space visualization                            | Interactive treemap of disk usage                           |
| **Environment Variables**     | Environment variable management                     | Manage system and user environment variables                |
| **Windows Unattend**          | Automated installation file creation                | Create and export `unattend.xml` files                      |
| **Script Editor**             | Code editor with syntax highlighting                | A powerful and lightweight editor for various languages     |
| **Event Viewer**              | Windows Event Log viewer                            | Browse and search system event logs                         |
| **Process Manager**           | Process management                                  | View, search, and terminate running processes               |
| **Windows Tweaks**            | Windows customization                               | Apply various tweaks to customize the Windows 10/11         |
| **Plugin Management**         | Plugin installation and management                  | Install, update, and manage plugins from a simple UI        |

---

- **🔒 Secure Plugin System**: Extend WinTool’s functionality by creating or installing plugins. The plugin system is built with security at its core, featuring:
    - **Sandboxed Script Execution**: Plugins can only run scripts located inside their own folder.
    - **Isolated Data Storage**: Each plugin has its own private storage, preventing data tampering.
    - **User-Mediated File Access**: Plugins must ask for user permission to read or write files.
- **🎨 Customizable UI**: Tailor the look and feel of the application with themes, including light, dark, and custom color schemes. Adjust window opacity for a modern look.
- ** portability Portable Mode**: No installation required. Run WinTool from a USB drive or any directory.
- **⌨️ Keyboard-Driven Navigation**: Use a command palette (`Ctrl+F`) and keyboard shortcuts for quick access to every tool and feature.

---

## 📦 Installation

### Recommended: One-Click PowerShell Install
Run the following command in PowerShell as an administrator for a seamless installation:
```powershell
irm https://raw.githubusercontent.com/MTechWare/wintool/refs/heads/main/WinTool_Installer.ps1 | iex
```

### Option 2: Portable Executable
1. Download the latest `WinTool.exe` from the [releases page](https://github.com/MTechWare/wintool/releases).
2. Place the executable in your desired directory.
3. Double-click to launch.

### Option 3: Development Setup
```bash
# Clone the repository
git clone https://github.com/MTechWare/wintool.git

# Navigate to the project directory
cd wintool

# Install dependencies
npm install

# Launch the application
npm start
```

---

## 🔌 Plugin System

Extend WinTool's functionality with a simple and powerful plugin system. Plugins can add new tabs, access system information securely, and introduce custom logic for new tools.

### Key Features

- **Simple Development**: Create plugins with standard HTML, CSS, and JavaScript.
- **Backend Scripts**: Use a `backend.js` file for more complex operations with Node.js modules.
- **Easy Installation**: Install plugins by selecting a `.zip` file from the Settings panel.

### Installing Plugins

1.  Navigate to the **Plugins** tab.
2.  Click **"Install Plugin"** and select your plugin's `.zip` package.
3.  The application will prompt for a restart to complete the installation.

For developers, see the [Plugin Development Guide](PLUGIN_DEVELOPMENT.md).

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

## 🎯 Quick Start

1. **Launch WinTool**: Run the executable (WinTool.exe).
2. **Explore the Dashboard**: Start with the Welcome tab for an overview.
3. **Customize Your Experience**: Open Settings to personalize the appearance and behavior.
4. **Access System Tools**: Use the sidebar or `Ctrl+F` to find and use the various system tools.

---

## 🧩 Modular Architecture

WinTool is designed with a modular architecture, separating the core tools from community-driven plugins.

- **Core Tools**: Located in the `src/tabs/` directory. Each tool is a self-contained module with its own HTML, CSS, JavaScript, and a `config.json` file for metadata.
- **Plugin System**: Plugins are stored in the `\AppData\Local\MTechTool\Plugins` directory. Each plugin includes a `plugin.json` manifest, UI files (`index.html`, `styles.css`, `script.js`), and an optional `backend.js` for advanced functionality.

---

## 🔧 Configuration

WinTool stores its settings in the `%APPDATA%/WinTool/settings.json` file.

You can customize:
- **Theme and Colors**
- **Window Transparency**
- **Auto-refresh Intervals**
- **Tab Layout**
- **Keyboard Shortcuts**
- **Startup Behavior**

---

## 🤝 Support

- 📚 [Documentation](docs/)
- 💬 [Community Forum](https://github.com/MTechWare/wintool/discussions)
- 🐛 [Issue Tracker](https://github.com/MTechWare/wintool/issues)

---

## 🏗 Built With

- **[Electron](https://electronjs.org/)** - Cross-platform desktop framework
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **[Font Awesome](https://fontawesome.com/)** - Icon library
- **[Systeminformation](https://systeminformation.io/)** - System data collection

---

## 📄 License

This project is licensed under the GPL-3.0-or-later License.

---

## 🙏 Acknowledgments

- The Electron community for their excellent documentation and support.
- Our contributors and beta testers for their valuable feedback.
- The open-source community for the libraries and tools that made this project possible.

---

<div align="center">

**Made with ❤️ by MTechWare**

[⬆ Back to Top](#div-aligncenterwintool)

</div>
