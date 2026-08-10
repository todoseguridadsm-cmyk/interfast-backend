const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'LAZAR', mode: 'insensitive' } },
        { name: { contains: 'SANTIAGO', mode: 'insensitive' } },
        { businessName: { contains: 'LAZAR', mode: 'insensitive' } }
      ]
    },
    include: {
      invoices: {
        orderBy: { id: 'desc' },
        take: 5
      }
    }
  });

  console.log(`Found Clients count: ${clients.length}`);
  clients.forEach(c => {
    console.log(`Client ID: ${c.id} | Name: ${c.name} | Status: ${c.status}`);
    c.invoices.forEach(i => {
      console.log(`   Inv ID: ${i.id} | Month/Year: ${i.month}/${i.year} | Status: ${i.status} | Orig: $${i.originalAmount} | V1: $${i.priceV1} | V2: $${i.priceV2}`);
    });
  });

  await prisma.$disconnect();
}

run().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
