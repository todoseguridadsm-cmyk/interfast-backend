require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.client.count({ where: { OR: [ { mainNode: null }, { mainNode: '' } ] } });
  console.log('Clientes sin nodo:', c);
}
main().catch(console.log).finally(() => prisma.$disconnect());
