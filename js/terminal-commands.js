const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// All commands are now PowerShell compatible and use PowerShell syntax
const commands = {
    systeminfo: {
        ps: 'Get-ComputerInfo | Format-List'
    },
    'top-cpu': {
        ps: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 | Format-Table -AutoSize'
    },
    services: {
        ps: 'Get-Service | Where-Object {$_.Status -eq "Running"} | Select-Object Name,DisplayName,Status | Format-Table -AutoSize'
    },
    uptime: {
        ps: '((Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime).ToString()'
    },
    env: {
        ps: 'Get-ChildItem Env: | Format-Table -AutoSize'
    },
    users: {
        ps: 'Get-LocalUser | Where-Object { $_.Enabled -eq $true } | Format-Table Name,Enabled,LastLogon'
    },
    ipconfig: {
        ps: 'Get-NetIPConfiguration | Format-List'
    },
    netadapter: {
        ps: 'Get-NetAdapter | Format-Table Name,Status,MacAddress,LinkSpeed -AutoSize'
    },
    diskinfo: {
        ps: 'Get-Volume | Format-Table DriveLetter,FileSystemLabel,FileSystem,SizeRemaining,Size -AutoSize'
    },
    ping: {
        ps: 'Test-Connection google.com -Count 4 | Format-Table -AutoSize'
    },
    tracert: {
        ps: 'tracert google.com'
    },
    netstat: {
        ps: 'netstat -ano'
    },
    tasklist: {
        ps: 'Get-Process | Select-Object Id,ProcessName,CPU | Sort-Object CPU -Descending | Format-Table -AutoSize'
    },
    schtasks: {
        ps: 'Get-ScheduledTask | Select-Object TaskName,State | Format-Table -AutoSize'
    },
    wmic: {
        ps: 'Get-WmiObject Win32_BIOS | Format-List'
    }
};

async function executeCommand(cmd, shell = 'powershell') {
    try {
        // Only PowerShell is supported now
        const command = commands[cmd]?.ps;
        if (!command) throw new Error('Unknown or unsupported command');
        const shellCmd = `powershell -NoProfile -Command "${command.replace(/"/g, '\\"')}"`;

        const { stdout, stderr } = await execPromise(shellCmd);
        if (stderr) {
            throw new Error(stderr);
        }
        return stdout;
    } catch (error) {
        throw new Error(`Failed to execute command: ${error.message}`);
    }
}

module.exports = { executeCommand };
