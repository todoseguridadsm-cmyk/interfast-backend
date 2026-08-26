require('dotenv').config();
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 20;
  
  // Update client plan to gratis (planId = 2)
  await prisma.client.update({
    where: { id: clientId },
    data: { planId: 2 }
  });
  console.log('Cliente actualizado a plan BONIFICADO (gratis, id 2)');

  // Update pending invoice to 0 and PAID
  await prisma.invoice.updateMany({
    where: { 
      clientId: clientId,
      status: 'PENDING'
    },
    data: { 
      status: 'PAID',
      originalAmount: 0,
      priceV1: 0,
      priceV2: 0,
      priceV3: 0,
      priceV4: 0
    }
  });
  console.log('Facturas pendientes pasadas a PAID con monto 0 (sin ingreso de dinero)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
