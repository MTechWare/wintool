
/**
 * WinTool BETA Plugin CLI - A command-line tool for plugin development
 * Provides scaffolding, validation, and security enhancements for WinTool plugins
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// CLI Configuration
const CLI_VERSION = '1.0.1';
const PLUGIN_DIR = path.join(process.env.LOCALAPPDATA || process.env.APPDATA, 'MTechWare', 'WinTool', 'Plugins');
const DEV_PLUGIN_DIR = path.join(__dirname, '..', 'src', 'plugins');

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Utility functions
const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    title: (msg) => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`),
    subtitle: (msg) => console.log(`${colors.magenta}${msg}${colors.reset}`)
};

// Plugin template types
const PLUGIN_TYPES = {
    basic: {
        name: 'Basic Plugin',
        description: 'Simple frontend-only plugin with HTML, CSS, and JavaScript',
        files: ['plugin.json', 'index.html', 'script.js', 'styles.css']
    },
    advanced: {
        name: 'Advanced Plugin',
        description: 'Plugin with backend support and Node.js integration',
        files: ['plugin.json', 'index.html', 'script.js', 'styles.css', 'backend.js', 'package.json']
    },
    minimal: {
        name: 'Minimal Plugin',
        description: 'Bare minimum plugin structure',
        files: ['plugin.json', 'index.html', 'script.js']
    }
};

// Security sandbox configuration
const SANDBOX_CONFIG = {
    allowedAPIs: [
        'wintoolAPI.store',
        'wintoolAPI.tabs',
        'wintoolAPI.invoke',
        'wintoolAPI.notifications'
    ],
    restrictedAPIs: [
        'require',
        'process',
        'fs',
        'child_process',
        'os'
    ],
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    maxExecutionTime: 30000, // 30 seconds
    allowedDomains: [], // Configurable per plugin
    cspPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
};

class PluginCLI {
    constructor() {
        this.commands = {
            create: this.createPlugin.bind(this),
            validate: this.validatePlugin.bind(this),
            build: this.buildPlugin.bind(this),
            test: this.testPlugin.bind(this),
            security: this.securityScan.bind(this),
            list: this.listPlugins.bind(this),
            help: this.showHelp.bind(this),
            version: this.showVersion.bind(this)
        };
    }

    async run(args) {
        const command = args[2] || 'help';
        const commandArgs = args.slice(3);

        if (this.commands[command]) {
            try {
                await this.commands[command](commandArgs);
            } catch (error) {
                log.error(`Command failed: ${error.message}`);
                process.exit(1);
            }
        } else {
            log.error(`Unknown command: ${command}`);
            this.showHelp();
            process.exit(1);
        }
    }

    async createPlugin(args) {
        log.title('🚀 WinTool Plugin Generator');
        
        const options = this.parseCreateArgs(args);
        
        if (!options.name) {
            log.error('Plugin name is required. Use: create <plugin-name> [options]');
            return;
        }

        const pluginPath = path.join(options.dev ? DEV_PLUGIN_DIR : PLUGIN_DIR, options.name);
        
        // Check if plugin already exists
        try {
            await fs.access(pluginPath);
            log.error(`Plugin "${options.name}" already exists at ${pluginPath}`);
            return;
        } catch (e) {
            // Plugin doesn't exist, which is good
        }

        log.info(`Creating ${options.type} plugin: ${options.name}`);
        log.info(`Location: ${pluginPath}`);

        await this.generatePluginFiles(pluginPath, options);
        
        if (options.type === 'advanced') {
            await this.installDependencies(pluginPath);
        }

        log.success(`Plugin "${options.name}" created successfully!`);
        log.info('Next steps:');
        log.info(`  1. cd "${pluginPath}"`);
        log.info('  2. Edit the plugin files to implement your functionality');
        log.info('  3. Run "wintool-plugin-cli validate" to check your plugin');
        log.info('  4. Test your plugin in WinTool');
    }

    parseCreateArgs(args) {
        const options = {
            name: args[0],
            type: 'basic',
            author: 'Unknown',
            description: 'A WinTool plugin',
            version: '1.0.0',
            icon: 'fas fa-cog',
            dev: false
        };

        for (let i = 1; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith('--type=')) {
                options.type = arg.split('=')[1];
            } else if (arg.startsWith('--author=')) {
                options.author = arg.split('=')[1];
            } else if (arg.startsWith('--description=')) {
                options.description = arg.split('=')[1];
            } else if (arg.startsWith('--version=')) {
                options.version = arg.split('=')[1];
            } else if (arg.startsWith('--icon=')) {
                options.icon = arg.split('=')[1];
            } else if (arg === '--dev') {
                options.dev = true;
            }
        }

        if (!PLUGIN_TYPES[options.type]) {
            log.warning(`Unknown plugin type: ${options.type}. Using 'basic' instead.`);
            options.type = 'basic';
        }

        return options;
    }

    async generatePluginFiles(pluginPath, options) {
        await fs.mkdir(pluginPath, { recursive: true });

        const templateType = PLUGIN_TYPES[options.type];
        
        for (const fileName of templateType.files) {
            const content = await this.generateFileContent(fileName, options);
            await fs.writeFile(path.join(pluginPath, fileName), content);
            log.info(`Generated: ${fileName}`);
        }
    }

    async generateFileContent(fileName, options) {
        switch (fileName) {
            case 'plugin.json':
                return this.generatePluginManifest(options);
            case 'index.html':
                return this.generateIndexHTML(options);
            case 'script.js':
                return this.generateScriptJS(options);
            case 'styles.css':
                return this.generateStylesCSS(options);
            case 'backend.js':
                return this.generateBackendJS(options);
            case 'package.json':
                return this.generatePackageJSON(options);
            default:
                return '';
        }
    }

    generatePluginManifest(options) {
        const manifest = {
            name: options.name,
            description: options.description,
            version: options.version,
            author: options.author,
            icon: options.icon
        };

        if (options.type === 'advanced') {
            manifest.backend = 'backend.js';
        }

        return JSON.stringify(manifest, null, 2);
    }

    generateIndexHTML(options) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.name}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="plugin-container">
        <div class="plugin-header">
            <i class="${options.icon}"></i>
            <h2>${options.name}</h2>
        </div>
        
        <div class="plugin-content">
            <p>${options.description}</p>
            
            <div class="form-group">
                <label for="sample-input">Sample Input:</label>
                <input type="text" id="sample-input" class="form-input" placeholder="Enter something...">
            </div>
            
            <div class="plugin-actions">
                <button id="action-btn" class="btn btn-primary">
                    <i class="fas fa-play"></i> Execute Action
                </button>
            </div>
            
            <div id="result-area" class="result-area" style="display: none;">
                <h4>Result:</h4>
                <div id="result-content"></div>
            </div>
        </div>
    </div>
    
    <script src="script.js"></script>
</body>
</html>`;
    }

    generateScriptJS(options) {
        const hasBackend = options.type === 'advanced';
        
        return `/**
 * ${options.name} - Plugin Script
 * Generated by WinTool Plugin CLI
 *
 * IMPORTANT: WinTool plugins work like tabs and must follow specific patterns:
 * 1. Use container.querySelector() instead of document.getElementById()
 * 2. Initialize immediately when script loads (not on DOMContentLoaded)
 * 3. Find your container using tabContainer or data-tab selector
 * 4. Call window.markTabAsReady(tabId) when initialization is complete
 */

console.log('=== ${options.name} Plugin JavaScript loaded! ===');

// Find the container (similar to how other tabs do it)
let container = null;
if (typeof tabContainer !== 'undefined') {
    container = tabContainer;
    console.log('Using provided tabContainer');
}
if (!container) {
    container = document.querySelector('[data-tab="${options.name.toLowerCase().replace(/\\s+/g, '-')}"]');
    console.log('Found container via data-tab selector');
}

if (container) {
    console.log('Container found, initializing plugin');
    initializePlugin(container);
} else {
    console.error(\`[WinToolPluginCLI] No container found for \${options.name}, cannot initialize.\`);
}

function initializePlugin(container) {
    console.log('Initializing ${options.name}...');

    // IMPORTANT: Use container.querySelector() to find elements within your plugin
    // This ensures your plugin doesn't interfere with other tabs/plugins
    const actionBtn = container.querySelector('#action-btn');
    const sampleInput = container.querySelector('#sample-input');
    const resultArea = container.querySelector('#result-area');
    const resultContent = container.querySelector('#result-content');

    console.log('Elements found:', {
        actionBtn: !!actionBtn,
        sampleInput: !!sampleInput,
        resultArea: !!resultArea,
        resultContent: !!resultContent
    });

    // BUTTON HANDLING: Use addEventListener for button clicks
    // Alternative: You can also use onclick="functionName()" in HTML and make functions global with window.functionName
    if (actionBtn) {
        console.log('Adding click listener to action button');
        actionBtn.addEventListener('click', async function() {
            console.log('Button clicked!');
            const inputValue = sampleInput.value.trim();
            
            if (!inputValue) {
                showNotification('Please enter a value', 'warning');
                return;
            }
            
            try {
                actionBtn.disabled = true;
                actionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                
                ${hasBackend ? `
                // Call backend handler
                const result = await window.wintoolAPI.invoke('${options.name.toLowerCase()}-action', inputValue);
                displayResult(result);
                ` : `
                console.log('Processing input:', inputValue);
                // Frontend-only processing
                const result = processInput(inputValue);
                console.log('Processing result:', result);
                displayResult(result, container);
                `}
                
            } catch (error) {
                console.error(\`[WinToolPluginCLI] Action failed: \${error.message}\`);
                showNotification('Action failed: ' + error.message, 'error');
            } finally {
                actionBtn.disabled = false;
                actionBtn.innerHTML = '<i class="fas fa-play"></i> Execute Action';
            }
        });
    } else {
        console.error('[WinToolPluginCLI] Action button not found!');
    }

    // IMPORTANT: Signal that this tab is ready after initialization
    // This tells WinTool that your plugin has finished loading
    if (window.markTabAsReady && typeof tabId !== 'undefined') {
        console.log('Marking tab as ready:', tabId);
        window.markTabAsReady(tabId);
    } else {
        console.warn('[WinToolPluginCLI] window.markTabAsReady not available or tabId undefined');
    }
}

${hasBackend ? '' : `
function processInput(input) {
    // Add your frontend processing logic here
    return {
        input: input,
        processed: input.toUpperCase(),
        timestamp: new Date().toISOString()
    };
}
`}

// IMPORTANT: Always pass the container to functions that need to find elements
// This ensures proper scoping and prevents conflicts with other plugins
function displayResult(result, container) {
    const resultArea = container.querySelector('#result-area');
    const resultContent = container.querySelector('#result-content');
    
    if (resultContent) {
        resultContent.innerHTML = \`
            <div class="result-item">
                <strong>Input:</strong> \${result.input || 'N/A'}
            </div>
            <div class="result-item">
                <strong>Result:</strong> \${result.processed || result.message || 'No result'}
            </div>
            <div class="result-item">
                <strong>Timestamp:</strong> \${result.timestamp || new Date().toISOString()}
            </div>
        \`;
        
        resultArea.style.display = 'block';
    }
}

function showNotification(message, type = 'info') {
    if (window.wintoolAPI && window.wintoolAPI.notifications) {
        window.wintoolAPI.notifications.show(message, type);
    } else {
        console.log(\`[\${type.toUpperCase()}] \${message}\`);
    }
}

// Plugin cleanup
window.addEventListener('beforeunload', function() {
    console.log('${options.name} plugin unloading');
});`;
    }

    generateStylesCSS(options) {
        return `/**
 * ${options.name} - Plugin Styles
 * Generated by WinTool Plugin CLI
 */

.plugin-container {
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
}

.plugin-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--border-color, #e0e0e0);
}

.plugin-header i {
    font-size: 24px;
    color: var(--primary-color, #007acc);
}

.plugin-header h2 {
    margin: 0;
    color: var(--text-primary, #333);
    font-weight: 600;
}

.plugin-content {
    background: var(--background-card, #ffffff);
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-secondary, #666);
}

.form-input {
    width: 100%;
    padding: 12px;
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s ease;
}

.form-input:focus {
    outline: none;
    border-color: var(--primary-color, #007acc);
}

.plugin-actions {
    margin: 24px 0;
}

.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.btn-primary {
    background: var(--primary-color, #007acc);
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background: var(--primary-color-hover, #005a9e);
    transform: translateY(-1px);
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.result-area {
    margin-top: 24px;
    padding: 20px;
    background: var(--background-secondary, #f8f9fa);
    border-radius: 6px;
    border-left: 4px solid var(--success-color, #28a745);
}

.result-area h4 {
    margin: 0 0 16px 0;
    color: var(--text-primary, #333);
}

.result-item {
    margin-bottom: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-light, #f0f0f0);
}

.result-item:last-child {
    border-bottom: none;
    margin-bottom: 0;
}

.result-item strong {
    color: var(--text-primary, #333);
    margin-right: 8px;
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
    .plugin-container {
        color: var(--text-primary, #e0e0e0);
    }

    .plugin-content {
        background: var(--background-card, #2d2d2d);
    }

    .form-input {
        background: var(--background-input, #3d3d3d);
        color: var(--text-primary, #e0e0e0);
        border-color: var(--border-color, #555);
    }

    .result-area {
        background: var(--background-secondary, #3d3d3d);
    }
}`;
    }

    generateBackendJS(options) {
        return `/**
 * ${options.name} - Backend Script
 * Generated by WinTool Plugin CLI
 */

module.exports = {
    initialize: (api) => {
        console.log('Initializing ${options.name} backend...');

        // Register handlers for frontend communication
        api.registerHandler('${options.name.toLowerCase()}-action', async (input) => {
            try {
                console.log(\`Processing input: \${input}\`);

                // Add your backend processing logic here
                const result = await processInput(input);

                return {
                    success: true,
                    input: input,
                    processed: result,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                console.error(\`[WinToolPluginCLI] Backend processing error: \${error.message}\`);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Example: Register a data retrieval handler
        api.registerHandler('${options.name.toLowerCase()}-get-data', async () => {
            try {
                const store = await api.getStore();
                const data = store.get('${options.name.toLowerCase()}-data', {});

                return {
                    success: true,
                    data: data
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // Example: Register a data saving handler
        api.registerHandler('${options.name.toLowerCase()}-save-data', async (data) => {
            try {
                const store = await api.getStore();
                store.set('${options.name.toLowerCase()}-data', data);

                return {
                    success: true,
                    message: 'Data saved successfully'
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        console.log('${options.name} backend initialized successfully');
    }
};

/**
 * Process input data - customize this function for your plugin's needs
 */
async function processInput(input) {
    // Example processing: reverse the string and add timestamp
    const reversed = input.split('').reverse().join('');
    const processed = \`\${reversed} (processed at \${new Date().toLocaleTimeString()})\`;

    // Simulate async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    return processed;
}`;
    }

    generatePackageJSON(options) {
        return JSON.stringify({
            name: options.name.toLowerCase().replace(/\s+/g, '-'),
            version: options.version,
            description: options.description,
            main: 'backend.js',
            author: options.author,
            license: 'MIT',
            dependencies: {
                // Add common dependencies that plugins might need
            },
            devDependencies: {
                // Add development dependencies
            },
            scripts: {
                test: 'echo "No tests specified"',
                lint: 'echo "No linting configured"'
            },
            keywords: ['wintool', 'plugin'],
            wintool: {
                type: 'plugin',
                version: '1.0.0'
            }
        }, null, 2);
    }

    async installDependencies(pluginPath) {
        log.info('Installing dependencies...');
        try {
            execSync('npm install', {
                cwd: pluginPath,
                stdio: 'inherit'
            });
            log.success('Dependencies installed successfully');
        } catch (error) {
            log.warning('Failed to install dependencies automatically');
            log.info('You can install them manually by running "npm install" in the plugin directory');
        }
    }

    showHelp() {
        log.title('🔧 WinTool Plugin CLI');
        console.log(`Version ${CLI_VERSION}\n`);

        log.subtitle('Usage:');
        console.log('  wintool-plugin-cli <command> [options]\n');

        log.subtitle('Commands:');
        console.log('  create <name>     Create a new plugin');
        console.log('  validate [path]   Validate plugin structure and security');
        console.log('  build [path]      Build and package plugin');
        console.log('  test [path]       Run plugin tests');
        console.log('  security [path]   Run security scan on plugin');
        console.log('  list              List all installed plugins');
        console.log('  help              Show this help message');
        console.log('  version           Show version information\n');

        log.subtitle('Create Options:');
        console.log('  --type=<type>         Plugin type (basic, advanced, minimal)');
        console.log('  --author=<name>       Plugin author name');
        console.log('  --description=<desc>  Plugin description');
        console.log('  --version=<version>   Plugin version');
        console.log('  --icon=<icon>         Font Awesome icon class');
        console.log('  --dev                 Create in development directory\n');

        log.subtitle('Examples:');
        console.log('  wintool-plugin-cli create my-plugin');
        console.log('  wintool-plugin-cli create my-plugin --type=advanced --author="John Doe"');
        console.log('  wintool-plugin-cli validate ./my-plugin');
        console.log('  wintool-plugin-cli security ./my-plugin');
    }

    async validatePlugin(args) {
        const pluginPath = args[0] || process.cwd();

        log.title('🔍 Plugin Validation');
        log.info(`Validating plugin at: ${pluginPath}`);

        const validation = await this.runValidation(pluginPath);

        if (validation.isValid) {
            log.success('Plugin validation passed!');
        } else {
            log.error('Plugin validation failed!');
            validation.errors.forEach(error => log.error(`  • ${error}`));
        }

        if (validation.warnings.length > 0) {
            log.warning('Validation warnings:');
            validation.warnings.forEach(warning => log.warning(`  • ${warning}`));
        }

        return validation.isValid;
    }

    async runValidation(pluginPath) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };

        try {
            // Check if directory exists
            await fs.access(pluginPath);
        } catch (e) {
            validation.errors.push('Plugin directory does not exist');
            validation.isValid = false;
            return validation;
        }

        // Validate required files
        const requiredFiles = ['plugin.json', 'index.html', 'script.js'];
        for (const file of requiredFiles) {
            try {
                await fs.access(path.join(pluginPath, file));
            } catch (e) {
                validation.errors.push(`Required file missing: ${file}`);
                validation.isValid = false;
            }
        }

        // Validate plugin.json
        try {
            const manifestPath = path.join(pluginPath, 'plugin.json');
            const manifestContent = await fs.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);

            const requiredFields = ['name', 'description', 'version', 'author', 'icon'];
            for (const field of requiredFields) {
                if (!manifest[field]) {
                    validation.warnings.push(`Recommended field missing in plugin.json: ${field}`);
                }
            }

            // Validate icon format
            if (manifest.icon && !manifest.icon.startsWith('fas fa-') && !manifest.icon.startsWith('far fa-')) {
                validation.warnings.push('Icon should be a Font Awesome class (e.g., "fas fa-cog")');
            }

        } catch (e) {
            validation.errors.push('Invalid plugin.json format');
            validation.isValid = false;
        }

        // Check for backend.js if specified
        try {
            const manifestPath = path.join(pluginPath, 'plugin.json');
            const manifestContent = await fs.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);

            if (manifest.backend) {
                try {
                    await fs.access(path.join(pluginPath, manifest.backend));
                } catch (e) {
                    validation.errors.push(`Backend file specified but not found: ${manifest.backend}`);
                    validation.isValid = false;
                }
            }
        } catch (e) {
            // Already handled above
        }

        // Validate HTML structure
        try {
            const htmlPath = path.join(pluginPath, 'index.html');
            const htmlContent = await fs.readFile(htmlPath, 'utf8');

            if (!htmlContent.includes('<!DOCTYPE html>')) {
                validation.warnings.push('HTML file should include DOCTYPE declaration');
            }

            if (!htmlContent.includes('<script src="script.js">')) {
                validation.warnings.push('HTML file should include script.js');
            }

        } catch (e) {
            // File existence already checked above
        }

        return validation;
    }

    async securityScan(args) {
        const pluginPath = args[0] || process.cwd();

        log.title('🔒 Security Scan');
        log.info(`Scanning plugin at: ${pluginPath}`);

        const scanResult = await this.runSecurityScan(pluginPath);

        if (scanResult.isSecure) {
            log.success('Security scan passed!');
        } else {
            log.error('Security issues found!');
            scanResult.issues.forEach(issue => {
                log.error(`  • ${issue.severity.toUpperCase()}: ${issue.message}`);
            });
        }

        if (scanResult.recommendations.length > 0) {
            log.info('Security recommendations:');
            scanResult.recommendations.forEach(rec => log.info(`  • ${rec}`));
        }

        return scanResult.isSecure;
    }

    async runSecurityScan(pluginPath) {
        const scanResult = {
            isSecure: true,
            issues: [],
            recommendations: []
        };

        try {
            // Scan JavaScript files for dangerous patterns
            const jsFiles = ['script.js', 'backend.js'];

            for (const jsFile of jsFiles) {
                const jsPath = path.join(pluginPath, jsFile);
                try {
                    const jsContent = await fs.readFile(jsPath, 'utf8');

                    // Check for dangerous functions
                    const dangerousPatterns = [
                        { pattern: /eval\s*\(/, message: 'Use of eval() function detected', severity: 'high' },
                        { pattern: /Function\s*\(/, message: 'Use of Function constructor detected', severity: 'high' },
                        { pattern: /innerHTML\s*=/, message: 'Direct innerHTML assignment detected', severity: 'medium' },
                        { pattern: /document\.write\s*\(/, message: 'Use of document.write() detected', severity: 'medium' },
                        { pattern: /window\.location\s*=/, message: 'Direct location assignment detected', severity: 'medium' },
                        { pattern: /require\s*\(/, message: 'Direct require() usage detected (use api.require instead)', severity: 'medium' }
                    ];

                    for (const { pattern, message, severity } of dangerousPatterns) {
                        if (pattern.test(jsContent)) {
                            scanResult.issues.push({ message: `${jsFile}: ${message}`, severity });
                            if (severity === 'high') {
                                scanResult.isSecure = false;
                            }
                        }
                    }

                    // Check for proper API usage
                    if (jsContent.includes('wintoolAPI') && !jsContent.includes('window.wintoolAPI')) {
                        scanResult.recommendations.push('Use window.wintoolAPI for better compatibility');
                    }

                } catch (e) {
                    // File doesn't exist, skip
                }
            }

            // Check HTML for security issues
            try {
                const htmlPath = path.join(pluginPath, 'index.html');
                const htmlContent = await fs.readFile(htmlPath, 'utf8');

                if (htmlContent.includes('<script>') && htmlContent.includes('eval(')) {
                    scanResult.issues.push({
                        message: 'Inline script with eval() detected',
                        severity: 'high'
                    });
                    scanResult.isSecure = false;
                }

                if (!htmlContent.includes('Content-Security-Policy')) {
                    scanResult.recommendations.push('Consider adding Content-Security-Policy meta tag');
                }

            } catch (e) {
                // File doesn't exist, skip
            }

        } catch (error) {
            scanResult.issues.push({
                message: `Scan error: ${error.message}`,
                severity: 'high'
            });
            scanResult.isSecure = false;
        }

        return scanResult;
    }

    async listPlugins(args) {
        log.title('📦 Installed Plugins');

        const directories = [PLUGIN_DIR, DEV_PLUGIN_DIR];

        for (const dir of directories) {
            const isDevDir = dir === DEV_PLUGIN_DIR;
            log.subtitle(isDevDir ? 'Development Plugins:' : 'User Plugins:');

            try {
                await fs.access(dir);
                const plugins = await fs.readdir(dir);

                if (plugins.length === 0) {
                    log.info('  No plugins found');
                    continue;
                }

                for (const pluginName of plugins) {
                    const pluginPath = path.join(dir, pluginName);
                    const stat = await fs.stat(pluginPath);

                    if (stat.isDirectory()) {
                        try {
                            const manifestPath = path.join(pluginPath, 'plugin.json');
                            const manifestContent = await fs.readFile(manifestPath, 'utf8');
                            const manifest = JSON.parse(manifestContent);

                            console.log(`  ${colors.green}✓${colors.reset} ${manifest.name || pluginName} (v${manifest.version || 'N/A'})`);
                            console.log(`    ${colors.cyan}Author:${colors.reset} ${manifest.author || 'Unknown'}`);
                            console.log(`    ${colors.cyan}Description:${colors.reset} ${manifest.description || 'No description'}`);
                            console.log(`    ${colors.cyan}Path:${colors.reset} ${pluginPath}`);
                            console.log('');
                        } catch (e) {
                            console.log(`  ${colors.yellow}⚠${colors.reset} ${pluginName} (invalid manifest)`);
                            console.log(`    ${colors.cyan}Path:${colors.reset} ${pluginPath}`);
                            console.log('');
                        }
                    }
                }
            } catch (e) {
                log.info(`  Directory not found: ${dir}`);
            }
        }
    }

    async buildPlugin(args) {
        const pluginPath = args[0] || process.cwd();

        log.title('🔨 Building Plugin');
        log.info(`Building plugin at: ${pluginPath}`);

        // First validate the plugin
        const validation = await this.runValidation(pluginPath);
        if (!validation.isValid) {
            log.error('Plugin validation failed. Fix errors before building.');
            return false;
        }

        // Run security scan
        const securityScan = await this.runSecurityScan(pluginPath);
        if (!securityScan.isSecure) {
            log.error('Security scan failed. Fix security issues before building.');
            return false;
        }

        try {
            const manifestPath = path.join(pluginPath, 'plugin.json');
            const manifestContent = await fs.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);

            const pluginName = manifest.name || path.basename(pluginPath);
            const outputPath = path.join(pluginPath, '..', `${pluginName.replace(/\s+/g, '-')}.zip`);

            // Create zip package
            await this.createPluginPackage(pluginPath, outputPath);

            log.success(`Plugin built successfully: ${outputPath}`);

            // Generate hash for verification
            const hash = await this.calculateDirectoryHash(pluginPath);
            log.info(`Plugin hash: ${hash}`);

            return true;
        } catch (error) {
            log.error(`Build failed: ${error.message}`);
            return false;
        }
    }

    async createPluginPackage(pluginPath, outputPath) {
        const archiver = require('archiver');
        const output = require('fs').createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
            output.on('close', () => {
                log.info(`Package created: ${archive.pointer()} bytes`);
                resolve();
            });

            archive.on('error', reject);
            archive.pipe(output);

            // Add all files except node_modules and build artifacts
            archive.glob('**/*', {
                cwd: pluginPath,
                ignore: ['node_modules/**', '*.zip', '.git/**', '.DS_Store', 'Thumbs.db']
            });

            archive.finalize();
        });
    }

    async testPlugin(args) {
        const pluginPath = args[0] || process.cwd();

        log.title('🧪 Testing Plugin');
        log.info(`Testing plugin at: ${pluginPath}`);

        let allTestsPassed = true;

        // Run validation tests
        log.subtitle('Running validation tests...');
        const validation = await this.runValidation(pluginPath);
        if (validation.isValid) {
            log.success('✓ Validation tests passed');
        } else {
            log.error('✗ Validation tests failed');
            allTestsPassed = false;
        }

        // Run security tests
        log.subtitle('Running security tests...');
        const security = await this.runSecurityScan(pluginPath);
        if (security.isSecure) {
            log.success('✓ Security tests passed');
        } else {
            log.error('✗ Security tests failed');
            allTestsPassed = false;
        }

        // Run functionality tests
        log.subtitle('Running functionality tests...');
        const functionality = await this.runFunctionalityTests(pluginPath);
        if (functionality.passed) {
            log.success('✓ Functionality tests passed');
        } else {
            log.error('✗ Functionality tests failed');
            allTestsPassed = false;
        }

        // Summary
        if (allTestsPassed) {
            log.success('🎉 All tests passed!');
        } else {
            log.error('❌ Some tests failed. Please fix the issues and try again.');
        }

        return allTestsPassed;
    }

    async runFunctionalityTests(pluginPath) {
        const testResult = {
            passed: true,
            issues: []
        };

        try {
            // Test 1: Check if script.js has proper initialization
            const scriptPath = path.join(pluginPath, 'script.js');
            const scriptContent = await fs.readFile(scriptPath, 'utf8');

            if (!scriptContent.includes('DOMContentLoaded')) {
                testResult.issues.push('Script should listen for DOMContentLoaded event');
                testResult.passed = false;
            }

            if (!scriptContent.includes('markTabAsReady')) {
                testResult.issues.push('Script should call markTabAsReady() when initialized');
                testResult.passed = false;
            }

            // Test 2: Check if backend.js has proper structure (if exists)
            const backendPath = path.join(pluginPath, 'backend.js');
            try {
                const backendContent = await fs.readFile(backendPath, 'utf8');

                if (!backendContent.includes('module.exports')) {
                    testResult.issues.push('Backend should export module with initialize function');
                    testResult.passed = false;
                }

                if (!backendContent.includes('initialize')) {
                    testResult.issues.push('Backend should have initialize function');
                    testResult.passed = false;
                }
            } catch (e) {
                // Backend file doesn't exist, which is fine
            }

            // Test 3: Check CSS for responsive design
            const cssPath = path.join(pluginPath, 'styles.css');
            try {
                const cssContent = await fs.readFile(cssPath, 'utf8');

                if (!cssContent.includes('var(--')) {
                    testResult.issues.push('CSS should use CSS variables for theming');
                    testResult.passed = false;
                }
            } catch (e) {
                // CSS file is optional
            }

        } catch (error) {
            testResult.issues.push(`Test error: ${error.message}`);
            testResult.passed = false;
        }

        if (testResult.issues.length > 0) {
            testResult.issues.forEach(issue => log.warning(`  • ${issue}`));
        }

        return testResult;
    }

    async calculateDirectoryHash(dirPath) {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256');

        const files = await this.getAllFiles(dirPath);
        files.sort(); // Ensure consistent ordering

        for (const file of files) {
            const content = await fs.readFile(file, 'utf8');
            hash.update(content);
        }

        return hash.digest('hex');
    }

    async getAllFiles(dirPath) {
        const files = [];

        async function traverse(currentPath) {
            const items = await fs.readdir(currentPath);

            for (const item of items) {
                const itemPath = path.join(currentPath, item);
                const stat = await fs.stat(itemPath);

                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    await traverse(itemPath);
                } else if (stat.isFile() && !item.startsWith('.')) {
                    files.push(itemPath);
                }
            }
        }

        await traverse(dirPath);
        return files;
    }

    showVersion() {
        log.title(`WinTool Plugin CLI v${CLI_VERSION}`);
        console.log('A command-line tool for WinTool plugin development');
        console.log('Copyright (c) 2024 MTech\n');
    }
}

// Main execution
if (require.main === module) {
    const cli = new PluginCLI();
    cli.run(process.argv).catch(error => {
        log.error(`CLI Error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = PluginCLI;
