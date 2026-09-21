require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateNode() {
  try {
    const res = await prisma.node.updateMany({
      where: { name: 'La Colonia' },
      data: { 
        host: '91510bda7544.sn.mynetname.net',
        port: 8787
      }
    });
    console.log(`Nodos actualizados: ${res.count}`);
  } catch (error) {
    console.error('Error al actualizar el nodo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateNode();
