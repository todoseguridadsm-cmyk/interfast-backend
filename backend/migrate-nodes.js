require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateNodes() {
  const clients = await prisma.client.findMany();
  let updatedCount = 0;

  for (const client of clients) {
    if (!client.mainNode) continue;
    
    let newNode = null;
    const oldNode = client.mainNode.toUpperCase();

    if (oldNode.includes('VIALIDAD')) newNode = 'Vialidad';
    else if (oldNode.includes('IRRIGACION') || oldNode.includes('IRRIGACIÓN')) newNode = 'Irrigacion';
    else if (oldNode.includes('SANPEDRO') || oldNode.includes('SAN PEDRO')) newNode = 'San Pedro';
    else if (oldNode.includes('LACOLONIA') || oldNode.includes('LA COLONIA')) newNode = 'La Colonia';
    else if (oldNode.includes('BOVEDAS') || oldNode.includes('BÓVEDAS')) newNode = 'Las Bobedas';
    else if (oldNode.includes('PROCREAR')) newNode = 'Procrear';
    else if (oldNode.includes('MANT') || oldNode.includes('OMNI_TORRE_PRINCIPAL')) {
      // Default fallback for generic 'Mant' ones, possibly Vialidad or just leave them
      // Let's map OMNI_TORRE_PRINCIPAL to Vialidad just in case
      if (oldNode.includes('OMNI_TORRE_PRINCIPAL')) newNode = 'Vialidad';
    }

    if (newNode && client.mainNode !== newNode) {
      await prisma.client.update({
        where: { id: client.id },
        data: { mainNode: newNode }
      });
      console.log(`Migrado cliente ${client.id} (${client.name}): ${client.mainNode} -> ${newNode}`);
      updatedCount++;
    }
  }

  console.log(`\n¡Migración completa! Se actualizaron ${updatedCount} clientes.`);
}

migrateNodes().catch(console.error).finally(() => prisma.$disconnect());
