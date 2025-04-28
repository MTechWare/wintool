const si = require('systeminformation');

async function getSystemInfo() {
  try {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const fsSize = await si.fsSize();
    const net = await si.networkStats();
    const time = si.time();
    return {
      cpu: cpu.currentLoad,
      ram: { used: mem.active, total: mem.total },
      disk: fsSize[0] ? { used: fsSize[0].used, total: fsSize[0].size, percent: fsSize[0].use } : { used: 0, total: 0, percent: 0 },
      net: net[0] ? { bytes_sent: net[0].tx_bytes, bytes_recv: net[0].rx_bytes } : { bytes_sent: 0, bytes_recv: 0 },
      uptime_seconds: time.uptime
    };
  } catch (e) {
    console.error("Error fetching system info:", e);
    throw new Error("Could not retrieve system information.");
  }
}

module.exports = { getSystemInfo };
