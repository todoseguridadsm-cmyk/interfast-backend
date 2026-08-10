const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const searchQueries = [
  'TORO',
  'RUBEN',
  'BAROCCHI',
  'CRISTIAN',
  'CIPOLLA',
  'BIBIANA',
  'FLORES',
  'GRECO',
  'MAURICIO',
  'A. S',
  'A.S',
  'AS & SA',
  'S.A'
];

async function findClients() {
  console.log('Searching clients...');

  for (const q of searchQueries) {
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { businessName: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    console.log(`\n=== Query: "${q}" (Matches: ${clients.length}) ===`);
    clients.forEach(c => {
      console.log(`Client ID: ${c.id} | Name: ${c.name} | BusinessName: ${c.businessName} | Status: ${c.status}`);
      c.invoices.forEach(inv => {
        console.log(`   Invoice ID: ${inv.id} | Month/Year: ${inv.month}/${inv.year} | Status: ${inv.status} | OrigAmt: ${inv.originalAmount} | V1: ${inv.priceV1}`);
      });
    });
  }

  await prisma.$disconnect();
}

findClients().catch(console.error);
