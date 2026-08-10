const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectAll() {
  const names = [
    'TORO',
    'BAROCCHI',
    'CIPOLLA',
    'FLORES',
    'GRECO',
    'A. S',
    'A.S',
    'S.A'
  ];

  const clients = await prisma.client.findMany({
    where: {
      OR: names.map(n => ({
        name: { contains: n, mode: 'insensitive' }
      }))
    },
    include: {
      invoices: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  console.log(`Found ${clients.length} matching clients total:`);
  for (const c of clients) {
    console.log(`\n----------------------------------------`);
    console.log(`Client ID: ${c.id} | Name: "${c.name}" | Status: ${c.status}`);
    if (c.invoices.length === 0) {
      console.log('   No invoices found.');
    }
    for (const inv of c.invoices) {
      console.log(`   Invoice ID: ${inv.id} | Month/Year: ${inv.month}/${inv.year} | Status: ${inv.status} | OrigAmt: ${inv.originalAmount}`);
    }
  }

  await prisma.$disconnect();
}

inspectAll().catch(console.error);
