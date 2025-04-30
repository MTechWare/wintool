const WinReg = require('winreg');
const { spawn } = require('child_process');

// Example tweak registry locations and values
const TWEAKS = [
  {
    key: 'visualfx',
    reg: {
      hive: WinReg.HKCU,
      key: '\\Control Panel\\Performance',
      name: 'VisualFXSetting',
    },
    // 2 = Best Performance, 1 = Let Windows choose, 3 = Best Appearance
    get: async () => {
      return await readRegistryValue(WinReg.HKCU, '\\Control Panel\\Performance', 'VisualFXSetting');
    },
    set: async (value) => {
      return await writeRegistryValue(WinReg.HKCU, '\\Control Panel\\Performance', 'VisualFXSetting', 'REG_DWORD', value);
    },
  },
  {
    key: 'show_hidden_files',
    reg: {
      hive: WinReg.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
      name: 'Hidden',
    },
    // 1 = show hidden files, 2 = don't show
    get: async () => {
      return await readRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'Hidden');
    },
    set: async (value) => {
      return await writeRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'Hidden', 'REG_DWORD', value);
    },
  },
  {
    key: 'file_extensions',
    reg: {
      hive: WinReg.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
      name: 'HideFileExt',
    },
    // 0 = show extensions, 1 = hide extensions
    get: async () => {
      return await readRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'HideFileExt');
    },
    set: async (value) => {
      return await writeRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'HideFileExt', 'REG_DWORD', value);
    },
  },
  {
    key: 'disable_telemetry',
    reg: {
      hive: WinReg.HKLM,
      key: '\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection',
      name: 'AllowTelemetry',
    },
    // 0 = disable
    get: async () => {
      return await readRegistryValue(WinReg.HKLM, '\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', 'AllowTelemetry');
    },
    set: async (value) => {
      return await writeRegistryValue(WinReg.HKLM, '\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', 'AllowTelemetry', 'REG_DWORD', value);
    },
  },
  {
    key: 'disable_advertising_id',
    reg: {
      hive: WinReg.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo',
      name: 'Enabled',
    },
    // 0 = disable
    get: async () => {
      return await readRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo', 'Enabled');
    },
    set: async (value) => {
      return await writeRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo', 'Enabled', 'REG_DWORD', value);
    },
  },
  {
    key: 'show_this_pc_on_desktop',
    reg: {
      hive: WinReg.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel',
      name: '{20D04FE0-3AEA-1069-A2D8-08002B30309D}',
    },
    // 0 = show
    get: async () => {
      return await readRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel', '{20D04FE0-3AEA-1069-A2D8-08002B30309D}');
    },
    set: async (value) => {
      return await writeRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel', '{20D04FE0-3AEA-1069-A2D8-08002B30309D}', 'REG_DWORD', value);
    },
  },
  {
    key: 'show_recycle_bin_on_desktop',
    reg: {
      hive: WinReg.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel',
      name: '{645FF040-5081-101B-9F08-00AA002F954E}',
    },
    // 0 = show
    get: async () => {
      return await readRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel', '{645FF040-5081-101B-9F08-00AA002F954E}');
    },
    set: async (value) => {
      return await writeRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel', '{645FF040-5081-101B-9F08-00AA002F954E}', 'REG_DWORD', value);
    },
  },
  {
    key: 'disable_lock_screen',
    reg: {
      hive: WinReg.HKLM,
      key: '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization',
      name: 'NoLockScreen',
    },
    // 1 = disable
    get: async () => {
      return await readRegistryValue(WinReg.HKLM, '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization', 'NoLockScreen');
    },
    set: async (value) => {
      return await writeRegistryValue(WinReg.HKLM, '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization', 'NoLockScreen', 'REG_DWORD', value);
    },
  },
  {
    key: 'disable_cortana',
    reg: {
      hive: WinReg.HKLM,
      key: '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search',
      name: 'AllowCortana',
    },
    // 0 = disable
    get: async () => {
      return await readRegistryValue(WinReg.HKLM, '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search', 'AllowCortana');
    },
    set: async (value) => {
      return await writeRegistryValue(WinReg.HKLM, '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search', 'AllowCortana', 'REG_DWORD', value);
    },
  },
  {
    key: 'small_taskbar_buttons',
    reg: {
      hive: WinReg.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
      name: 'TaskbarSmallIcons',
    },
    // 1 = small
    get: async () => {
      return await readRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarSmallIcons');
    },
    set: async (value) => {
      return await writeRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarSmallIcons', 'REG_DWORD', value);
    },
  },
  {
    key: 'show_seconds_on_taskbar_clock',
    reg: {
      hive: WinReg.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
      name: 'ShowSecondsInSystemClock',
    },
    // 1 = show
    get: async () => {
      return await readRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'ShowSecondsInSystemClock');
    },
    set: async (value) => {
      return await writeRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'ShowSecondsInSystemClock', 'REG_DWORD', value);
    },
  },
  {
    key: 'disable_startup_sound',
    reg: {
      hive: WinReg.HKCU,
      key: '\\AppEvents\\EventLabels\\WindowsLogon',
      name: 'ExcludeFromCPL',
    },
    // 1 = disable
    get: async () => {
      return await readRegistryValue(WinReg.HKCU, '\\AppEvents\\EventLabels\\WindowsLogon', 'ExcludeFromCPL');
    },
    set: async (value) => {
      return await writeRegistryValue(WinReg.HKCU, '\\AppEvents\\EventLabels\\WindowsLogon', 'ExcludeFromCPL', 'REG_SZ', value);
    },
  },
  {
    key: 'disable_animations',
    reg: {
      hive: WinReg.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects',
      name: 'VisualFXSetting',
    },
    // 2 = best performance (disable)
    get: async () => {
      return await readRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects', 'VisualFXSetting');
    },
    set: async (value) => {
      return await writeRegistryValue(WinReg.HKCU, '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects', 'VisualFXSetting', 'REG_DWORD', value);
    },
  },
  // Add more tweaks here following this structure
];

function readRegistryValue(hive, key, name) {
  return new Promise((resolve, reject) => {
    const regKey = new WinReg({ hive, key });
    regKey.get(name, (err, item) => {
      if (err) return resolve(null); // Not set/not found is not a hard error
      resolve(item ? item.value : null);
    });
  });
}

function writeRegistryValue(hive, key, name, type, value) {
  return new Promise((resolve, reject) => {
    const regKey = new WinReg({ hive, key });
    regKey.set(name, type, value, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function getCurrentTweaks() {
  const results = {};
  for (const tweak of TWEAKS) {
    results[tweak.key] = await tweak.get();
  }
  return results;
}

async function applyTweaks(tweaks) {
  const results = {};
  const errors = [];
  for (const tweak of TWEAKS) {
    if (tweaks.hasOwnProperty(tweak.key)) {
      try {
        await tweak.set(tweaks[tweak.key]);
        results[tweak.key] = tweaks[tweak.key];
      } catch (e) {
        errors.push(`${tweak.key}: ${e.message}`);
      }
    }
  }
  return { results, errors };
}

// Restore all tweaks to Windows defaults
async function restoreDefaultTweaks() {
  // Define the default values for each tweak key
  const defaults = {
    visualfx: 1, // Let Windows choose (1)
    show_hidden_files: 2, // Don't show hidden files (2)
    file_extensions: 1, // Hide file extensions (1)
    disable_telemetry: 1, // Allow telemetry (1)
    disable_advertising_id: 1, // Advertising ID enabled (1)
    disable_cortana: 1, // Allow Cortana (1)
    disable_lock_screen: 0, // Lock screen enabled (0)
    show_this_pc_on_desktop: 0, // Hide 'This PC' (0 = hide)
    show_recycle_bin_on_desktop: 0, // Hide Recycle Bin (0 = hide)
    small_taskbar_buttons: 0, // Use large taskbar buttons (0)
    show_seconds_on_taskbar_clock: 0, // Don't show seconds (0)
    disable_startup_sound: '', // No override (empty string)
    disable_animations: 1, // Animations enabled (1)
  };
  const results = {};
  const errors = [];
  for (const tweak of TWEAKS) {
    const key = tweak.key;
    if (defaults.hasOwnProperty(key)) {
      try {
        await tweak.set(defaults[key]);
        results[key] = defaults[key];
      } catch (e) {
        errors.push(`${key}: ${e.message}`);
      }
    }
  }
  return { results, errors };
}

module.exports = { getCurrentTweaks, applyTweaks, restoreDefaultTweaks, TWEAKS };
