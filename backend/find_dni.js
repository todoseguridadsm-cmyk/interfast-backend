const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findDni() {
  const clients = await prisma.client.findMany({
    where: { 
      OR: [
        { dni: { contains: '11925206' } },
        { phone: { contains: '11925206' } }
      ]
    },
    include: { invoices: { where: { status: 'PENDING' } } }
  });

  console.log(`Found ${clients.length} clients`);
  clients.forEach(c => {
    console.log(`Client ${c.id}: ${c.name} - DNI: ${c.dni} - Phone: ${c.phone} - Pending Invoices: ${c.invoices.length}`);
  });

  await prisma.$disconnect();
}

findDni().catch(e => { console.error(e); process.exit(1); });
