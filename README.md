<div align="center">

# 🛠️ WinTool - Windows Utility

[![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://www.microsoft.com/windows)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](LICENSE)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg?style=for-the-badge)](https://github.com/MTechWare/wintool)

### 🎯 A Modern Windows System Management Suite

*Streamline your Windows experience with an elegant, all-in-one system management tool.*

**[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Requirements](#-requirements)**

</div>

## 📋 Requirements

### System Requirements
- Windows 10/11
- 4GB RAM (minimum)
- 70MB free disk space

### Build from Source (Recommended for Developers)
```bash
git clone https://github.com/MTechWare/wintool.git
cd wintool
npm install
npx electron .
```

### Build Distributable (Installer/Portable)
```bash
npx electron-builder
```
- If you see `'electron-builder' is not recognized`, make sure you ran `npm install` and use `npx electron-builder` instead of `npm run dist`.

### Option 2: Download Release (if available)
1. Visit the [Releases Page](https://github.com/MTechWare/wintools)
2. Download the latest version
3. Run the installer or executable to start the application

## ⚡ Troubleshooting
- **Electron build errors:**
  - If `electron-builder` is not found, use `npx electron-builder`.
  - If you deleted `node_modules`, run `npm install` again.

## ✨ Features

### 🏠 Dashboard

- **Real-time System Monitoring**
  - CPU, Memory, and Disk usage tracking
  - Performance metrics visualization
- **Quick Actions Hub**
  - Common system tasks
  - Frequently used tools
- **First-Time Tutorial**
  - Access the onboarding tutorial from the Welcome page at any time

### ⚡ Tweaks

- **Performance Optimization**
  - System tweaks for better performance
  - Gaming optimizations
- **Privacy Settings**
  - Windows telemetry controls
  - Privacy-focused configurations

### 📦 Package Management

- **Table-Based Interface**
  - Multi-select package installation
  - Checkbox selection for bulk operations
  - Scrollable package list
- **Installation Progress**
  - Real-time progress tracking
  - Current package status display
- **Uninstall Support**
  - Individual package removal
  - Bulk uninstallation
- **WinGet & Chocolatey Integration**
  - Smart package search
  - Category-based filtering
  - Automatic package manager detection
- **Direct Download Support**
  - Browser integration for direct links
  - Seamless handling of non-package manager apps

### 💻 System Tools

- **System Maintenance**
  - Disk cleanup utility
  - Task manager integration
- **System Configuration**
  - Device manager
  - Control panel

### 🔧 System Health

- **Performance Monitoring**
  - Resource usage tracking
  - System metrics
- **System Information**
  - Hardware details
  - Software inventory

### ⚙️ Unattended Setup

- **Windows Configuration**
  - Custom installation settings
  - System preferences

## 🎨 Themes & Design

- **Modern Interface**
  - Sun Valley dark theme
  - Custom accent color system
  - Draggable window with custom title bar
- **Responsive Design**
  - Adaptive layout
  - Scrollable tabs for better content viewing
  - Smooth animations
- **Custom Typography**
  - Custom font support
  - Consistent styling across all tabs

## 🎯 Usage

1. **Start the App**
   ```bash
   npx electron .
   ```
2. **Navigate Features**
   - Use the tab bar for navigation
   - Access quick actions from the dashboard
   - Monitor system health in real-time
3. **Package Management**
   - Search packages using the smart search bar
   - Filter by categories or tags
   - Perform bulk operations

## 🤝 Credits

- **UI Framework**: Electron, Tailwind CSS
- **Package Management**: Windows Package Manager (winget), Package List (ChrisTitusTech)
- **System Monitoring**: Node.js only (no Python required)

---

## License

This project is licensed under the GNU General Public License v3.0 or later (GPLv3).
See the [LICENSE](./LICENSE) file for details.

Made with ❤️ by MTech
