const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClient() {
  const client = await prisma.client.findFirst({
    where: { name: { contains: 'VEGA BLANCA', mode: 'insensitive' } },
    include: { plan: true }
  });

  if (!client) {
    console.log("Not found");
    return;
  }
  
  console.log(`Client: ${client.name} (ID: ${client.id})`);
  
  const invoices = await prisma.invoice.findMany({
    where: { clientId: client.id, status: { in: ['PENDING', 'PARTIAL'] } }
  });
  
  console.log(`Facturas Pendientes: ${invoices.length}`);
  invoices.forEach(inv => {
    console.log(`- F-${inv.year}-${inv.month}: $${inv.originalAmount}`);
    console.log(`  V1: $${inv.priceV1}, V2: $${inv.priceV2}, V3: $${inv.priceV3}, V4: $${inv.priceV4}`);
  });

  await prisma.$disconnect();
}

checkClient().catch(e => { console.error(e); process.exit(1); });
