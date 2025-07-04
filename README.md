# WinTool Portable

<div align="center">

![WinTool Portable](https://img.shields.io/badge/WinTool-Portable-orange?style=for-the-badge&logo=windows&logoColor=white)
![Version](https://img.shields.io/badge/Version-0.0.6w-blue?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey?style=for-the-badge&logo=windows)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Professional Windows System Management Suite**

*Comprehensive • Intuitive • Production-Ready*

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Documentation](#-documentation) • [Support](#-support)

</div>

---

## 🚀 Overview

WinTool Portable is a comprehensive Windows system management application designed for IT professionals, system administrators, and power users. Built with Electron and modern web technologies, it provides a unified interface for managing Windows systems with real-time data, powerful utilities, and seamless administration tools.

### ✨ Why WinTool Portable?

- **🎯 Unified Interface**: Access 12 management tools and 24+ Windows utilities from a single, intuitive dashboard
- **📊 Real-time Monitoring**: Live system data with automatic refresh capabilities
- **🔧 Professional Tools**: Production-ready interfaces for system administration
- **🎨 Customizable**: Personalize appearance, behavior, and workspace layout
- **⚡ Portable**: No installation required - run directly from any location

---

## 🛠 Features

### Core Management Tools

| Tool | Description | Key Capabilities |
|------|-------------|------------------|
| **About** | Application information | View details about WinTool, including version and license |
| **Scripting and Automation Engine** | Automate tasks with PowerShell | Create, manage, and schedule scripts to automate system administration |
| **Environment Variables** | Environment variable management | Manage system and user environment variables |
| **Event Viewer** | Windows Event Log viewer | Browse and search system event logs |
| **Network Tools** | Network monitoring & analysis | Interface status, connectivity information |
| **Package Manager** | Software package management | Install/uninstall packages via winget integration |
| **Processes** | Process management | View and manage running system processes |
| **Services Manager** | Windows service management | Start/stop/restart services, customizable quick access |
| **System Cleanup** | Performance optimization | Clean temporary files, optimize system performance |
| **System Information** | Real-time system monitoring | Hardware details, performance metrics, system overview |
| **System Utilities** | Windows administrative tools | 24+ utilities across 6 categories |
| **Windows Unattend** | Automated installation files | Create and export Windows unattend.xml files |

### Advanced Features

- **🔍 Tab Search**: Quickly find and navigate to any feature
- **📌 Draggable Tabs**: Organize workspace with persistent layout
- **⚙️ Customizable Settings**: Appearance, behavior, and advanced options
- **⌨️ Keyboard Shortcuts**: Customizable hotkeys for quick access
- **📱 Responsive Design**: Optimized for different screen sizes
- **🎨 Theme Support**: Professional dark theme with customizable colors
- **💾 Settings Persistence**: Automatic saving of user preferences
- **🎨 Multiple Themes**: Choose from built-in themes or create your own
- **🔌 Extensible Plugin System**: Add new functionality with a simple and secure plugin architecture.

### Keyboard Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Ctrl+F** | Focus Tab Search | Quickly search for and navigate to specific tabs |
| **Ctrl+R** | Refresh Current Tab | Refresh data in the currently active tab |
| **F5** | Refresh System Info | Globally refresh system information across all tabs |
| **Ctrl+S** | Open Settings | Open the settings panel |
| **Escape** | Close Modals | Close any open modal dialog or popup |

*All keyboard shortcuts are customizable through the Settings panel*

### Themes

WinTool Portable comes with multiple themes and the ability to create your own.

| Theme | Description |
|---|---|
| **Classic Dark** | A high-contrast dark theme with orange accents. |
| **Modern Gray** | A sleek, modern dark theme with gray tones and blue accents. |
| **Custom** | Create and save your own theme using the in-app theme editor. |
| **Rainbow Mode** | An animated theme that cycles through the color spectrum. |

---

## 📋 System Requirements

| Requirement | Specification |
|-------------|---------------|
| **Operating System** | Windows 10/11 (64-bit) |
| **Memory** | 4 GB RAM minimum, 8 GB recommended |
| **Storage** | 70 MB available space |
| **Display** | 1366x768 minimum resolution |
| **Network** | Internet connection for package management |

---

## 📦 Installation

### Option 1: One-Click PowerShell Install (Recommended)
```powershell
irm https://raw.githubusercontent.com/MTechWare/wintool/refs/heads/main/WinTool_Installer.ps1 | iex
```
*Run this command in PowerShell as Administrator for the best installation experience*

### Option 2: Portable Executable
1. Download the latest `WinTool.exe` from releases
2. Place the executable in your preferred directory
3. Double-click to launch - no installation required

### Option 3: Development Setup
```bash
# Clone the repository
git clone https://github.com/MTechWare/wintool.git

# Navigate to directory
cd wintool

# Install dependencies
npm install

# Launch application
npm start
```

---

## 🔌 Plugin System

WinTool's functionality can be extended with a powerful, yet simple, plugin system. Plugins can add new tabs to the sidebar, access system information securely, and introduce custom logic to create new tools.

### Key Features

- **Simple Development**: Create plugins using standard HTML, CSS, and JavaScript.
- **Secure by Design**: Plugins run in a sandboxed environment and use a dedicated `wintoolAPI` to interact with the system, preventing direct access to sensitive Node.js or Electron APIs.
- **Backend Scripts**: For advanced use cases, plugins can include a `backend.js` file that runs in the main process, allowing for more complex operations and use of Node.js modules in a secure manner.
- **Easy Installation**: Users can install plugins by simply selecting a `.zip` file from the Settings panel.

### Installing Plugins

1.  Open the **Settings** panel (Ctrl+S).
2.  Navigate to the **Plugins** tab.
3.  Click **"Install Plugin from File"** and select your plugin's `.zip` package.
4.  The application will prompt for a restart to complete the installation.

For developers interested in creating their own plugins, see the [Plugin Development Guide](src/plugins/README.md).

---

## 🎯 Quick Start

1. **Launch WinTool Portable**
   - Run the executable or use `npm start`
   - The application opens with a splash screen while loading

2. **Explore the Dashboard**
   - Start with the Welcome tab for an overview
   - Use the sidebar to navigate between tools
   - Try the tab search feature (Ctrl+F)

3. **Customize Your Experience**
   - Access Settings to personalize appearance
   - Drag tabs to organize your preferred layout

4. **Access System Tools**
   - Use System Utilities for quick access to Windows tools
   - Monitor real-time data in System Information
   - Manage services with the Services Manager
   - Install packages with the Package Manager
   - Configure environment variables
   - Create Windows unattend files for automated installations

---

## 🧩 Modular Architecture

WinTool Portable is built with a modular design, separating core tools (tabs) from community-driven extensions (plugins).

### Tab System

Core tools are self-contained modules located in the `src/tabs/` directory:
```
src/tabs/
├── about/
├── cleanup/
├── environment-variables/
├── event-viewer/
├── networking/
plugins/
├── dev-template/
```
Each tab contains `index.html`, `styles.css`, `script.js`, and a `config.json` file for its metadata. This structure allows for easy maintenance and updates.

### Plugin Architecture

Plugins follow a similar structure and are located in the `src/plugins/` directory. This allows anyone to extend WinTool's functionality. Each plugin is a self-contained folder that includes:

- **plugin.json**: (Required) The manifest file containing metadata like name, version, and icon.
- **index.html**: The UI for the plugin's tab.
- **script.js**: Frontend logic for the plugin.
- **backend.js**: (Optional) A Node.js script that runs in the main process for advanced functionality.

---

## 🔧 Configuration

WinTool Portable stores settings in the user's application data directory:
```
%APPDATA%/WinTool/settings.json
```

### Key Settings
- **Theme Colors**: Customize primary and accent colors
- **Window Transparency**: Adjust the opacity of the application window
- **Auto-refresh**: System data refresh intervals
- **Tab Layout**: Saved tab order and preferences
- **Keyboard Shortcuts**: Customizable hotkey configurations
- **Behavior**: Remember last tab, auto-refresh settings, and default elevation preference
- **Developer**: Toggle developer tools

---

## 🤝 Support

### Getting Help
- 📚 [Documentation](docs/)
- 💬 [Community Forum](https://github.com/your-org/wintool-portable/discussions)
- 🐛 [Issue Tracker](https://github.com/your-org/wintool-portable/issues)
- 📧 [Email Support](mailto:support@wintool.com)

### Reporting Issues
When reporting issues, please include:
- Windows version and build number
- WinTool Portable version
- Steps to reproduce the issue
- Screenshots if applicable

---

## 🏗 Built With

- **[Electron](https://electronjs.org/)** - Cross-platform desktop framework
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **[Font Awesome](https://fontawesome.com/)** - Icon library
- **[Systeminformation](https://systeminformation.io/)** - System data collection

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Microsoft Windows team for comprehensive system APIs
- Electron community for excellent documentation
- Contributors and beta testers for valuable feedback
- Open-source community for the libraries and tools that made this project possible

---

<div align="center">

**Made with ❤️ by MTechWare**

[⬆ Back to Top](#wintool-portable)

</div>
