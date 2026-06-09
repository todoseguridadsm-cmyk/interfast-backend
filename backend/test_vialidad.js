const { getMikrotikActiveClients } = require('./mikrotik');

async function run() {
    try {
        console.log("Conectando al nodo 'Vialidad'...");
        const clients = await getMikrotikActiveClients('Vialidad');
        
        console.log(`\nSe encontraron ${clients.length} conexiones activas en el nodo Vialidad:\n`);
        
        clients.forEach(c => {
            console.log(`IP: ${c.ip.padEnd(16, ' ')} | Nombre/Host: ${c.mikrotikName} | Tipo: ${c.type}`);
        });

        console.log("\nFin de la lista.");
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

run();
