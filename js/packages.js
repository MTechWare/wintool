/**
 * WinTool - Packages Module
 * Handles package management functionality
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * Get the list of available packages
 */
async function getPackages() {
    try {
        // Read packages from applications.json
        const packagesPath = path.join(__dirname, '..', 'applications.json');
        if (!fs.existsSync(packagesPath)) {
            return { packages: [], error: 'Applications database not found' };
        }
        
        const packagesData = fs.readFileSync(packagesPath, 'utf8');
        const packagesObj = JSON.parse(packagesData);
        
        // Convert the object to an array of packages with IDs
        const packages = Object.keys(packagesObj).map(key => {
            return {
                id: key,
                name: packagesObj[key].content || key,
                description: packagesObj[key].description || '',
                category: packagesObj[key].category?.toLowerCase() || 'other',
                icon: getCategoryIcon(packagesObj[key].category),
                link: packagesObj[key].link || '',
                winget: packagesObj[key].winget || '',
                choco: packagesObj[key].choco || ''
            };
        });
        
        return { packages };
    } catch (error) {
        console.error('Error getting packages:', error);
        return { packages: [], error: error.message };
    }
}

/**
 * Get an appropriate icon for a package category
 * @param {string} category - The package category
 * @returns {string} - Font Awesome icon class
 */
function getCategoryIcon(category) {
    if (!category) return 'fa-box';
    
    const categoryIcons = {
        'browsers': 'fa-globe',
        'development': 'fa-code',
        'utilities': 'fa-tools',
        'multimedia tools': 'fa-play-circle',
        'document': 'fa-file-alt',
        'communications': 'fa-comments',
        'games': 'fa-gamepad',
        'pro tools': 'fa-briefcase'
    };
    
    return categoryIcons[category.toLowerCase()] || 'fa-box';
}

module.exports = { getPackages };
