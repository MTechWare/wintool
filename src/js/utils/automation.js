/**
 * WinTool - Automation Module
 * Handles task scheduling and script execution functionality
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { dialog } = require('electron');
const { execFile } = require('child_process');
const tempDir = os.tmpdir();

// Task Scheduler functions
async function getScheduledTasks() {
  try {
    // Execute schtasks command to list tasks
    const { stdout } = await execAsync('schtasks /query /fo LIST');
    
    // Parse the output to extract task information
    const tasks = parseScheduledTasks(stdout);
    
    return tasks;
  } catch (error) {
    console.error('Error getting scheduled tasks:', error);
    return [];
  }
}

async function runScheduledTask(taskName) {
  try {
    await execAsync(`schtasks /run /tn "${taskName}"`);
    return { success: true };
  } catch (error) {
    console.error('Error running scheduled task:', error);
    return { error: error.message };
  }
}

async function deleteScheduledTask(taskName) {
  try {
    await execAsync(`schtasks /delete /tn "${taskName}" /f`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting scheduled task:', error);
    return { error: error.message };
  }
}

async function createScheduledTask(taskData) {
  try {
    // Build the schtasks command based on trigger type
    let command = `schtasks /create /tn "${taskData.name}" /tr "${taskData.program}`;
    
    // Add arguments if provided
    if (taskData.arguments) {
      command += ` ${taskData.arguments}`;
    }
    
    command += '"';
    
    // Add description if provided
    if (taskData.description) {
      command += ` /d "${taskData.description}"`;
    }
    
    // Configure trigger based on type
    switch (taskData.triggerType) {
      case 'daily':
        command += ` /sc daily /st ${taskData.triggerDetails.time}`;
        break;
      case 'weekly':
        command += ` /sc weekly /st ${taskData.triggerDetails.time}`;
        if (taskData.triggerDetails.days && taskData.triggerDetails.days.length > 0) {
          command += ` /d ${taskData.triggerDetails.days.join(',')}`;
        }
        break;
      case 'monthly':
        command += ` /sc monthly /st ${taskData.triggerDetails.time}`;
        if (taskData.triggerDetails.day) {
          command += ` /d ${taskData.triggerDetails.day}`;
        }
        break;
      case 'once':
        command += ` /sc once /sd ${taskData.triggerDetails.date} /st ${taskData.triggerDetails.time}`;
        break;
      case 'startup':
        command += ` /sc onstart`;
        if (taskData.triggerDetails.delay && taskData.triggerDetails.delay !== '0') {
          command += ` /delay ${taskData.triggerDetails.delay}M`;
        }
        break;
      case 'logon':
        command += ` /sc onlogon`;
        if (taskData.triggerDetails.delay && taskData.triggerDetails.delay !== '0') {
          command += ` /delay ${taskData.triggerDetails.delay}M`;
        }
        break;
      default:
        throw new Error(`Unsupported trigger type: ${taskData.triggerType}`);
    }
    
    // Add run level if elevated privileges are required
    if (taskData.runElevated) {
      command += ' /rl HIGHEST';
    }
    
    // Force creation (overwrite if exists)
    command += ' /f';
    
    await execAsync(command);
    return { success: true };
  } catch (error) {
    console.error('Error creating scheduled task:', error);
    return { error: error.message };
  }
}

// Batch Script Runner functions
async function runBatchScript(scriptContent, showOutput) {
  try {
    // Create a temporary batch file
    const tempFilePath = path.join(tempDir, `wintool_script_${Date.now()}.bat`);
    await fs.writeFile(tempFilePath, scriptContent);
    
    return new Promise((resolve, reject) => {
      // Execute the batch file
      const process = execFile(tempFilePath, { shell: true }, async (error, stdout, stderr) => {
        // Clean up the temporary file
        try {
          await fs.unlink(tempFilePath);
        } catch (unlinkError) {
          console.error('Error deleting temporary batch file:', unlinkError);
        }
        
        if (error) {
          reject(error);
          return;
        }
        
        resolve(stdout || stderr);
      });
    });
  } catch (error) {
    console.error('Error running batch script:', error);
    return { error: error.message };
  }
}

async function saveBatchScript(scriptContent) {
  try {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Batch Script',
      defaultPath: path.join(os.homedir(), 'Documents', 'script.bat'),
      filters: [
        { name: 'Batch Files', extensions: ['bat', 'cmd'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!filePath) {
      throw new Error('cancelled');
    }
    
    await fs.writeFile(filePath, scriptContent);
    return filePath;
  } catch (error) {
    console.error('Error saving batch script:', error);
    throw error;
  }
}

async function loadBatchScript() {
  try {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Load Batch Script',
      defaultPath: path.join(os.homedir(), 'Documents'),
      filters: [
        { name: 'Batch Files', extensions: ['bat', 'cmd'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (!filePaths || filePaths.length === 0) {
      throw new Error('cancelled');
    }
    
    const filePath = filePaths[0];
    const content = await fs.readFile(filePath, 'utf8');
    
    return { filePath, content };
  } catch (error) {
    console.error('Error loading batch script:', error);
    throw error;
  }
}

// PowerShell Console functions
async function runPowerShellScript(scriptContent, showOutput) {
  try {
    // Create a temporary PowerShell script file
    const tempFilePath = path.join(tempDir, `wintool_script_${Date.now()}.ps1`);
    await fs.writeFile(tempFilePath, scriptContent);
    
    return new Promise((resolve, reject) => {
      // Execute the PowerShell script
      const process = execFile('powershell', ['-ExecutionPolicy', 'Bypass', '-File', tempFilePath], async (error, stdout, stderr) => {
        // Clean up the temporary file
        try {
          await fs.unlink(tempFilePath);
        } catch (unlinkError) {
          console.error('Error deleting temporary PowerShell file:', unlinkError);
        }
        
        if (error) {
          reject(error);
          return;
        }
        
        resolve(stdout || stderr);
      });
    });
  } catch (error) {
    console.error('Error running PowerShell script:', error);
    return { error: error.message };
  }
}

async function savePowerShellScript(scriptContent) {
  try {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save PowerShell Script',
      defaultPath: path.join(os.homedir(), 'Documents', 'script.ps1'),
      filters: [
        { name: 'PowerShell Files', extensions: ['ps1'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!filePath) {
      throw new Error('cancelled');
    }
    
    await fs.writeFile(filePath, scriptContent);
    return filePath;
  } catch (error) {
    console.error('Error saving PowerShell script:', error);
    throw error;
  }
}

async function loadPowerShellScript() {
  try {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Load PowerShell Script',
      defaultPath: path.join(os.homedir(), 'Documents'),
      filters: [
        { name: 'PowerShell Files', extensions: ['ps1'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (!filePaths || filePaths.length === 0) {
      throw new Error('cancelled');
    }
    
    const filePath = filePaths[0];
    const content = await fs.readFile(filePath, 'utf8');
    
    return { filePath, content };
  } catch (error) {
    console.error('Error loading PowerShell script:', error);
    throw error;
  }
}

async function browseForFile(options) {
  try {
    const { filePaths } = await dialog.showOpenDialog(options);
    
    if (!filePaths || filePaths.length === 0) {
      throw new Error('cancelled');
    }
    
    return filePaths[0];
  } catch (error) {
    console.error('Error browsing for file:', error);
    throw error;
  }
}

// Helper function to parse scheduled tasks output
function parseScheduledTasks(output) {
  const tasks = [];
  let currentTask = null;
  
  // Split output by lines
  const lines = output.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // New task starts with "TaskName:"
    if (trimmedLine.startsWith('TaskName:')) {
      if (currentTask) {
        tasks.push(currentTask);
      }
      
      currentTask = {
        name: trimmedLine.substring('TaskName:'.length).trim(),
        status: 'Unknown',
        trigger: 'Unknown',
        lastRun: 'Never'
      };
    } 
    // Parse status
    else if (trimmedLine.startsWith('Status:') && currentTask) {
      currentTask.status = trimmedLine.substring('Status:'.length).trim();
    }
    // Parse trigger
    else if (trimmedLine.startsWith('Scheduled Type:') && currentTask) {
      currentTask.trigger = trimmedLine.substring('Scheduled Type:'.length).trim();
    }
    // Parse last run time
    else if (trimmedLine.startsWith('Last Run Time:') && currentTask) {
      currentTask.lastRun = trimmedLine.substring('Last Run Time:'.length).trim();
      if (currentTask.lastRun === 'Never') {
        currentTask.lastRun = 'Never run';
      }
    }
  }
  
  // Add the last task
  if (currentTask) {
    tasks.push(currentTask);
  }
  
  return tasks;
}

module.exports = {
  getScheduledTasks,
  runScheduledTask,
  deleteScheduledTask,
  createScheduledTask,
  runBatchScript,
  saveBatchScript,
  loadBatchScript,
  runPowerShellScript,
  savePowerShellScript,
  loadPowerShellScript,
  browseForFile
};
