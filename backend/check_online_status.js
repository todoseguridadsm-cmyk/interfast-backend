const { connectToMikrotik, getMikrotikActiveClients } = require('./mikrotik');

async function run() {
    let client = null;
    try {
        // 1. Get Active Clients (from ARP, PPPoE, DHCP)
        const activeClients = await getMikrotikActiveClients('Vialidad');
        const activeIps = new Set(activeClients.map(c => c.ip));

        // 2. Get Queues
        const conn = await connectToMikrotik('Vialidad');
        client = conn.client;
        const api = conn.api;
        const queues = await api.menu('/queue/simple').get();

        const results = [];

        queues.forEach(q => {
            // target is usually IP/32, e.g. 192.168.20.131/32
            const ip = (q.target || '').split('/')[0];
            if (ip && !ip.endsWith('.0')) { // ignore total ranges like 192.168.20.0
                const isConnected = activeIps.has(ip);
                results.push({ name: q.name, ip: ip, isConnected });
            }
        });

        // Sort by name
        results.sort((a, b) => a.name.localeCompare(b.name));

        const connected = results.filter(r => r.isConnected);
        const disconnected = results.filter(r => !r.isConnected);

        console.log(JSON.stringify({
            total: results.length,
            connectedCount: connected.length,
            disconnectedCount: disconnected.length,
            connectedList: connected,
            disconnectedList: disconnected
        }, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        if (client) client.close();
        process.exit(0);
    }
}
run();
