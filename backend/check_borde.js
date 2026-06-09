const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const node = await prisma.node.findUnique({ where: { name: 'Borde' } });
    console.log(node);
    process.exit(0);
}
run();
