const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

async function packageAction(action, packageId) {
  // Load package info from applications.json
  const pkgPath = path.join(__dirname, 'applications.json');
  const pkgs = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const pkg = pkgs[packageId];
  if (!pkg || !pkg.winget) throw new Error('Invalid package id');
  const winid = pkg.winget;
  let args;
  if (action === 'install') {
    args = ['install', '--id', winid, '--accept-source-agreements', '--accept-package-agreements', '-h'];
  } else if (action === 'uninstall') {
    args = ['uninstall', '--id', winid, '-h'];
  } else if (action === 'upgrade') {
    args = ['upgrade', '--id', winid, '-h'];
  } else {
    throw new Error('Unknown action');
  }
  return new Promise((resolve, reject) => {
    execFile('winget', args, (error) => {
      if (error) return reject(new Error('Failed to run winget action.'));
      resolve('ok');
    });
  });
}

module.exports = { packageAction };
