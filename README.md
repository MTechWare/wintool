# 🛠️ WinTool - Windows Utility

<div align="center">

[![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://www.microsoft.com/windows)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg?style=for-the-badge)](https://github.com/MTechWare/wintool)

### 🎯 A Modern Windows System Management Suite

*Streamline your Windows experience with an elegant, all-in-one system management tool.*

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Requirements](#-requirements)

---

</div>

## 📋 Requirements

### System Requirements
- Windows 10/11
- 4GB RAM (minimum)
- 70MB free disk space
- Node.js 18+ (add to PATH)

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

<details open>
<summary><b>🏠 Dashboard</b></summary>

- **Real-time System Monitoring**
  - CPU, Memory, and Disk usage tracking
  - Performance metrics visualization
- **Quick Actions Hub**
  - Common system tasks
  - Frequently used tools
</details>

<details>
<summary><b>⚡ Tweaks</b></summary>

- **Performance Optimization**
  - System tweaks for better performance
  - Gaming optimizations
- **Privacy Settings**
  - Windows telemetry controls
  - Privacy-focused configurations
</details>

<details>
<summary><b>📦 Package Management</b></summary>

- **WinGet Integration**
  - Smart package search
  - Category-based filtering
  - Bulk operations support
- **Package Operations**
  - One-click installation
  - Clean uninstallation
  - Automatic updates
</details>

<details>
<summary><b>💻 System Tools</b></summary>

- **System Maintenance**
  - Disk cleanup utility
  - Task manager integration
- **System Configuration**
  - Device manager
  - Control panel
</details>

<details>
<summary><b>🔧 System Health</b></summary>

- **Performance Monitoring**
  - Resource usage tracking
  - System metrics
- **System Information**
  - Hardware details
  - Software inventory
</details>

<details>
<summary><b>⚙️ Unattended Setup</b></summary>

- **Windows Configuration**
  - Custom installation settings
  - System preferences
- **Automation**
  - Scripted setup
  - Configuration profiles
</details>

## 🎨 Themes & Design

- **Modern Interface**
  - Sun Valley dark theme
  - Orange accent colors
- **Responsive Design**
  - Adaptive layout
  - Smooth animations

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

<div align="center">

Made with ❤️ by MTech

</div>
