const { connectToMikrotik } = require('./mikrotik');

async function run() {
    let client = null;
    try {
        console.log("Intentando conectar al Mikrotik de Borde y loguearse...");
        const conn = await connectToMikrotik('Borde');
        client = conn.client;
        console.log("✅ Autenticación exitosa. Obteniendo Identity...");
        const identity = await conn.api.menu('/system/identity').get();
        console.log("Identity:", identity);
        
        console.log("\nIntentando un ping simple al 8.8.8.8...");
        // Let's do raw ping without mikrotik.js wrapper just to see exact error
        client.rosApi.write('/ping', ['=address=8.8.8.8', '=count=2'])
            .then(res => console.log("Ping completado:", res))
            .catch(err => console.error("Error en raw ping:", err))
            .finally(() => {
                client.close();
                process.exit(0);
            });
    } catch (e) {
        console.error("❌ Error conectando a Borde:", e);
        if (client) client.close();
        process.exit(1);
    }
}
run();
