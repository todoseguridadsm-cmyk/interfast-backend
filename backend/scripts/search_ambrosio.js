const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../.env' });
const prisma = new PrismaClient();

async function run() {
    const clients = await prisma.client.findMany({
        where: { name: { contains: 'AMBROSIO', mode: 'insensitive' } }
    });
    console.log("Clientes Ambrosio:");
    console.log(clients.map(c => ({ id: c.id, name: c.name, status: c.status })));
}
run().finally(() => prisma.$disconnect());
