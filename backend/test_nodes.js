require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const nodes = await prisma.node.findMany();
  console.log('Nodos en DB:', nodes.map(n => n.name));

  const countColonia = await prisma.client.count({
    where: { mainNode: { contains: 'colonia', mode: 'insensitive' } }
  });
  console.log('Clientes en algo con "colonia":', countColonia);
  
  const sampleClients = await prisma.client.findMany({
    where: { mainNode: { contains: 'colonia', mode: 'insensitive' } },
    select: { name: true, mainNode: true },
    take: 5
  });
  console.log('Muestra:', sampleClients);
}

main().finally(() => prisma.$disconnect());
