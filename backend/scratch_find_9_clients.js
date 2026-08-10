const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const targets = [
  { inputName: 'ADRIANA ELISA PETIOT', query: 'PETIOT', targetAmount: 22992 },
  { inputName: 'SILVIA ELVIRA PALACIOS', query: 'PALACIOS', targetAmount: 22991.77 },
  { inputName: 'LUIS HECTOR MORENO', query: 'MORENO', targetAmount: 22991.45 },
  { inputName: 'FABIAN NICOLAS AVILA', query: 'AVILA', targetAmount: 22990 },
  { inputName: 'MERLO ELIZABETH', query: 'MERLO', targetAmount: 22991.04 },
  { inputName: 'LUIS ANTENOR SALINAS', query: 'SALINAS', targetAmount: 22990.61 },
  { inputName: 'ANA ROCIO CHIMENDO', query: 'CHIMENDO', targetAmount: 22990.59 },
  { inputName: 'ADRIAN LEONEL GAVIOLA', query: 'GAVIOLA', targetAmount: 22991.07 },
  { inputName: 'MATEO MARCELO JAVIER', query: 'MATEO', targetAmount: 22990.44 }
];

async function run() {
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
          orderBy: { id: 'desc' },
          take: 5
        }
      }
    });

    console.log(`\n========================================`);
    console.log(`Search: "${item.inputName}" (Target Amount: $${item.targetAmount})`);
    console.log(`Found Clients count: ${clients.length}`);

    clients.forEach(c => {
      console.log(`Client ID: ${c.id} | Name: ${c.name} | Status: ${c.status}`);
      c.invoices.forEach(i => {
        console.log(`   Inv ID: ${i.id} | Month/Year: ${i.month}/${i.year} | Status: ${i.status} | Orig: $${i.originalAmount} | V1: $${i.priceV1} | V2: $${i.priceV2} | V3: $${i.priceV3} | V4: $${i.priceV4}`);
      });
    });
  }

  await prisma.$disconnect();
}

run().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
