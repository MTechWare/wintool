const WinReg = require('winreg');
// Example: Add registry read/write helpers here

function readRegistryValue(hive, key, name) {
  return new Promise((resolve, reject) => {
    const regKey = new WinReg({ hive, key });
    regKey.get(name, (err, item) => {
      if (err) return reject(err);
      resolve(item ? item.value : null);
    });
  });
}

function writeRegistryValue(hive, key, name, type, value) {
  return new Promise((resolve, reject) => {
    const regKey = new WinReg({ hive, key });
    regKey.set(name, type, value, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = { readRegistryValue, writeRegistryValue };
