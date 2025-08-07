# <div align="center">WinTool</div>

<div align="center">

![WinTool Version](https://img.shields.io/badge/WinTool-v0.3.3wb-orange?style=for-the-badge&logo=windows&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows_11-blue?style=for-the-badge&logo=windows)
![License](https://img.shields.io/badge/License-GPL--3.0-green?style=for-the-badge)
![GitHub Stars](https://img.shields.io/github/stars/MTechWare/wintool?style=for-the-badge&logo=github)
![GitHub Issues](https://img.shields.io/github/issues/MTechWare/wintool?style=for-the-badge&logo=github)
[![Plugin Marketplace](https://img.shields.io/badge/🔌_Plugin-Marketplace-4CAF50?style=for-the-badge&logo=puzzle-piece)](https://mtechware.github.io/plugins.html)
[![Discord Community](https://img.shields.io/badge/💬_Join-Discord-7289DA?style=for-the-badge&logo=discord)](https://discord.gg/GSTEfkxhmD)

**🏆 Comprehensive. Intuitive. Professional.**

</div>

WinTool is a powerful and intuitive application for Windows system management, designed for IT professionals, system administrators, and power users. It offers a unified interface for managing all aspects of a Windows system, with real-time data, a comprehensive set of utilities, and seamless administration tools, all wrapped in a secure, extensible platform.

## 🆕 What's New

# Version: v0.3.3wb

> **New Tab.**

---

## :sparkles: **New Features**
**Added Process Tab - Monitor and manage running processes directly from WinTool**

**Enhanced CPU Monitoring - Real-time CPU usage tracking in System Health Dashboard**

---

## 📋 Table of Contents

- [🆕 What's New](#-whats-new)
- [🚀 Features](#-features)
  - [Core Features](#-core-features)
  - [Extensibility and Customization](#-extensibility-and-customization)
- [📦 Installation](#-installation)
- [🏗️ System Requirements & Architecture Support](#️-system-requirements--architecture-support)
- [🔌 Plugin System](#-plugin-system)
- [🎯 Quick Start](#-quick-start)
- [🔧 Configuration](#-configuration)
- [🧩 Modular Architecture](#-modular-architecture)
- [🤝 Support](#-support)
- [🔒 Security & Privacy](#-security--privacy)
- [🏗 Built With](#-built-with)
- [📄 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
- [🤝 Contributing](#-contributing)

---

## 🚀 Features

WinTool is packed with features designed for power users, system administrators, and IT professionals.

### ✨ Core Features

- **🔧 14 System Management Tools**: A complete suite for system administration.
- **💻 35 Integrated System Utilities**: Access essential Windows utilities from a single interface.
- **📊 Real-time System Monitoring**: Live data on hardware, performance, and system health.
- **🔌 Extensible through Plugins**: Add new features and tools with a simple and secure plugin system.
- **🎨 Customizable Interface**: Personalize the look and feel with themes, colors, and layout options.
- **⌨️ Keyboard-Driven**: Use keyboard shortcuts and a command palette for quick access to all features.
- **⚡ Portable**: No installation required. Run it from anywhere.

| Tool                          | Description                                         | Key Capabilities                                            |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| **System Information**        | Real-time system monitoring                         | Hardware, performance, and system overview                  |
| **System Utilities**          | Windows administrative tools                        | 35 utilities across 8 categories                            |
| **Services Manager**          | Windows service management                          | Start/stop/restart services, customizable quick access      |
| **Package Manager**           | Software package management                         | Install and manage packages with winget integration         |
| **Network Tools**             | Network monitoring and analysis                     | Interface status and connectivity information               |
| **System Cleanup**            | Performance optimization                            | Clean temporary files and optimize system performance       |
| **Environment Variables**     | Environment variable management                     | Manage system and user environment variables                |
| **Windows Unattend**          | Automated installation file creation                | Create and export `unattend.xml` files                      |
| **Script Editor**             | Code editor with syntax highlighting                | A powerful and lightweight editor for various languages     |
| **Event Viewer**              | Windows Event Log viewer                            | Browse and search system event logs                         |
| **AppX Packages**             | Microsoft app management                            | Uninstall Microsoft apps and AppX packages                  |
| **System Health**             | Real-time system monitoring                         | Live performance metrics and health alerts                  |
| **Windows Tweaks**            | Windows customization                               | Apply various tweaks to customize Windows 10/11 (sourced from Win11Debloat, Optimizer & W11Boost) |
| **Plugin Management**         | Plugin installation and management                  | Install, update, and manage plugins from a simple UI        |

---

- **🔒 Secure Plugin System**: Extend WinTool’s functionality by creating or installing plugins. The plugin system is built with security at its core, featuring:
    - **Sandboxed Script Execution**: Plugins can only run scripts located inside their own folder.
    - **Isolated Data Storage**: Each plugin has its own private storage, preventing data tampering.
    - **User-Mediated File Access**: Plugins must ask for user permission to read or write files.
- **🎨 Customizable UI**: Tailor the look and feel of the application with themes, including light, dark, and custom color schemes. Adjust window opacity for a modern look.
- **🚀 Portable Mode**: No installation required. Run WinTool from a USB drive or any directory.
- **⌨️ Keyboard-Driven Navigation**: Use a command palette (`Ctrl+F`) and keyboard shortcuts for quick access to every tool and feature.

---

## 📦 Installation

### Recommended: One-Click PowerShell Install
Run the following command in PowerShell as an administrator for a seamless installation:
```powershell
irm https://raw.githubusercontent.com/MTechWare/wintool/refs/heads/main/WinTool_Installer.ps1 | iex
```

**Installation Location**: `%LOCALAPPDATA%\MTechWare\WinTool\` (typically `C:\Users\[Username]\AppData\Local\MTechWare\WinTool\`)

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

### 📁 Directory Structure
After installation, WinTool creates the following directory structure:
```
%LOCALAPPDATA%\MTechWare\WinTool\
├── WinTool.exe              # Main application executable
├── config.json              # Application settings and preferences
└── Plugins\                 # User-installed plugins directory
    └── [plugin-folders]\    # Individual plugin directories
```

---

## 🏗️ System Requirements & Architecture Support

WinTool provides comprehensive support for modern Windows architectures:

### System Requirements
- **Operating System**: Windows 10 (version 1903+) or Windows 11
- **Architecture**: x64 (64-bit) systems supported
- **Memory**: 4 GB RAM minimum, 8 GB recommended for optimal performance
- **Storage**: 100 MB available disk space (additional space for plugins)
- **Permissions**: Standard user account (Administrator privileges for some system tools RECOMMENDED)

### Performance Characteristics
- **Startup Time**: < 5-10 seconds on modern systems
- **Memory Footprint**: ~150-200 MB RAM usage
- **CPU Usage**: Minimal background processing.
- **Real-time Updates**: Live system monitoring with configurable refresh rates

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

For developers, see the [Plugin Development Guide](https://github.com/MTechWare/wintool/blob/main/PLUGIN_DEVELOPMENT.md).

---

## 🎯 Quick Start

1. **Launch WinTool**: Run the executable (WinTool.exe).
2. **Explore the Dashboard**: Start with the Welcome tab for an overview.
3. **Customize Your Experience**: Open Settings to personalize the appearance and behavior.
4. **Access System Tools**: Use the sidebar or `Ctrl+F` to find and use the various system tools.

---

## 🔧 Configuration

WinTool stores its configuration in `%LOCALAPPDATA%\MTechWare\WinTool\config.json`. This file contains:

- **Theme Settings**: Color schemes, opacity, and UI preferences
- **Plugin Configuration**: Enabled plugins and their settings
- **Tool Preferences**: Customized layouts, quick access configurations, performance settings, and more

The configuration file is automatically created on first launch with sensible defaults.

---

## 🧩 Modular Architecture

WinTool is designed with a modular architecture, separating the core tools from community-driven plugins.

- **Core Tools**: Located in the `src/tabs/` directory. Each tool is a self-contained module with its own HTML, CSS, JavaScript, and a `config.json` file for metadata.
- **Plugin System**: Plugins are stored in the `%LOCALAPPDATA%\MTechWare\WinTool\Plugins` directory. Each plugin includes a `plugin.json` manifest, UI files (`index.html`, `styles.css`, `script.js`), and an optional `backend.js` for advanced functionality.

## 🤝 Support

Need help or have questions? We're here to assist you:

- **🐛 Bug Reports & Feature Requests**: [GitHub Issues](https://github.com/MTechWare/wintool/issues)
- **� Community Support**: [Discord Server](https://discord.gg/GSTEfkxhmD)
- **📖 Documentation**: [Plugin Development Guide](https://github.com/MTechWare/wintool-plugins)
- **🔌 Plugin Marketplace**: [Browse Plugins](https://mtechware.github.io/plugins.html)

### Reporting Issues

When reporting bugs, please include:
- Your Windows version and architecture
- WinTool version (found in Settings → About)
- Steps to reproduce the issue
- Any error messages or screenshots


---

## 🔒 Security & Privacy

WinTool is built with security as a core principle:

### Plugin Security
- **Sandboxed Execution**: Plugins run in isolated environments
- **Permission-Based Access**: Plugins must request access to system resources
- **Code Validation**: All plugin code is validated before execution
- **User-Controlled Permissions**: Users have full control over plugin capabilities

### Data Privacy
- **Local Storage Only**: All data remains on your local machine
- **No Telemetry**: WinTool does not collect or transmit user data
- **Transparent Operations**: All system operations are logged and visible
- **Open Source**: Full source code available for security auditing

---

## 🏗 Built With

- **[Electron](https://electronjs.org/)** - Cross-platform desktop framework
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **[Font Awesome](https://fontawesome.com/)** - Icon library
- **Windows PowerShell/WMI** - Native Windows system data collection

---

## 📄 License

This project is licensed under the GPL-3.0-or-later License.

---

## 🙏 Acknowledgments

- The Electron community for their excellent documentation and support.
- Our contributors and beta testers for their valuable feedback.
- The open-source community for the libraries and tools that made this project possible.
- ChrisTitusTech for the Winget/Choco packages
- **[Raphire](https://github.com/Raphire)** for [Win11Debloat](https://github.com/Raphire/Win11Debloat) - Many Windows tweaks are adapted from this excellent project (MIT License)
- **[hellzerg](https://github.com/hellzerg)** for [Optimizer](https://github.com/hellzerg/optimizer) - Performance and system optimization tweaks (GPL-3.0 License)
- **[felikcat](https://github.com/felikcat)** for [W11Boost](https://github.com/felikcat/W11Boost) - Advanced Windows 11 performance and privacy tweaks (AGPL-3.0 License)

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

- **🐛 Report Bugs**: Use our [Issue Tracker](https://github.com/MTechWare/wintool/issues)
- **💡 Suggest Features**: Share your ideas for new tools and improvements
- **🔌 Create Plugins**: Extend WinTool with custom functionality
- **📖 Improve Documentation**: Help make our guides clearer and more comprehensive
- **🌐 Translations**: Help localize WinTool for different languages

### Development Setup

```bash
# Clone the repository
git clone https://github.com/MTechWare/wintool.git
cd wintool

# Install dependencies
npm install

# Start development mode
npm run dev
```

---

<div align="center">

**Made with ❤️ by MTechWare**

[![GitHub](https://img.shields.io/badge/GitHub-MTechWare-181717?style=flat&logo=github)](https://github.com/MTechWare)
[![Discord](https://img.shields.io/badge/Discord-Community-7289DA?style=flat&logo=discord)](https://discord.gg/GSTEfkxhmD)

[⬆ Back to Top](#div-aligncenterwintool)

</div>
