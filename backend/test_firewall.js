const { connectToMikrotik } = require('./mikrotik');

async function run() {
    let client = null;
    try {
        const conn = await connectToMikrotik('Vialidad');
        client = conn.client;
        const api = conn.api;

        console.log("=== Buscando nombres en el Mikrotik (Vialidad) ===");

        // 1. IP Firewall Filter
        console.log("\n1. Revisando /ip/firewall/filter ...");
        const filters = await api.menu('/ip/firewall/filter').get();
        const filtersWithComment = filters.filter(f => f.comment);
        console.log(`Se encontraron ${filters.length} reglas. De ellas, ${filtersWithComment.length} tienen comentario.`);
        if (filtersWithComment.length > 0) {
            console.log("Ejemplo de comentarios en Filter Rules:");
            filtersWithComment.slice(0, 5).forEach(f => console.log(` - Comentario: ${f.comment} | Src IP: ${f['src-address'] || 'N/A'}`));
        }

        // 2. Simple Queues
        console.log("\n2. Revisando /queue/simple (donde suelen estar los planes y nombres) ...");
        const queues = await api.menu('/queue/simple').get();
        console.log(`Se encontraron ${queues.length} colas.`);
        if (queues.length > 0) {
            console.log("Ejemplo de colas:");
            queues.slice(0, 5).forEach(q => console.log(` - Nombre: ${q.name} | Target IP: ${q.target} | Comentario: ${q.comment || 'Sin comentario'}`));
        }

        // 3. Address List
        console.log("\n3. Revisando /ip/firewall/address-list ...");
        const addressLists = await api.menu('/ip/firewall/address-list').get();
        const addressListsWithComment = addressLists.filter(a => a.comment);
        console.log(`Se encontraron ${addressLists.length} IPs en listas. De ellas, ${addressListsWithComment.length} tienen comentario.`);
        if (addressListsWithComment.length > 0) {
            console.log("Ejemplo de comentarios en Address List:");
            addressListsWithComment.slice(0, 5).forEach(a => console.log(` - Lista: ${a.list} | IP: ${a.address} | Comentario: ${a.comment}`));
        }

    } catch (e) {
        console.error("Error al conectar:", e);
    } finally {
        if (client) client.close();
        process.exit(0);
    }
}

run();
