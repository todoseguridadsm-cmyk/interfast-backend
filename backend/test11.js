require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({ select: { id: true, name: true, mainNode: true } });
  const validNodes = ['Vialidad', 'Irrigacion', 'San Pedro', 'La Colonia', 'Las Bobedas', 'Procrear'];
  
  const invalid = clients.filter(c => c.mainNode && !validNodes.includes(c.mainNode));
  
  const uniqueNames = [...new Set(invalid.map(c => c.mainNode))];
  console.log('Nombres viejos que faltan migrar:');
  console.log(uniqueNames);
  console.log(`\nFaltan migrar ${invalid.length} clientes.`);
}

main().catch(console.log).finally(() => prisma.$disconnect());
