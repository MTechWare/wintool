// c:\Users\userv\OneDrive - Southeast Community College\wintool-MAIN\src\tabs\tweaks\script.js

// c:\Users\userv\OneDrive - Southeast Community College\wintool-MAIN\src\tabs\tweaks\script.js

const tweaksGrid = document.getElementById('tweaks-grid');

if (tweaksGrid) {
    const tweaks = [
        {
            id: 'disable-cortana',
            title: 'Disable Cortana',
            category: 'System Tweaks',
            description: 'Disables the Cortana voice assistant.',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "AllowCortana"');
                return result.stdout.includes('AllowCortana    REG_DWORD    0x0');
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "AllowCortana" /t REG_DWORD /d 0 /f');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "AllowCortana" /f');
            }
        },
        {
            id: 'show-file-extensions',
            title: 'Show File Extensions',
            category: 'System Tweaks',
            description: 'Shows file extensions in File Explorer.',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "HideFileExt"');
                return result.stdout.includes('HideFileExt    REG_DWORD    0x0');
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "HideFileExt" /t REG_DWORD /d 0 /f');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "HideFileExt" /t REG_DWORD /d 1 /f');
            }
        },
        {
            id: 'disable-telemetry',
            title: 'Disable Telemetry',
            category: 'System Tweaks',
            description: 'Disables Windows telemetry services, tasks, and data collection.',
            check: async () => {
                const regResult = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowTelemetry"');
                const serviceResult = await window.electronAPI.runCommand('sc.exe query DiagTrack');
                return regResult.stdout.includes('AllowTelemetry    REG_DWORD    0x0') && !serviceResult.stdout.includes('STATE_RUNNING');
            },
            apply: async () => {
                const commands = [
                    'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d 0 /f',
                    'sc.exe config "DiagTrack" start=disabled',
                    'sc.exe stop "DiagTrack"',
                    'sc.exe config "dmwappushservice" start=disabled',
                    'sc.exe stop "dmwappushservice"',
                    'schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator" /Disable',
                    'schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip" /Disable'
                ].join(' && ');
                await window.electronAPI.runAdminCommand(commands);
            },
            revert: async () => {
                const commands = [
                    'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowTelemetry" /f',
                    'sc.exe config "DiagTrack" start=auto',
                    'sc.exe start "DiagTrack"',
                    'sc.exe config "dmwappushservice" start=auto',
                    'sc.exe start "dmwappushservice"',
                    'schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator" /Enable',
                    'schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip" /Enable'
                ].join(' && ');
                await window.electronAPI.runAdminCommand(commands);
            }
        },
        {
            id: 'dark-theme-apps',
            title: 'Use Dark Theme for Apps',
            category: 'System Tweaks',
            description: 'Switches the application theme to dark mode.',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "AppsUseLightTheme"');
                return result.stdout.includes('AppsUseLightTheme    REG_DWORD    0x0');
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "AppsUseLightTheme" /t REG_DWORD /d 0 /f');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "AppsUseLightTheme" /t REG_DWORD /d 1 /f');
            }
        },
        {
            id: 'show-hidden-files',
            title: 'Show Hidden Files and Folders',
            category: 'System Tweaks',
            description: 'Makes hidden files and folders visible in File Explorer.',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Hidden"');
                return result.stdout.includes('Hidden    REG_DWORD    0x1');
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Hidden" /t REG_DWORD /d 1 /f');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Hidden" /t REG_DWORD /d 2 /f');
            }
        },
        {
            id: 'disable-action-center',
            title: 'Disable Action Center',
            category: 'System Tweaks',
            description: 'Disables the Action Center.',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v "DisableNotificationCenter"');
                return result.stdout.includes('DisableNotificationCenter    REG_DWORD    0x1');
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v "DisableNotificationCenter" /t REG_DWORD /d 1 /f');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('reg delete "HKEY_CURRENT_USER\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v "DisableNotificationCenter" /f');
            }
        },
        {
            id: 'remove-3d-objects',
            title: 'Remove 3D Objects from File Explorer',
            category: 'System Tweaks',
            description: 'Removes the "3D Objects" folder from This PC.',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Explorer\\MyComputer\\NameSpace\\{0DB7E03F-FC29-4DC6-9020-FF41B59E513A}"');
                // If the command succeeds (code 0), the key exists, so the tweak is NOT applied.
                return !result.success;
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Explorer\\MyComputer\\NameSpace\\{0DB7E03F-FC29-4DC6-9020-FF41B59E513A}" /f');
            },
            revert: async () => {
                // This is a bit more complex as it involves adding the key back.
                // For simplicity, we'll just log a message. A more robust solution would be to export the key before deleting.
                console.log('Reverting "Remove 3D Objects" requires manually adding the registry key back.');
            }
        },
        {
            id: 'disable-lock-screen',
            title: 'Disable Lock Screen',
            category: 'System Tweaks',
            description: 'Disables the lock screen, showing the login screen directly.',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization" /v "NoLockScreen"');
                return result.stdout.includes('NoLockScreen    REG_DWORD    0x1');
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization" /v "NoLockScreen" /t REG_DWORD /d 1 /f');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization" /v "NoLockScreen" /f');
            }
        },
        {
            id: 'enable-verbose-status',
            title: 'Enable Verbose Status Messages',
            category: 'System Tweaks',
            description: 'Displays detailed information during startup, shutdown, logon, and logoff.',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v "VerboseStatus"');
                return result.stdout.includes('VerboseStatus    REG_DWORD    0x1');
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v "VerboseStatus" /t REG_DWORD /d 1 /f');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v "VerboseStatus" /f');
            }
        },
        {
            id: 'disable-auto-reboot-on-failure',
            title: 'Disable Automatic Restart on System Failure',
            category: 'System Tweaks',
            description: 'Prevents Windows from automatically restarting after a Blue Screen of Death (BSOD).',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKEY_LOCAL_MACHINE\\System\\CurrentControlSet\\Control\\CrashControl" /v "AutoReboot"');
                return result.stdout.includes('AutoReboot    REG_DWORD    0x0');
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKEY_LOCAL_MACHINE\\System\\CurrentControlSet\\Control\\CrashControl" /v "AutoReboot" /t REG_DWORD /d 0 /f');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKEY_LOCAL_MACHINE\\System\\CurrentControlSet\\Control\\CrashControl" /v "AutoReboot" /t REG_DWORD /d 1 /f');
            }
        },
        {
            id: 'disable-widgets',
            title: 'Disable Widgets',
            category: 'System Tweaks',
            description: 'Disables the Widgets feature.',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v "AllowNewsAndInterests"');
                return result.stdout.includes('AllowNewsAndInterests    REG_DWORD    0x0');
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v "AllowNewsAndInterests" /t REG_DWORD /d 0 /f');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v "AllowNewsAndInterests" /f');
            }
        },
        {
            id: 'disable-game-dvr',
            title: 'Disable Game DVR',
            category: 'System Tweaks',
            description: 'Disables Game DVR and the Game Bar.',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v "AllowGameDVR"');
                return result.stdout.includes('AllowGameDVR    REG_DWORD    0x0');
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v "AllowGameDVR" /t REG_DWORD /d 0 /f');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v "AllowGameDVR" /f');
            }
        },
        {
            id: 'disable-storage-sense',
            title: 'Disable Storage Sense',
            category: 'System Tweaks',
            description: 'Disables Storage Sense, which automatically frees up disk space.',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" /v "AllowStorageSense"');
                return result.stdout.includes('AllowStorageSense    REG_DWORD    0x0');
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" /v "AllowStorageSense" /t REG_DWORD /d 0 /f');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" /v "AllowStorageSense" /f');
            }
        },
        {
            id: 'disable-consumer-experience',
            title: 'Disable Consumer Experience',
            category: 'System Tweaks',
            description: 'Disables the Microsoft Consumer Experience, which installs suggested apps.',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsConsumerFeatures"');
                return result.stdout.includes('DisableWindowsConsumerFeatures    REG_DWORD    0x1');
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsConsumerFeatures" /t REG_DWORD /d 1 /f');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsConsumerFeatures" /f');
            }
        },
        {
            id: 'disable-sysmain',
            title: 'Disable SysMain (Superfetch)',
            category: 'Useless Services',
            description: 'Disables the SysMain service, which preloads frequently used apps. Disabling may improve performance on SSDs.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"SysMain\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "SysMain" && sc.exe config "SysMain" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "SysMain" start=auto && sc.exe start "SysMain"');
            }
        },
        {
            id: 'disable-print-spooler',
            title: 'Disable Print Spooler',
            category: 'Useless Services',
            description: 'Disables the Print Spooler service. If you don\'t use a printer, this can free up resources.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"Spooler\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "Spooler" && sc.exe config "Spooler" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "Spooler" start=auto && sc.exe start "Spooler"');
            }
        },
        {
            id: 'disable-fax-service',
            title: 'Disable Fax Service',
            category: 'Useless Services',
            description: 'Disables the Fax service. Most users do not need this service.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"Fax\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                // If service doesn't exist, stdout is empty. We consider this 'disabled'.
                return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "Fax" && sc.exe config "Fax" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "Fax" start=auto && sc.exe start "Fax"');
            }
        },
        {
            id: 'disable-windows-search',
            title: 'Disable Windows Search',
            category: 'Useless Services',
            description: 'Disables the Windows Search service, which indexes files for faster searching. Disabling it can improve system performance.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"WSearch\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "WSearch" && sc.exe config "WSearch" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "WSearch" start=auto && sc.exe start "WSearch"');
            }
        },
        {
            id: 'disable-windows-insider-service',
            title: 'Disable Windows Insider Service',
            category: 'Useless Services',
            description: 'Disables the Windows Insider Service. If you are not part of the Windows Insider Program, this service is not needed.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"wisvc\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "wisvc" && sc.exe config "wisvc" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "wisvc" start=auto && sc.exe start "wisvc"');
            }
        },
        {
            id: 'disable-remote-registry',
            title: 'Disable Remote Registry',
            category: 'Useless Services',
            description: 'Disables the ability for remote users to modify registry settings. Recommended to keep disabled for security.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"RemoteRegistry\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "RemoteRegistry" && sc.exe config "RemoteRegistry" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "RemoteRegistry" start=auto && sc.exe start "RemoteRegistry"');
            }
        },
        {
            id: 'disable-alljoyn-router',
            title: 'Disable AllJoyn Router Service',
            category: 'Useless Services',
            description: 'Disables the service for communicating with nearby Internet of Things (IoT) devices. Most users do not need this.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"AJRouter\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "AJRouter" && sc.exe config "AJRouter" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "AJRouter" start=demand && sc.exe start "AJRouter"');
            }
        },
        {
            id: 'disable-program-compatibility-assistant',
            title: 'Disable Program Compatibility Assistant',
            category: 'Useless Services',
            description: 'Disables the service that monitors for program compatibility issues. Can be turned off if not needed.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"PcaSvc\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "PcaSvc" && sc.exe config "PcaSvc" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "PcaSvc" start=auto && sc.exe start "PcaSvc"');
            }
        },
        {
            id: 'disable-ip-helper',
            title: 'Disable IP Helper',
            category: 'Useless Services',
            description: 'Disables IPv6 connectivity over an IPv4 network. Disable if you only use IPv4. Note: May impact some network features.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"iphlpsvc\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "iphlpsvc" && sc.exe config "iphlpsvc" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "iphlpsvc" start=auto && sc.exe start "iphlpsvc"');
            }
        },
        {
            id: 'disable-security-center',
            title: 'Disable Security Center',
            category: 'Useless Services',
            description: 'Disables Windows Security Center notifications. This will NOT disable your antivirus or firewall.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"wscsvc\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "wscsvc" && sc.exe config "wscsvc" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "wscsvc" start=auto && sc.exe start "wscsvc"');
            }
        },
        {
            id: 'disable-remote-desktop',
            title: 'Disable Remote Desktop Service',
            category: 'Useless Services',
            description: 'Disables the TermService for Remote Desktop. If you do not use Remote Desktop, this can be disabled.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"TermService\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "TermService" && sc.exe config "TermService" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "TermService" start=demand && sc.exe start "TermService"');
            }
        },
        {
            id: 'disable-remote-access',
            title: 'Disable Routing and Remote Access',
            category: 'Useless Services',
            description: 'Disables the Remote Access service. Only needed for VPN/dial-up connections.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"RemoteAccess\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "RemoteAccess" && sc.exe config "RemoteAccess" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "RemoteAccess" start=demand && sc.exe start "RemoteAccess"');
            }
        },
        {
            id: 'disable-winrm',
            title: 'Disable Windows Remote Management',
            category: 'Useless Services',
            description: 'Disables the WinRM service for remote management. If not managing this PC remotely, it can be disabled.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"WinRM\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "WinRM" && sc.exe config "WinRM" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "WinRM" start=auto && sc.exe start "WinRM"');
            }
        },
        {
            id: 'disable-link-tracking',
            title: 'Disable Distributed Link Tracking',
            category: 'Useless Services',
            description: 'Disables tracking of linked files across NTFS volumes. Rarely needed on a single-user PC.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"TrkWks\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "TrkWks" && sc.exe config "TrkWks" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "TrkWks" start=auto && sc.exe start "TrkWks"');
            }
        },
        {
            id: 'disable-netlogon',
            title: 'Disable Netlogon Service',
            category: 'Useless Services',
            description: 'Disables Netlogon service. Not needed if the computer is not part of a domain.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"Netlogon\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "Netlogon" && sc.exe config "Netlogon" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "Netlogon" start=demand && sc.exe start "Netlogon"');
            }
        },
        {
            id: 'disable-secondary-logon',
            title: 'Disable Secondary Logon',
            category: 'Useless Services',
            description: 'Disables the Secondary Logon service (Run As). If you do not use this feature, it can be disabled for security.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"seclogon\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "seclogon" && sc.exe config "seclogon" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "seclogon" start=auto && sc.exe start "seclogon"');
            }
        },
        {
            id: 'disable-tablet-input',
            title: 'Disable Touch Keyboard and Handwriting',
            category: 'Useless Services',
            description: 'Disables the service for touch keyboard and handwriting panel. Unnecessary for most desktop users.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"TabletInputService\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "TabletInputService" && sc.exe config "TabletInputService" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "TabletInputService" start=auto && sc.exe start "TabletInputService"');
            }
        },
        {
            id: 'disable-waas-medic',
            title: 'Disable Windows Update Medic Service',
            category: 'Useless Services',
            description: 'Disables WaaSMedicSvc, which attempts to repair Windows Update components. Can be disabled if not needed.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"WaaSMedicSvc\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "WaaSMedicSvc" && sc.exe config "WaaSMedicSvc" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "WaaSMedicSvc" start=demand && sc.exe start "WaaSMedicSvc"');
            }
        },
        {
            id: 'disable-gaming-services',
            title: 'Disable Xbox Gaming Services',
            category: 'Useless Services',
            description: 'Disables all Xbox-related services. Recommended if you do not use the Xbox app or Game Bar.',
            check: async () => {
                const services = ['XblAuthManager', 'XblGameSave', 'XboxNetApiSvc', 'XboxGipSvc'];
                for (const service of services) {
                    const command = `powershell -NoProfile -Command "(Get-Service -Name \\"${service}\\" -ErrorAction SilentlyContinue).StartType"`;
                    const result = await window.electronAPI.runCommand(command);
                    if (result.stdout.trim() !== 'Disabled' && result.stdout.trim() !== '') {
                        return false;
                    }
                }
                return true;
            },
            apply: async () => {
                const commands = [
                    'sc.exe stop "XblAuthManager" && sc.exe config "XblAuthManager" start=disabled',
                    'sc.exe stop "XblGameSave" && sc.exe config "XblGameSave" start=disabled',
                    'sc.exe stop "XboxNetApiSvc" && sc.exe config "XboxNetApiSvc" start=disabled',
                    'sc.exe stop "XboxGipSvc" && sc.exe config "XboxGipSvc" start=disabled'
                ].join(' && ');
                await window.electronAPI.runAdminCommand(commands);
            },
            revert: async () => {
                const commands = [
                    'sc.exe config "XblAuthManager" start=demand && sc.exe start "XblAuthManager"',
                    'sc.exe config "XblGameSave" start=demand && sc.exe start "XblGameSave"',
                    'sc.exe config "XboxNetApiSvc" start=demand && sc.exe start "XboxNetApiSvc"',
                    'sc.exe config "XboxGipSvc" start=demand && sc.exe start "XboxGipSvc"'
                ].join(' && ');
                await window.electronAPI.runAdminCommand(commands);
            }
        },
        {
            id: 'disable-biometric-service',
            title: 'Disable Windows Biometric Service',
            category: 'Useless Services',
            description: 'Disables biometric services (fingerprint, facial recognition). Disable if you do not use these features.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"WbioSrvc\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "WbioSrvc" && sc.exe config "WbioSrvc" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "WbioSrvc" start=demand && sc.exe start "WbioSrvc"');
            }
        },
        {
            id: 'disable-geolocation-service',
            title: 'Disable Geolocation Service',
            category: 'Useless Services',
            description: 'Disables the lfsvc for location tracking. Disable for privacy if not needed by any applications.',
            check: async () => {
                const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"lfsvc\\" -ErrorAction SilentlyContinue).StartType"';
                const result = await window.electronAPI.runCommand(command);
                return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('sc.exe stop "lfsvc" && sc.exe config "lfsvc" start=disabled');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('sc.exe config "lfsvc" start=demand && sc.exe start "lfsvc"');
            }
        }
    ];

    const renderTweaks = (filteredTweaks) => {
        const tweaksToRender = filteredTweaks || tweaks;
        tweaksGrid.innerHTML = '';
    
        const categories = [...new Set(tweaksToRender.map(t => t.category || 'System Tweaks'))];
    
        categories.forEach(category => {
            const categoryHeader = document.createElement('h3');
            categoryHeader.className = 'plugin-section-header';
            categoryHeader.textContent = category;
            tweaksGrid.appendChild(categoryHeader);
    
            const categoryTweaks = tweaksToRender.filter(t => (t.category || 'System Tweaks') === category);
    
            categoryTweaks.forEach(tweak => {
                const card = document.createElement('div');
                card.className = 'plugin-card';
                card.dataset.tweakId = tweak.id;
    
                card.innerHTML = `
                    <div class="plugin-card-header">
                        <h4 class="plugin-title">${tweak.title}</h4>
                        <div class="plugin-status">
                            <span class="status-indicator"></span>
                            <span class="status-text">Loading...</span>
                        </div>
                    </div>
                    <p class="plugin-description">${tweak.description}</p>
                    <div class="plugin-card-footer">
                        <label class="toggle-switch">
                            <input type="checkbox" class="tweak-checkbox" disabled>
                            <span class="slider"></span>
                        </label>
                    </div>
                `;
                tweaksGrid.appendChild(card);
    
                tweak.check().then(status => {
                const statusIndicator = card.querySelector('.status-indicator');
                const statusText = card.querySelector('.status-text');
                const checkbox = card.querySelector('.tweak-checkbox');

                statusIndicator.classList.toggle('active', status);
                statusText.textContent = status ? 'Active' : 'Inactive';
                checkbox.checked = status;
                checkbox.disabled = false;
            }).catch(error => {
                console.error(`Failed to check tweak status for ${tweak.title}`, error);
                const statusText = card.querySelector('.status-text');
                statusText.textContent = 'Error';
            });
        });
    });
};

    tweaksGrid.addEventListener('change', async (event) => {
        if (event.target.classList.contains('tweak-checkbox')) {
            const checkbox = event.target;
            const card = checkbox.closest('.plugin-card');
            const tweakId = card.dataset.tweakId;
            const tweak = tweaks.find(t => t.id === tweakId);
            const statusIndicator = card.querySelector('.status-indicator');
            const statusText = card.querySelector('.status-text');

            // Disable the checkbox to prevent rapid clicking
            checkbox.disabled = true;
            statusText.textContent = 'Applying...';

            try {
                if (checkbox.checked) {
                    await tweak.apply();
                    statusIndicator.classList.add('active');
                    statusText.textContent = 'Active';
                } else {
                    await tweak.revert();
                    statusIndicator.classList.remove('active');
                    statusText.textContent = 'Inactive';
                }
            } catch (error) {
                console.error(`Failed to apply/revert tweak: ${tweak.title}`, error);
                statusText.textContent = 'Error';
                // Revert the checkbox to its previous state on failure
                checkbox.checked = !checkbox.checked;
            } finally {
                // Re-enable the checkbox after the operation is complete
                checkbox.disabled = false;
            }
        }
    });

    const searchInput = document.getElementById('tweak-search');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredTweaks = tweaks.filter(tweak =>
            tweak.title.toLowerCase().includes(searchTerm) ||
            tweak.description.toLowerCase().includes(searchTerm)
        );
        renderTweaks(filteredTweaks);
    });

    const exportTweaksBtn = document.getElementById('export-tweaks-btn');
    exportTweaksBtn.addEventListener('click', async () => {
        const appliedTweaks = [];
        // Query all tweak cards directly from the grid to ensure everything displayed is considered.
        const allTweakCards = tweaksGrid.querySelectorAll('.plugin-card');
        
        allTweakCards.forEach(card => {
            const checkbox = card.querySelector('.tweak-checkbox');
            if (checkbox && checkbox.checked) {
                const tweakId = card.dataset.tweakId;
                // Ensure the tweak exists in our master list before exporting
                if (tweaks.some(t => t.id === tweakId)) {
                    appliedTweaks.push(tweakId);
                }
            }
        });

        const exportData = {
            description: "WinTool Applied Tweaks Configuration",
            exportDate: new Date().toISOString(),
            tweakCount: appliedTweaks.length,
            appliedTweakIds: appliedTweaks
        };

        const content = JSON.stringify(exportData, null, 2);
        const result = await window.electronAPI.saveFile(content, {
            title: 'Export Applied Tweaks',
            defaultPath: 'wintool-tweaks.json',
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });

        if (result && result.filePath) {
            // This is a placeholder for a notification. Assuming electronAPI has such a function.
            console.log(`${appliedTweaks.length} tweaks exported successfully to ${result.filePath}`);
        }
    });

    const importTweaksBtn = document.getElementById('import-tweaks-btn');
    importTweaksBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.showOpenDialog({
            title: 'Import Applied Tweaks',
            properties: ['openFile'],
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });

        if (result && !result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            try {
                const content = await window.electronAPI.readFile(filePath);
                const importedData = JSON.parse(content);
                
                // Support both the new format and the old simple array format
                const importedTweakIds = Array.isArray(importedData) 
                    ? importedData 
                    : importedData.appliedTweakIds;

                if (!Array.isArray(importedTweakIds)) {
                    console.error('Imported tweaks file does not contain a valid array of tweak IDs.');
                    return;
                }

                let appliedCount = 0;
                for (const tweakId of importedTweakIds) {
                    const tweak = tweaks.find(t => t.id === tweakId);
                    if (tweak) {
                        const card = tweaksGrid.querySelector(`[data-tweak-id="${tweak.id}"]`);
                        if (card) {
                            const checkbox = card.querySelector('.tweak-checkbox');
                            // Apply if it's not already checked
                            if (!checkbox.checked) {
                                checkbox.checked = true;
                                // Dispatch change event to trigger the apply logic
                                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                                appliedCount++;
                            }
                        }
                    }
                }
                console.log(`${appliedCount} tweaks were newly applied from the import file.`);

            } catch (error) {
                console.error('Failed to read or parse imported tweaks file:', error);
            }
        }
    });

    renderTweaks();

    // Notify tab loader that this tab is ready
    if (window.tabLoader) {
        window.tabLoader.markTabAsReady('tweaks');
    }
} else {
    console.error('Could not find the tweaks-grid element.');
    // Still mark as ready to not block app loading
    if (window.tabLoader) {
        window.tabLoader.markTabAsReady('tweaks');
    }
}
