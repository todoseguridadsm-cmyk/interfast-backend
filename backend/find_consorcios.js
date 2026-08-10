const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'PILAR', mode: 'insensitive' } },
        { name: { contains: 'PINAR', mode: 'insensitive' } },
        { name: { contains: 'CONSORCIO', mode: 'insensitive' } }
      ]
    },
    include: {
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

  console.log('Found clients:', clients.length);
  clients.forEach(c => {
    console.log(`\nClient ID: ${c.id} | Name: ${c.name} | Status: ${c.status}`);
    c.invoices.forEach(inv => {
      console.log(`  Invoice ID: ${inv.id} | Month/Year: ${inv.month}/${inv.year} | Status: ${inv.status} | OriginalAmount: ${inv.originalAmount} | PriceV1: ${inv.priceV1} | PriceV2: ${inv.priceV2}`);
    });
  });

  await prisma.$disconnect();
}

check().catch(console.error);
