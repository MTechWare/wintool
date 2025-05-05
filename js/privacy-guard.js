const { exec } = require('child_process');

async function setPrivacyGuard(enabled) {
    const commands = {
        camera: `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam" /v Value /t REG_SZ /d "${enabled ? 'Deny' : 'Allow'}" /f`,
        microphone: `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone" /v Value /t REG_SZ /d "${enabled ? 'Deny' : 'Allow'}" /f`,
        location: `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" /v Value /t REG_SZ /d "${enabled ? 'Deny' : 'Allow'}" /f`,
        contacts: `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\contacts" /v Value /t REG_SZ /d "${enabled ? 'Deny' : 'Allow'}" /f`,
        diagnostics: `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\appDiagnostics" /v Value /t REG_SZ /d "${enabled ? 'Deny' : 'Allow'}" /f`,
        documents: `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\documentsLibrary" /v Value /t REG_SZ /d "${enabled ? 'Deny' : 'Allow'}" /f`,
        pictures: `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\picturesLibrary" /v Value /t REG_SZ /d "${enabled ? 'Deny' : 'Allow'}" /f`,
        videos: `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\videosLibrary" /v Value /t REG_SZ /d "${enabled ? 'Deny' : 'Allow'}" /f`,
        background: `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" /v GlobalUserDisabled /t REG_DWORD /d ${enabled ? 1 : 0} /f`
    };

    for (const command of Object.values(commands)) {
        try {
            await new Promise((resolve, reject) => {
                exec(command, { windowsHide: true }, (error) => {
                    if (error) {
                        console.warn(`Command failed: ${command}`, error);
                    }
                    resolve();
                });
            });
        } catch (error) {
            console.error('Error executing command:', error);
        }
    }
}

async function getPrivacyGuardStatus() {
    try {
        const { stdout } = await new Promise((resolve) => {
            exec('reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam" /v Value', (error, stdout) => {
                resolve({ stdout: stdout || '' });
            });
        });
        return stdout.includes('Deny');
    } catch {
        return false;
    }
}

module.exports = {
    setPrivacyGuard,
    getPrivacyGuardStatus
};
