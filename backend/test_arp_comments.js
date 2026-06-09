const { connectToMikrotik } = require('./mikrotik');

async function run() {
    let client = null;
    try {
        const conn = await connectToMikrotik('Vialidad');
        client = conn.client;
        const api = conn.api;

        console.log("Descargando tabla ARP de Vialidad...");
        const arpList = await api.menu('/ip/arp').get();
        
        console.log(`Se encontraron ${arpList.length} registros ARP.`);
        // Mostrar los primeros 5 para ver qué campos traen
        if (arpList.length > 0) {
            console.log("\nEjemplo de los primeros 5 registros ARP (JSON Crudo):");
            console.log(JSON.stringify(arpList.slice(0, 5), null, 2));
        }

        // Buscar cuántos tienen 'comment'
        const conComentario = arpList.filter(a => a.comment).length;
        console.log(`\nDe ${arpList.length} registros, ${conComentario} tienen un 'comment' (descripción).`);

    } catch (e) {
        console.error(e);
    } finally {
        if (client) client.close();
        process.exit(0);
    }
}

run();
