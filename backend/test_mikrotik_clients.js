const { connectToMikrotik } = require('./mikrotik');

async function getActiveClients() {
  let conn;
  try {
    console.log("Conectando a Vialidad...");
    conn = await connectToMikrotik("Vialidad");
    
    // Check PPPoE active
    const pppoe = await conn.api.menu('/ppp/active').get();
    console.log(`Clientes PPPoE activos: ${pppoe.length}`);
    if (pppoe.length > 0) console.log(pppoe.slice(0, 3));

    // Check ARP table
    const arp = await conn.api.menu('/ip/arp').get();
    console.log(`\nClientes en tabla ARP: ${arp.length}`);
    if (arp.length > 0) console.log(arp.slice(0, 3));

    // Check DHCP leases
    const dhcp = await conn.api.menu('/ip/dhcp-server/lease').get();
    console.log(`\nClientes en DHCP Leases: ${dhcp.length}`);
    if (dhcp.length > 0) console.log(dhcp.slice(0, 3));

    // Check Simple Queues (often used to limit speed per IP)
    const queues = await conn.api.menu('/queue/simple').get();
    console.log(`\nColas Simples (Simple Queues): ${queues.length}`);
    if (queues.length > 0) console.log(queues.slice(0, 3));

  } catch(e) {
    console.error("Error:", e.message || e);
  } finally {
    if (conn && conn.client) conn.client.close();
  }
}

getActiveClients().then(() => process.exit(0));
