# WinTool Portable

<div align="center">

![WinTool Portable](https://img.shields.io/badge/WinTool-Portable-orange?style=for-the-badge&logo=windows&logoColor=white)
![Version](https://img.shields.io/badge/Version-0.0.2a-blue?style=for-the-badge)
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

- **🎯 Unified Interface**: Access 8 management tools and 24+ Windows utilities from a single, intuitive dashboard
- **📊 Real-time Monitoring**: Live system data with automatic refresh capabilities
- **🔧 Professional Tools**: Production-ready interfaces for system administration
- **🎨 Customizable**: Personalize appearance, behavior, and workspace layout
- **⚡ Portable**: No installation required - run directly from any location

---

## 🛠 Features

### Core Management Tools

| Tool | Description | Key Capabilities |
|------|-------------|------------------|
| **System Information** | Real-time system monitoring | Hardware details, performance metrics, system overview |
| **System Utilities** | Windows administrative tools | 24+ utilities across 6 categories |
| **Services Manager** | Windows service management | Start/stop/restart services, customizable quick access |
| **Package Manager** | Software package management | Install/uninstall packages via winget integration |
| **Network Tools** | Network monitoring & analysis | Interface status, connectivity information |
| **System Cleanup** | Performance optimization | Clean temporary files, optimize system performance |
| **Environment Variables** | Environment variable management | Manage system and user environment variables |
| **Windows Unattend** | Automated installation files | Create and export Windows unattend.xml files |

### Advanced Features

- **🔍 Tab Search**: Quickly find and navigate to any feature
- **📌 Draggable Tabs**: Organize workspace with persistent layout
- **⚙️ Customizable Settings**: Appearance, behavior, and advanced options
- **⌨️ Keyboard Shortcuts**: Customizable hotkeys for quick access
- **📱 Responsive Design**: Optimized for different screen sizes
- **🎨 Theme Support**: Professional dark theme with customizable colors
- **💾 Settings Persistence**: Automatic saving of user preferences

### Keyboard Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Ctrl+F** | Focus Tab Search | Quickly search for and navigate to specific tabs |
| **Ctrl+R** | Refresh Current Tab | Refresh data in the currently active tab |
| **F5** | Refresh System Info | Globally refresh system information across all tabs |
| **Ctrl+S** | Open Settings | Open the settings panel |
| **Escape** | Close Modals | Close any open modal dialog or popup |

*All keyboard shortcuts are customizable through the Settings panel*

---

## 📋 System Requirements

| Requirement | Specification |
|-------------|---------------|
| **Operating System** | Windows 10/11 (64-bit) |
| **Memory** | 4 GB RAM minimum, 8 GB recommended |
| **Storage** | 200 MB available space |
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
   - Configure auto-refresh intervals

4. **Access System Tools**
   - Use System Utilities for quick access to Windows tools
   - Monitor real-time data in System Information
   - Manage services with the Services Manager
   - Install packages with the Package Manager
   - Configure environment variables
   - Create Windows unattend files for automated installations

---

## 🧩 Tab System Architecture

WinTool Portable uses a modular tab system where each tool is a self-contained module:

```
src/tabs/
├── system-info/          # Real-time system monitoring
├── system-utilities/     # Windows administrative tools
├── services/            # Windows service management
├── packages/            # Package management via winget
├── networking/          # Network interface monitoring
├── cleanup/             # System cleanup and optimization
├── environment-variables/ # Environment variable management
└── windows-unattend/    # Windows unattend file creation
```

Each tab contains:
- **config.json** - Tab metadata and configuration
- **index.html** - Tab content and interface
- **styles.css** - Tab-specific styling
- **script.js** - Tab functionality and logic

This modular approach allows for easy maintenance, updates, and potential future expansion.

---

## 🔧 Configuration

WinTool Portable stores settings in the user's application data directory:
```
%APPDATA%/WinTool/settings.json
```

### Key Settings
- **Theme Colors**: Customize primary and accent colors
- **Window Size**: Default window dimensions (60% of screen)
- **Auto-refresh**: System data refresh intervals
- **Tab Layout**: Saved tab order and preferences
- **Keyboard Shortcuts**: Customizable hotkey configurations
- **Behavior**: Remember last tab, auto-refresh settings

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

---

<div align="center">

**Made with ❤️ for Windows System Administrators**

[⬆ Back to Top](#wintool-portable)

</div>
