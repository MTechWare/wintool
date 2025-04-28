const fs = require('fs').promises;
const path = require('path');

async function getPackages() {
  try {
    const pkgPath = path.join(__dirname, 'applications.json');
    const data = await fs.readFile(pkgPath, 'utf-8');
    const pkgs = JSON.parse(data);
    return Object.entries(pkgs).map(([id, v]) => ({ ...v, id }));
  } catch (e) {
    return { error: 'Error loading packages: ' + e.message };
  }
}

module.exports = { getPackages };
