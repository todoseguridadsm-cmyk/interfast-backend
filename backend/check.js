require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const node = await prisma.node.findFirst();
  console.log('Primer Nodo en BD:', node);
}

main().catch(console.error).finally(() => prisma.$disconnect());
