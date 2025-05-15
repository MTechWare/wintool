/**
 * Registry path constants for WinTool application
 * Centralized registry paths for easy management
 */
const REG_PATHS = {
    // Privacy paths
    TELEMETRY: {
        // Using HKCU paths where possible, falling back to HKLM
        BASE: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection",
        WOW64: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection",
        LEGACY: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection",
        APPS: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection"
    },
    CORTANA: {
        BASE: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search",
        SETTINGS: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search"
    },
    PRIVACY_CONSENT: {
        // Using HKCU paths for user-level privacy settings
        // Main consent store paths
        LOCATION: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location",
        CAMERA: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam",
        MICROPHONE: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone",
        CONTACTS: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\contacts",
        DIAGNOSTICS: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\appDiagnostics",
        DOCUMENTS: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\documentsLibrary",
        PICTURES: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\picturesLibrary",
        VIDEOS: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\videosLibrary"
    },

    // Device access global settings (legacy paths that are still used)
    DEVICE_ACCESS: {
        LOCATION: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeviceAccess\\Global\\{BFA794E4-F964-4FDB-90F6-51056BFE4B44}",
        CAMERA: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeviceAccess\\Global\\{E5323777-F976-4f5b-9B55-B94699C46E44}",
        MICROPHONE: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeviceAccess\\Global\\{2EEF81BE-33FA-4800-9670-1CD474972C3F}",
        CONTACTS: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeviceAccess\\Global\\{7D7E8402-7C54-4821-A34E-AEEFD62DED93}",
        CALENDAR: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeviceAccess\\Global\\{D89823BA-7180-4B81-B50C-7E471E6121A3}"
    },
    ACTIVITY: {
        // Using HKCU paths where possible
        TIMELINE: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Privacy",
        HISTORY: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Privacy"
    },
    ADVERTISING: {
        ID: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo",
        TRACKING: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy"
    },
    BACKGROUND_APPS: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications",

    // System paths
    UAC: {
        POLICIES: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System",
        SETTINGS: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced"
    },
    REMOTE_DESKTOP: {
        BASE: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server",
        NLA: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp",
        FIREWALL: "HKLM\\SYSTEM\\CurrentControlSet\\Services\\SharedAccess\\Parameters\\FirewallPolicy\\FirewallRules"
    },
    POWER: {
        HIBERNATION: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power",
        SETTINGS: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings",
        TIMEOUTS: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\User\\PowerSchemes",
        FAST_STARTUP: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power"
    },
    WINDOWS_UPDATE: {
        SETTINGS: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update",
        POLICIES: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
        AU: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU"
    },

    // Visual paths
    VISUAL_EFFECTS: {
        SETTINGS: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects",
        ADVANCED: "HKCU\\Control Panel\\Desktop",
        ANIMATIONS: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",  // Correct path for animation settings
        PERFORMANCE: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
        MENU_ANIMATION: "HKCU\\Control Panel\\Desktop\\WindowMetrics", // Added for menu animation
        CUSTOM: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects\\DWMSaveSettings",
        WINDOW_ANIMATION: "HKCU\\Control Panel\\Desktop" // Added for window animation effects
    },
    EXPLORER: {
        ADVANCED: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
        SETTINGS: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer",
        SERIALIZE: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize",
        DESKTOP_ICONS: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel",
        TASKBAR: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
        CLOCK: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced"
    },

    // Gaming paths
    GAMING: {
        GAME_BAR: "HKCU\\Software\\Microsoft\\GameBar",
        GAME_CONFIG: "HKCU\\System\\GameConfigStore",
        GAME_DVR: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR", // Updated correct path
        HARDWARE_ACCELERATION: "HKCU\\Software\\Microsoft\\DirectX\\GraphicsSettings", // More specific path
        GAME_MODE: "HKCU\\Software\\Microsoft\\GameBar",
        FSO: "HKCU\\System\\GameConfigStore",
        GPU_PRIORITY: "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
        GAME_INPUT: "HKCU\\Software\\Microsoft\\GameBar\\GamePanelSettings" // Added for input settings
    },

    // Multimedia paths
    MULTIMEDIA: {
        SYSTEM_PROFILE: "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile",
        GAMES_TASKS: "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
        SYSTEM_RESP: "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\SystemResponsiveness",
        NETWORK_THROTTLE: "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\NetworkThrottlingIndex",
        PRIORITY: "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Audio" // Added for audio priority
    },

    // Additional paths needed for getting current tweaks
    STARTUP: {
        DELAY: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize",
        ITEMS: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run",
        USER_ITEMS: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run"
    },

    LOCK_SCREEN: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization",
    SEARCH: {
        WEB: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search",
        SUGGESTIONS: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search"
    },
    SOUND: {
        STARTUP: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Authentication\\LogonUI\\BootAnimation",
        SCHEME: "HKCU\\AppEvents\\Schemes"
    },

    // Adding missing paths from tweaks.js
    NOTIFICATIONS: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications"
};

module.exports = REG_PATHS;
