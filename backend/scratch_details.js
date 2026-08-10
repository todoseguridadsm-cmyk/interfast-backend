const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const targets = [
  { name: 'ADRIANA ELISA PETIOT', query: 'PETIOT', targetAmount: 22992 },
  { name: 'SILVIA ELVIRA PALACIOS', query: 'PALACIOS', targetAmount: 22991.77 },
  { name: 'LUIS HECTOR MORENO', query: 'MORENO', targetAmount: 22991.45 },
  { name: 'FABIAN NICOLAS AVILA', query: 'AVILA', targetAmount: 22990 },
  { name: 'MERLO ELIZABETH', query: 'MERLO', targetAmount: 22991.04 },
  { name: 'LUIS ANTENOR SALINAS', query: 'SALINAS', targetAmount: 22990.61 },
  { name: 'ANA ROCIO CHIMENDO', query: 'CHIMENDO', targetAmount: 22990.59 },
  { name: 'ADRIAN LEONEL GAVIOLA', query: 'GAVIOLA', targetAmount: 22991.07 },
  { name: 'MATEO MARCELO JAVIER', query: 'MATEO', targetAmount: 22990.44 }
];

async function run() {
  const results = [];
  for (const item of targets) {
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: item.query, mode: 'insensitive' } },
          { businessName: { contains: item.query, mode: 'insensitive' } }
        ]
      },
      include: {
        invoices: {
          where: { status: 'PENDING' },
          orderBy: { id: 'desc' }
        }
      }
    });

    const matchInfo = clients.map(c => ({
      clientId: c.id,
      name: c.name,
      status: c.status,
      pendingInvoices: c.invoices.map(i => ({ id: i.id, month: i.month, year: i.year, orig: i.originalAmount, v1: i.priceV1 }))
    }));

    results.push({
      target: item,
      matches: matchInfo
    });
  }

  console.log(JSON.stringify(results, null, 2));
  await prisma.$disconnect();
}

run().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
