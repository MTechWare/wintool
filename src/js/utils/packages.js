/**
 * WinTool - Packages Module
 * Handles package management functionality
 *
 * This module provides functions for retrieving and managing software packages
 * from the applications database.
 */

// ===================================================
// IMPORTS
// ===================================================
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ===================================================
// CONSTANTS
// ===================================================
const APPLICATIONS_PATH = path.join(__dirname, '..', '..', '..', 'config', 'applications.json');
const CATEGORY_ICONS = {
    'browsers': 'fa-globe',
    'development': 'fa-code',
    'utilities': 'fa-tools',
    'multimedia tools': 'fa-play-circle',
    'document': 'fa-file-alt',
    'communications': 'fa-comments',
    'games': 'fa-gamepad',
    'pro tools': 'fa-briefcase'
};

// ===================================================
// HELPER FUNCTIONS
// ===================================================
/**
 * Get an appropriate icon for a package category
 * @param {string} category - The package category
 * @returns {string} - Font Awesome icon class
 */
function getCategoryIcon(category) {
    if (!category) return 'fa-box';
    return CATEGORY_ICONS[category.toLowerCase()] || 'fa-box';
}

// ===================================================
// MAIN FUNCTIONALITY
// ===================================================
/**
 * Get the list of available packages from the applications database
 * @returns {Promise<{packages: Array, error?: string}>} Array of package objects or error
 */
async function getPackages() {
    try {
        // Check if applications database exists
        if (!fs.existsSync(APPLICATIONS_PATH)) {
            return { packages: [], error: 'Applications database not found' };
        }

        // Read and parse the applications database
        const packagesData = fs.readFileSync(APPLICATIONS_PATH, 'utf8');
        const packagesObj = JSON.parse(packagesData);

        // Convert the object to an array of packages with IDs
        const packages = Object.keys(packagesObj).map(key => ({
            id: key,
            name: packagesObj[key].content || key,
            description: packagesObj[key].description || '',
            category: packagesObj[key].category?.toLowerCase() || 'other',
            icon: getCategoryIcon(packagesObj[key].category),
            link: packagesObj[key].link || '',
            winget: packagesObj[key].winget || '',
            choco: packagesObj[key].choco || ''
        }));

        return { packages };
    } catch (error) {
        console.error('Error getting packages:', error);
        return { packages: [], error: error.message };
    }
}

// ===================================================
// EXPORTS
// ===================================================
module.exports = { getPackages };
