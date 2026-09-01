require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const invoiceIds = [720, 726, 741, 750, 719, 904];
  
  const result = await prisma.invoice.updateMany({
    where: { id: { in: invoiceIds } },
    data: { notifiedAt: null }
  });
  
  console.log(`Corregidas ${result.count} facturas Falsos Positivos. Se limpió su estado de notificado.`);
  await prisma.$disconnect();
}

run().catch(console.error);
