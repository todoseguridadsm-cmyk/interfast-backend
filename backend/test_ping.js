const { pingIp } = require('./mikrotik');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log("=== Buscando Nodos ===");
        const nodes = await prisma.node.findMany();
        console.log(nodes.map(n => ({ name: n.name, host: n.host, isActive: n.isActive })));

        // Buscamos si hay algún cliente en rbborde
        const rbbordeClients = await prisma.client.findMany({
            where: { mainNode: { contains: 'borde', mode: 'insensitive' } },
            take: 1
        });

        if (rbbordeClients.length > 0) {
            const client = rbbordeClients[0];
            console.log(`\nIntentando ping al cliente ${client.name} en el nodo ${client.mainNode} (IP: ${client.ipNumber})...`);
            
            const result = await pingIp(client.ipNumber, client.mainNode);
            console.log("Resultado del Ping:");
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log("\nNo se encontraron clientes asociados a 'rbborde' en la base de datos.");
            // Si no hay clientes, intentamos ping a una IP cualquiera, por ejemplo a sí mismo o al gateway
            const bordeNode = nodes.find(n => n.name.toLowerCase().includes('borde'));
            if (bordeNode) {
                console.log(`\nIntentando ping al 8.8.8.8 desde el nodo ${bordeNode.name}...`);
                const result = await pingIp('8.8.8.8', bordeNode.name);
                console.log("Resultado del Ping:");
                console.log(JSON.stringify(result, null, 2));
            }
        }
    } catch (e) {
        console.error("Error global:", e);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

run();
