const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

let gameBoosterActive = false;

const gamingFeatures = {
    setGameBooster: async (enabled) => {
        try {
            if (enabled) {
                await execAsync('powershell -Command "Get-Process | Where-Object {$_.ProcessName -notmatch \'^(System|Registry|WinLogon|csrss|smss|wininit)$\'} | ForEach-Object { $_.PriorityClass = \'BelowNormal\' }"');
                gameBoosterActive = true;
            } else {
                await execAsync('powershell -Command "Get-Process | ForEach-Object { $_.PriorityClass = \'Normal\' }"');
                gameBoosterActive = false;
            }
            return { success: true };
        } catch (error) {
            console.error('Game Booster error:', error);
            return { error: error.message };
        }
    },

    getGameBoosterStatus: () => gameBoosterActive,

    optimizeMemory: async () => {
        try {
            await execAsync('powershell -Command "EmptyStandbyList"');
            return { success: true };
        } catch (error) {
            console.error('Memory optimization error:', error);
            return { error: error.message };
        }
    },

    setPowerPlan: async (plan) => {
        try {
            const cmd = plan === 'high' 
                ? 'powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'
                : 'powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e';
            await execAsync(cmd);
            return { success: true };
        } catch (error) {
            console.error('Power plan error:', error);
            return { error: error.message };
        }
    },

    setGameMode: async (enabled) => {
        try {
            const value = enabled ? '1' : '0';
            const cmd = `reg add "HKCU\\Software\\Microsoft\\GameBar" /v "AutoGameModeEnabled" /t REG_DWORD /d ${value} /f`;
            await execAsync(cmd);
            return { success: true };
        } catch (error) {
            console.error('Game Mode error:', error);
            return { error: error.message };
        }
    },

    getGameModeStatus: async () => {
        try {
            const { stdout } = await execAsync('reg query "HKCU\\Software\\Microsoft\\GameBar" /v "AutoGameModeEnabled"');
            return stdout.includes('0x1');
        } catch (error) {
            console.error('Get game mode status error:', error);
            return false;
        }
    }
};

// Export as module
module.exports = gamingFeatures;
