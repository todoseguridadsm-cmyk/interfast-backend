const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCastillo() {
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'CASTILLO', mode: 'insensitive' } },
        { businessName: { contains: 'CASTILLO', mode: 'insensitive' } }
      ]
    },
    include: { invoices: { orderBy: { createdAt: 'desc' } } }
  });
  console.log('CASTILLO results:', clients);
  await prisma.$disconnect();
}

checkCastillo();
