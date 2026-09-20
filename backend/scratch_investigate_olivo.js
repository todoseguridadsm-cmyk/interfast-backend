const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const clients = await prisma.client.findMany({
    where: { 
      OR: [
        { name: { contains: 'Olivo' } },
        { name: { contains: 'Deposito' } },
        { name: { contains: 'Depósito' } }
      ]
    },
    include: { invoices: true }
  });
  console.log(JSON.stringify(clients, null, 2));
}
check().catch(console.error).finally(() => prisma.$disconnect());
