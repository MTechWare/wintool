// c:\Users\userv\OneDrive - Southeast Community College\wintool-MAIN\src\tabs\tweaks\script.js

// c:\Users\userv\OneDrive - Southeast Community College\wintool-MAIN\src\tabs\tweaks\script.js

const tweaksGrid = document.getElementById('tweaks-grid');

if (tweaksGrid) {
    const tweaks = [
        {
            id: 'disable-cortana',
            title: 'Disable Cortana',
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
            id: 'disable-startup-delay',
            title: 'Disable Startup Delay',
            description: 'Removes the delay for startup applications.',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v "StartupDelayInMSec"');
                return result.stdout.includes('StartupDelayInMSec    REG_DWORD    0x0');
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v "StartupDelayInMSec" /t REG_DWORD /d 0 /f');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('reg delete "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v "StartupDelayInMSec" /f');
            }
        },
        {
            id: 'show-hidden-files',
            title: 'Show Hidden Files and Folders',
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
            id: 'disable-people-bar',
            title: 'Disable People Bar',
            description: 'Disables the "People" icon and feature on the taskbar.',
            check: async () => {
                const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\People" /v "PeopleBand"');
                return result.stdout.includes('PeopleBand    REG_DWORD    0x0');
            },
            apply: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\People" /v "PeopleBand" /t REG_DWORD /d 0 /f');
            },
            revert: async () => {
                await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\People" /v "PeopleBand" /t REG_DWORD /d 1 /f');
            }
        }
    ];

    const renderTweaks = (filteredTweaks) => {
        const tweaksToRender = filteredTweaks || tweaks;
        tweaksGrid.innerHTML = '';
        tweaksToRender.forEach(tweak => {
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
