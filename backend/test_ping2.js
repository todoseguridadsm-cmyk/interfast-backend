const { pingIp } = require('./mikrotik');

async function run() {
    console.log("Ping a 8.8.8.8:");
    const r1 = await pingIp('8.8.8.8', 'Borde');
    console.log(r1);

    console.log("\nPing a 192.168.18.32:");
    const r2 = await pingIp('192.168.18.32', 'Borde');
    console.log(r2);

    process.exit(0);
}
run();
