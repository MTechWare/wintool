const RPC = require('discord-rpc');
const clientId = "564432873419964426";
let rpc;

const activity = {
    details: 'Comprehensive. Intuitive. Professional.',
    state: 'https://mtechware.github.io/wintool.html',
    startTimestamp: new Date(),
    largeImageKey: 'wt',
    largeImageText: 'WinTool',
    smallImageKey: 'icon',
    smallImageText: 'Icon',
    instance: false,
};

async function setActivity() {
    if (!rpc) {
        return;
    }
    await rpc.setActivity(activity);
}

function start() {
    if (rpc) {
        return;
    }
    rpc = new RPC.Client({ transport: 'ipc' });
    rpc.on('ready', () => {
        setActivity();
    });
    rpc.login({ clientId }).catch(err => {
        console.error('Failed to connect to Discord RPC', err);
        rpc = null;
    });
}

function stop() {
    if (!rpc) {
        return;
    }
    rpc.destroy();
    rpc = null;
}

module.exports = {
    start,
    stop
};
