#!/usr/bin/env node

/**
 * WinTool Production Validation Script
 * 
 * This script validates that the application is ready for production deployment
 * by checking security configurations, dependencies, and code quality.
 */

const fs = require('fs');
const path = require('path');

class ProductionValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.passed = [];
        this.projectRoot = path.join(__dirname, '..');
    }

    log(type, message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
        
        switch(type.toLowerCase()) {
            case 'error':
                this.errors.push(message);
                break;
            case 'warning':
                this.warnings.push(message);
                break;
            case 'pass':
                this.passed.push(message);
                break;
        }
    }

    checkFileExists(filePath, description) {
        const fullPath = path.join(this.projectRoot, filePath);
        if (fs.existsSync(fullPath)) {
            this.log('pass', `${description} exists: ${filePath}`);
            return true;
        } else {
            this.log('error', `${description} missing: ${filePath}`);
            return false;
        }
    }

    checkSecurityConfiguration() {
        this.log('info', 'Checking security configuration...');
        
        // Check main.js for security improvements
        const mainJsPath = path.join(this.projectRoot, 'src/main.js');
        if (fs.existsSync(mainJsPath)) {
            const content = fs.readFileSync(mainJsPath, 'utf8');
            
            // Check for shell: false usage
            if (content.includes('shell: false')) {
                this.log('pass', 'Shell execution disabled for security');
            } else if (content.includes('shell: true')) {
                this.log('error', 'Shell execution enabled - security risk');
            }
            
            // Check for input validation
            if (content.includes('allowedCommands') && content.includes('sanitizedCommand')) {
                this.log('pass', 'Input validation and command whitelisting implemented');
            } else {
                this.log('error', 'Input validation missing');
            }
            
            // Check for rate limiting
            if (content.includes('checkRateLimit')) {
                this.log('pass', 'Rate limiting implemented');
            } else {
                this.log('warning', 'Rate limiting not found');
            }
            
            // Check for security logging
            if (content.includes('logSecurityEvent')) {
                this.log('pass', 'Security logging implemented');
            } else {
                this.log('warning', 'Security logging not found');
            }
        }
    }

    checkDependencies() {
        this.log('info', 'Checking dependencies...');
        
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            // Check for minimal dependencies
            const deps = Object.keys(packageJson.dependencies || {});
            if (deps.length <= 5) {
                this.log('pass', `Minimal dependencies: ${deps.length} packages`);
            } else {
                this.log('warning', `Many dependencies: ${deps.length} packages`);
            }
            
            // Check for security-focused dependencies
            if (deps.includes('electron-store')) {
                this.log('pass', 'Secure settings storage (electron-store) included');
            }
            
            if (deps.includes('systeminformation')) {
                this.log('pass', 'System information library included');
            }
        }
    }

    checkBuildConfiguration() {
        this.log('info', 'Checking build configuration...');
        
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            if (packageJson.build) {
                // Check for proper app ID
                if (packageJson.build.appId) {
                    this.log('pass', `App ID configured: ${packageJson.build.appId}`);
                } else {
                    this.log('warning', 'App ID not configured');
                }
                
                // Check for icon
                if (packageJson.build.icon) {
                    this.log('pass', `Icon configured: ${packageJson.build.icon}`);
                } else {
                    this.log('warning', 'Icon not configured');
                }
                
                // Check for ASAR disabled (for PowerShell scripts)
                if (packageJson.build.asar === false) {
                    this.log('pass', 'ASAR disabled for script access');
                } else {
                    this.log('warning', 'ASAR enabled - may prevent script execution');
                }
            }
        }
    }

    checkRequiredFiles() {
        this.log('info', 'Checking required files...');
        
        const requiredFiles = [
            { path: 'src/main.js', desc: 'Main process file' },
            { path: 'src/index.html', desc: 'Main HTML file' },
            { path: 'src/preload.js', desc: 'Preload script' },
            { path: 'package.json', desc: 'Package configuration' },
            { path: 'src/assets/icon.ico', desc: 'Application icon' }
        ];
        
        requiredFiles.forEach(file => {
            this.checkFileExists(file.path, file.desc);
        });
    }

    checkPowerShellScripts() {
        this.log('info', 'Checking PowerShell scripts...');
        
        const scripts = [
            'scan-temp.ps1',
            'clean-temp.ps1',
            'get-disk-space.ps1'
        ];
        
        scripts.forEach(script => {
            this.checkFileExists(`src/${script}`, `PowerShell script: ${script}`);
        });
    }

    checkTabStructure() {
        this.log('info', 'Checking tab structure...');
        
        const tabsDir = path.join(this.projectRoot, 'src/tabs');
        if (fs.existsSync(tabsDir)) {
            const tabs = fs.readdirSync(tabsDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            this.log('pass', `Found ${tabs.length} tabs: ${tabs.join(', ')}`);
            
            // Check each tab has required files
            tabs.forEach(tab => {
                const tabDir = path.join(tabsDir, tab);
                const requiredTabFiles = ['config.json', 'index.html', 'script.js', 'styles.css'];
                
                requiredTabFiles.forEach(file => {
                    const filePath = path.join(tabDir, file);
                    if (fs.existsSync(filePath)) {
                        this.log('pass', `Tab ${tab} has ${file}`);
                    } else {
                        this.log('warning', `Tab ${tab} missing ${file}`);
                    }
                });
            });
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('WINTOOL PRODUCTION VALIDATION REPORT');
        console.log('='.repeat(60));
        
        console.log(`\n✅ PASSED: ${this.passed.length} checks`);
        console.log(`⚠️  WARNINGS: ${this.warnings.length} issues`);
        console.log(`❌ ERRORS: ${this.errors.length} critical issues`);
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            this.warnings.forEach(warning => console.log(`   - ${warning}`));
        }
        
        if (this.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.errors.forEach(error => console.log(`   - ${error}`));
        }
        
        console.log('\n' + '='.repeat(60));
        
        if (this.errors.length === 0) {
            console.log('🎉 PRODUCTION READY! All critical checks passed.');
            if (this.warnings.length > 0) {
                console.log('💡 Consider addressing warnings for optimal production deployment.');
            }
            return true;
        } else {
            console.log('🚫 NOT PRODUCTION READY! Please fix critical errors before deployment.');
            return false;
        }
    }

    async validate() {
        console.log('Starting WinTool production validation...\n');
        
        this.checkRequiredFiles();
        this.checkSecurityConfiguration();
        this.checkDependencies();
        this.checkBuildConfiguration();
        this.checkPowerShellScripts();
        this.checkTabStructure();
        
        return this.generateReport();
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new ProductionValidator();
    validator.validate().then(isReady => {
        process.exit(isReady ? 0 : 1);
    });
}

module.exports = ProductionValidator;
