# WinTool Project Analysis

## Project Structure

```
wintool/
├── js/
│   ├── main.js           # Main renderer process script
│   ├── packages.js       # Package management backend module
│   ├── updates.js        # Update checking service
│   ├── registry.js       # Registry operations module
│   ├── system.js         # System information service
│   ├── services.js       # Windows services module
│   ├── startup.js        # Startup management module
│   ├── gaming.js         # Gaming optimizations module
│   └── tabs/
│       ├── packages.js   # Packages tab UI logic
│       ├── setup.js      # Setup tab UI logic
│       ├── updates.js    # Updates tab UI logic
│       ├── system.js     # System info tab UI logic
│       ├── services.js   # Services tab UI logic
│       ├── startup.js    # Startup tab UI logic
│       ├── registry.js   # Registry tab UI logic
│       ├── gaming.js     # Gaming tab UI logic
│       ├── about.js      # About tab UI logic
│       ├── settings.js   # Settings tab UI logic
│       └── dashboard.js  # Dashboard tab UI logic
├── main.js              # Main Electron process
├── preload.js           # Electron preload script
├── index.html           # Main application window
├── styles/
│   ├── main.css         # Main stylesheet
│   ├── tabs.css         # Tab-specific styles
│   └── components/      # Component-specific styles
│       ├── sidebar.css
│       ├── buttons.css
│       └── progress.css
├── html/
│   └── tabs/            # HTML templates for tabs
│       ├── packages.html   # Packages tab template
│       ├── setup.html      # Setup tab template
│       ├── updates.html    # Updates tab template
│       ├── system.html     # System info tab template
│       ├── services.html   # Services tab template
│       ├── startup.html    # Startup tab template
│       ├── registry.html   # Registry tab template
│       ├── gaming.html     # Gaming tab template
│       ├── about.html      # About tab template
│       ├── settings.html   # Settings tab template
│       └── dashboard.html  # Dashboard tab template
├── assets/
│   ├── icons/             # Application icons
│   │   ├── app.ico
│   │   ├── app.png
│   │   └── tray.png
│   └── images/            # UI images and icons
│       ├── tabs/          # Tab-specific images
│       └── logos/         # Brand logos
├── config/
│   ├── applications.json  # Package database
│   ├── default.json       # Default settings
│   └── themes.json        # Theme configurations
├── docs/                  # Documentation
│   ├── README.md
│   ├── CONTRIBUTING.md
│   └── api/               # API documentation
├── tests/                 # Test files
│   ├── unit/
│   └── integration/
├── package.json           # Project configuration
├── package-lock.json      # Dependency lock file
└── LICENSE                # GPL-3.0 license
```

## Architecture Patterns

1. **Electron Architecture**
   - Main Process (main.js): Window management, IPC handlers, system operations
   - Renderer Process (js/main.js): UI logic, tab management, event handling
   - Preload Bridge: Secure context bridging between processes

2. **Tab-based UI Organization**
   - Each tab has dedicated module in js/tabs/
   - Consistent initialization pattern via window.initXxxTab
   - Sidebar navigation with draggable/reorderable tabs

3. **Package Management**
   - Backend service (packages.js)
   - UI module (tabs/packages.js) 
   - Integration with WinGet and Chocolatey
   - Progress tracking and multi-package operations

## Key Dependencies

1. **Production Dependencies**
   - electron: Application framework
   - systeminformation: System metrics and info
   - electron-store: Configuration storage
   - node-fetch: Network requests
   - winreg: Windows registry access

2. **Development Dependencies**
   - electron-builder: Application packaging
   - tailwindcss: Styling framework
   - parcel: Build tool

## Code Organization

1. **Common Patterns**
   - Module exports for backend services
   - Global window functions for tab initialization
   - Event-driven architecture for UI updates
   - Progress indicators for async operations

2. **File Structure**
   - Backend modules in project root
   - Frontend logic in js/ directory
   - Tab-specific code in js/tabs/
   - Documentation in docs/

3. **Configuration**
   - package.json: Project setup and build config
   - applications.json: Package database
   - Local storage for user preferences

## Build Process

- Uses electron-builder for packaging
- Produces portable Windows executable
- No ASAR packaging for easy updates
- GPL-3.0 licensed open source

