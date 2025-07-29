# WinTool Plugin CLI

A comprehensive command-line tool for WinTool plugin development, providing scaffolding, validation, security scanning, and development utilities.

## Features

- 🚀 **Plugin Scaffolding**: Generate plugin templates with different types (basic, advanced, minimal)
- 🔍 **Validation**: Comprehensive plugin structure and code validation
- 🔒 **Security Scanning**: Advanced security analysis and vulnerability detection
- 🧪 **Testing**: Automated testing framework for plugins
- 📦 **Building**: Package plugins for distribution
- 📋 **Listing**: View all installed plugins with metadata

## Installation

### Global Installation (Recommended)

```bash
cd cli
npm install -g .
```

After global installation, you can use the CLI from anywhere:

```bash
wintool-plugin-cli --help
```

### Local Usage

```bash
cd cli
npm install
node wintool-plugin-cli.js --help
```

## Commands

### Create Plugin

Generate a new plugin with customizable options:

```bash
# Basic plugin
wintool-plugin-cli create my-plugin

# Advanced plugin with backend support
wintool-plugin-cli create my-plugin --type=advanced --author="John Doe"

# Minimal plugin
wintool-plugin-cli create my-plugin --type=minimal

# Create in development directory
wintool-plugin-cli create my-plugin --dev
```

#### Create Options

- `--type=<type>`: Plugin type (`basic`, `advanced`, `minimal`)
- `--author=<name>`: Plugin author name
- `--description=<desc>`: Plugin description
- `--version=<version>`: Plugin version (default: 1.0.0)
- `--icon=<icon>`: Font Awesome icon class (default: fas fa-cog)
- `--dev`: Create in development directory

### Validate Plugin

Validate plugin structure, code quality, and security:

```bash
# Validate current directory
wintool-plugin-cli validate

# Validate specific plugin
wintool-plugin-cli validate ./my-plugin
```

Validation checks:
- ✅ Required files presence
- ✅ Manifest structure and fields
- ✅ HTML structure and security
- ✅ JavaScript syntax and patterns
- ✅ CSS best practices
- ✅ File permissions and sizes

### Security Scan

Perform comprehensive security analysis:

```bash
# Scan current directory
wintool-plugin-cli security

# Scan specific plugin
wintool-plugin-cli security ./my-plugin
```

Security checks:
- 🔒 Dangerous code patterns (eval, Function constructor)
- 🔒 External resource inclusion
- 🔒 Inline event handlers
- 🔒 Suspicious file types
- 🔒 Dependency analysis
- 🔒 File size and permissions

### Test Plugin

Run automated tests on plugin:

```bash
# Test current directory
wintool-plugin-cli test

# Test specific plugin
wintool-plugin-cli test ./my-plugin
```

Test categories:
- 🧪 Validation tests
- 🧪 Security tests
- 🧪 Functionality tests
- 🧪 Performance tests

### Build Plugin

Package plugin for distribution:

```bash
# Build current directory
wintool-plugin-cli build

# Build specific plugin
wintool-plugin-cli build ./my-plugin
```

Build process:
- ✅ Validation check
- ✅ Security scan
- 📦 ZIP package creation
- 🔐 Hash generation

### List Plugins

View all installed plugins:

```bash
wintool-plugin-cli list
```

Shows:
- 📦 Plugin name and version
- 👤 Author information
- 📝 Description
- 📍 Installation path
- ✅ Validation status

## Plugin Types

### Basic Plugin
- `plugin.json` - Manifest file
- `index.html` - UI structure
- `script.js` - Frontend logic
- `styles.css` - Styling

### Advanced Plugin
- All basic files plus:
- `backend.js` - Node.js backend logic
- `package.json` - Dependencies

### Minimal Plugin
- `plugin.json` - Manifest file
- `index.html` - UI structure
- `script.js` - Frontend logic

## Security Features

### Enhanced Sandboxing

The CLI integrates with WinTool's enhanced security system:

- **Resource Limits**: Memory and execution time constraints
- **API Access Control**: Restricted API access based on permissions
- **Network Security**: Domain whitelisting for HTTP requests
- **File System Protection**: Sandboxed file access
- **Code Analysis**: Static analysis for dangerous patterns

### Security Policies

Plugins are assigned security policies based on trust level:

- **Default**: Basic permissions, limited resources
- **Trusted**: Extended permissions, higher resource limits
- **Restricted**: Minimal permissions, strict limits

### Validation Rules

Comprehensive validation includes:

- **Structure**: Required files and proper organization
- **Manifest**: Valid JSON with required fields
- **Code Quality**: Syntax checking and best practices
- **Security**: Vulnerability scanning and pattern detection
- **Performance**: File size and resource usage analysis

## Development Workflow

1. **Create** a new plugin using the CLI
2. **Develop** your plugin functionality
3. **Validate** structure and code quality
4. **Test** functionality and security
5. **Build** for distribution
6. **Deploy** to WinTool

## Configuration

### Security Policies

Edit `src/config/security-policies.json` to customize security policies for specific plugins.

### Plugin Lists

Edit `src/config/plugin-lists.json` to manage trusted and blocked plugins.

## Examples

### Creating a Weather Plugin

```bash
wintool-plugin-cli create weather-widget \
  --type=advanced \
  --author="Weather Corp" \
  --description="Display current weather information" \
  --icon="fas fa-cloud-sun"
```

### Validating and Testing

```bash
cd weather-widget
wintool-plugin-cli validate
wintool-plugin-cli security
wintool-plugin-cli test
wintool-plugin-cli build
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Run as administrator or check file permissions
2. **Module Not Found**: Ensure all dependencies are installed with `npm install`
3. **Validation Errors**: Check plugin structure against documentation
4. **Security Issues**: Review code for dangerous patterns

### Debug Mode

Enable verbose logging:

```bash
DEBUG=1 wintool-plugin-cli validate ./my-plugin
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

GPL-3.0-or-later - See LICENSE file for details

## Support

- 📖 Documentation: See PLUGIN_DEVELOPMENT.md
- 🐛 Issues: GitHub Issues
- 💬 Discussions: GitHub Discussions
