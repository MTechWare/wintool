/**
 * Plugin Validator
 * Comprehensive validation and security scanning for WinTool plugins
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class PluginValidator {
  constructor() {
    this.validationRules = {
      manifest: {
        required: ['name', 'description', 'version', 'author'],
        optional: ['icon', 'backend', 'permissions', 'dependencies'],
        types: {
          name: 'string',
          description: 'string',
          version: 'string',
          author: 'string',
          icon: 'string',
          backend: 'string',
          permissions: 'array',
          dependencies: 'object',
        },
      },
      files: {
        required: ['plugin.json', 'index.html', 'script.js'],
        optional: ['styles.css', 'backend.js', 'package.json', 'README.md'],
      },
      security: {
        dangerousPatterns: [
          { pattern: /eval\s*\(/, severity: 'high', message: 'Use of eval() function' },
          { pattern: /Function\s*\(/, severity: 'high', message: 'Use of Function constructor' },
          { pattern: /innerHTML\s*=/, severity: 'medium', message: 'Direct innerHTML assignment' },
          { pattern: /document\.write\s*\(/, severity: 'medium', message: 'Use of document.write()' },
          { pattern: /window\.location\s*=/, severity: 'medium', message: 'Direct location assignment' },
          {
            pattern: /require\s*\(['"](?!\.\/|\.\.\/)[^'"]*['"]\)/,
            severity: 'medium',
            message: 'Direct require() of external modules',
          },
          { pattern: /<script[^>]*src\s*=\s*['"]https?:\/\//, severity: 'high', message: 'External script inclusion' },
          { pattern: /on\w+\s*=\s*['"][^'"]*['"]/, severity: 'medium', message: 'Inline event handlers' },
          { pattern: /javascript\s*:/, severity: 'high', message: 'JavaScript protocol usage' },
        ],
        allowedGlobals: [
          'window',
          'document',
          'console',
          'setTimeout',
          'setInterval',
          'clearTimeout',
          'clearInterval',
          'JSON',
          'Date',
          'Math',
          'Array',
          'Object',
          'String',
          'Number',
          'Boolean',
        ],
      },
    };
  }

  /**
   * Validate a plugin completely
   */
  async validatePlugin(pluginPath) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      securityIssues: [],
      recommendations: [],
      metadata: {
        pluginPath,
        validatedAt: new Date().toISOString(),
        hash: null,
      },
    };

    try {
      // Check if plugin directory exists
      await fs.access(pluginPath);
    } catch (error) {
      result.errors.push('Plugin directory does not exist');
      result.isValid = false;
      return result;
    }

    // Validate file structure
    await this.validateFileStructure(pluginPath, result);

    // Validate manifest
    await this.validateManifest(pluginPath, result);

    // Validate HTML structure
    await this.validateHTML(pluginPath, result);

    // Validate JavaScript
    await this.validateJavaScript(pluginPath, result);

    // Validate CSS
    await this.validateCSS(pluginPath, result);

    // Security scan
    await this.performSecurityScan(pluginPath, result);

    // Calculate plugin hash
    result.metadata.hash = await this.calculatePluginHash(pluginPath);

    // Final validation status
    result.isValid =
      result.errors.length === 0 && result.securityIssues.filter(issue => issue.severity === 'high').length === 0;

    return result;
  }

  /**
   * Validate file structure
   */
  async validateFileStructure(pluginPath, result) {
    try {
      const files = await fs.readdir(pluginPath);

      // Check required files
      for (const requiredFile of this.validationRules.files.required) {
        if (!files.includes(requiredFile)) {
          result.errors.push(`Required file missing: ${requiredFile}`);
        }
      }

      // Check for suspicious files
      const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.ps1', '.sh'];
      const suspiciousFiles = files.filter(file => suspiciousExtensions.some(ext => file.toLowerCase().endsWith(ext)));

      if (suspiciousFiles.length > 0) {
        result.securityIssues.push({
          severity: 'high',
          message: `Suspicious executable files found: ${suspiciousFiles.join(', ')}`,
        });
      }

      // Check for hidden files
      const hiddenFiles = files.filter(file => file.startsWith('.') && file !== '.gitignore');
      if (hiddenFiles.length > 0) {
        result.warnings.push(`Hidden files found: ${hiddenFiles.join(', ')}`);
      }
    } catch (error) {
      result.errors.push(`Failed to read plugin directory: ${error.message}`);
    }
  }

  /**
   * Validate plugin manifest
   */
  async validateManifest(pluginPath, result) {
    const manifestPath = path.join(pluginPath, 'plugin.json');

    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      // Check required fields
      for (const field of this.validationRules.manifest.required) {
        if (!manifest[field]) {
          result.errors.push(`Required manifest field missing: ${field}`);
        }
      }

      // Validate field types
      for (const [field, expectedType] of Object.entries(this.validationRules.manifest.types)) {
        if (manifest[field] !== undefined) {
          const actualType = Array.isArray(manifest[field]) ? 'array' : typeof manifest[field];
          if (actualType !== expectedType) {
            result.errors.push(`Invalid type for ${field}: expected ${expectedType}, got ${actualType}`);
          }
        }
      }

      // Validate version format
      if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
        result.warnings.push('Version should follow semantic versioning (e.g., 1.0.0)');
      }

      // Validate icon format
      if (manifest.icon && !manifest.icon.startsWith('fas fa-') && !manifest.icon.startsWith('far fa-')) {
        result.warnings.push('Icon should be a Font Awesome class (e.g., "fas fa-cog")');
      }

      // Check for backend file if specified
      if (manifest.backend) {
        const backendPath = path.join(pluginPath, manifest.backend);
        try {
          await fs.access(backendPath);
        } catch (error) {
          result.errors.push(`Backend file specified but not found: ${manifest.backend}`);
        }
      }

      // Validate permissions
      if (manifest.permissions) {
        const validPermissions = [
          'storage.read',
          'storage.write',
          'notifications.show',
          'network.request',
          'fs.readUserFile',
          'system.info',
        ];

        for (const permission of manifest.permissions) {
          if (!validPermissions.includes(permission)) {
            result.warnings.push(`Unknown permission: ${permission}`);
          }
        }
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        result.errors.push('Invalid JSON in plugin.json');
      } else {
        result.errors.push(`Failed to read plugin.json: ${error.message}`);
      }
    }
  }

  /**
   * Validate HTML structure
   */
  async validateHTML(pluginPath, result) {
    const htmlPath = path.join(pluginPath, 'index.html');

    try {
      const htmlContent = await fs.readFile(htmlPath, 'utf8');

      // Check for DOCTYPE
      if (!htmlContent.includes('<!DOCTYPE html>')) {
        result.warnings.push('HTML file should include DOCTYPE declaration');
      }

      // Check for proper structure
      if (!htmlContent.includes('<html') || !htmlContent.includes('</html>')) {
        result.errors.push('HTML file must have proper html tags');
      }

      // Check for script inclusion
      if (!htmlContent.includes('<script src="script.js">')) {
        result.warnings.push('HTML file should include script.js');
      }

      // Security checks
      if (htmlContent.includes('<script>') && htmlContent.includes('eval(')) {
        result.securityIssues.push({
          severity: 'high',
          message: 'Inline script with eval() detected in HTML',
        });
      }

      // Check for external resources
      const externalResources = htmlContent.match(/(?:src|href)\s*=\s*['"]https?:\/\/[^'"]+['"]/g);
      if (externalResources) {
        result.securityIssues.push({
          severity: 'medium',
          message: `External resources detected: ${externalResources.length} found`,
        });
      }

      // Check for CSP
      if (!htmlContent.includes('Content-Security-Policy')) {
        result.recommendations.push('Consider adding Content-Security-Policy meta tag');
      }
    } catch (error) {
      // HTML file existence already checked in file structure validation
    }
  }

  /**
   * Validate JavaScript files
   */
  async validateJavaScript(pluginPath, result) {
    const jsFiles = ['script.js', 'backend.js'];

    for (const jsFile of jsFiles) {
      const jsPath = path.join(pluginPath, jsFile);

      try {
        const jsContent = await fs.readFile(jsPath, 'utf8');

        // Check for dangerous patterns
        for (const { pattern, severity, message } of this.validationRules.security.dangerousPatterns) {
          if (pattern.test(jsContent)) {
            result.securityIssues.push({
              severity,
              message: `${jsFile}: ${message}`,
              file: jsFile,
            });
          }
        }

        // Check for proper initialization (script.js only)
        if (jsFile === 'script.js') {
          if (!jsContent.includes('DOMContentLoaded')) {
            result.warnings.push('script.js should listen for DOMContentLoaded event');
          }

          if (!jsContent.includes('markTabAsReady')) {
            result.warnings.push('script.js should call markTabAsReady() when initialized');
          }

          if (!jsContent.includes('window.wintoolAPI')) {
            result.recommendations.push('Use window.wintoolAPI for better compatibility');
          }
        }

        // Check for proper module structure (backend.js only)
        if (jsFile === 'backend.js') {
          if (!jsContent.includes('module.exports')) {
            result.errors.push('backend.js must export a module');
          }

          if (!jsContent.includes('initialize')) {
            result.errors.push('backend.js must have an initialize function');
          }
        }

        // Check for syntax errors (basic check)
        try {
          new Function(jsContent);
        } catch (syntaxError) {
          result.errors.push(`Syntax error in ${jsFile}: ${syntaxError.message}`);
        }
      } catch (error) {
        if (jsFile === 'script.js') {
          // script.js is required, error already added in file structure validation
        } else {
          // backend.js is optional
        }
      }
    }
  }

  /**
   * Validate CSS
   */
  async validateCSS(pluginPath, result) {
    const cssPath = path.join(pluginPath, 'styles.css');

    try {
      const cssContent = await fs.readFile(cssPath, 'utf8');

      // Check for CSS variables usage
      if (!cssContent.includes('var(--')) {
        result.recommendations.push('Consider using CSS variables for theming consistency');
      }

      // Check for responsive design
      if (!cssContent.includes('@media')) {
        result.recommendations.push('Consider adding responsive design with media queries');
      }

      // Security check for CSS injection
      if (cssContent.includes('expression(') || cssContent.includes('javascript:')) {
        result.securityIssues.push({
          severity: 'high',
          message: 'Potentially dangerous CSS expressions detected',
        });
      }
    } catch (error) {
      // CSS file is optional
    }
  }

  /**
   * Perform comprehensive security scan
   */
  async performSecurityScan(pluginPath, result) {
    try {
      // Check for package.json and dependencies
      const packagePath = path.join(pluginPath, 'package.json');
      try {
        const packageContent = await fs.readFile(packagePath, 'utf8');
        const packageJson = JSON.parse(packageContent);

        if (packageJson.dependencies) {
          const dependencyCount = Object.keys(packageJson.dependencies).length;
          if (dependencyCount > 10) {
            result.warnings.push(`Large number of dependencies (${dependencyCount})`);
          }

          // Check for known problematic packages
          const problematicPackages = ['eval', 'vm2', 'child_process'];
          for (const pkg of problematicPackages) {
            if (packageJson.dependencies[pkg]) {
              result.securityIssues.push({
                severity: 'high',
                message: `Potentially dangerous dependency: ${pkg}`,
              });
            }
          }
        }
      } catch (error) {
        // package.json is optional
      }

      // Check file permissions and sizes
      const files = await this.getAllFiles(pluginPath);
      let totalSize = 0;

      for (const file of files) {
        const stats = await fs.stat(file);
        totalSize += stats.size;

        // Check for unusually large files
        if (stats.size > 1024 * 1024) {
          // 1MB
          result.warnings.push(
            `Large file detected: ${path.relative(pluginPath, file)} (${Math.round(stats.size / 1024)}KB)`
          );
        }
      }

      // Check total plugin size
      if (totalSize > 10 * 1024 * 1024) {
        // 10MB
        result.warnings.push(`Plugin size is large: ${Math.round(totalSize / (1024 * 1024))}MB`);
      }
    } catch (error) {
      result.warnings.push(`Security scan incomplete: ${error.message}`);
    }
  }

  /**
   * Calculate plugin hash for integrity verification
   */
  async calculatePluginHash(pluginPath) {
    try {
      const hash = crypto.createHash('sha256');
      const files = await this.getAllFiles(pluginPath);

      // Sort files for consistent hashing
      files.sort();

      for (const file of files) {
        // Skip certain files that might change
        const relativePath = path.relative(pluginPath, file);
        if (relativePath.includes('node_modules') || relativePath.startsWith('.')) {
          continue;
        }

        const content = await fs.readFile(file);
        hash.update(content);
      }

      return hash.digest('hex');
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all files in directory recursively
   */
  async getAllFiles(dirPath) {
    const files = [];

    async function traverse(currentPath) {
      const items = await fs.readdir(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          await traverse(itemPath);
        } else if (stats.isFile()) {
          files.push(itemPath);
        }
      }
    }

    await traverse(dirPath);
    return files;
  }

  /**
   * Generate validation report
   */
  generateReport(validationResult) {
    const report = {
      summary: {
        isValid: validationResult.isValid,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length,
        securityIssueCount: validationResult.securityIssues.length,
        recommendationCount: validationResult.recommendations.length,
      },
      details: validationResult,
    };

    return report;
  }
}

module.exports = PluginValidator;
