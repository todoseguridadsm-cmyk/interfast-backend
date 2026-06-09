const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const nodes = await prisma.node.findMany();
    console.log(nodes.map(n => n.name));
    process.exit(0);
}
run();
