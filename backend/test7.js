require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({ select: { mainNode: true } });
  const uniqueNodes = [...new Set(clients.map(c => c.mainNode))];
  console.log('Nodos únicos en los clientes:', uniqueNodes);
}
main().catch(console.log).finally(() => prisma.$disconnect());
