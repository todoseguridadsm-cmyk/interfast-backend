const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMovements() {
  const movs = await prisma.cashMovement.findMany({
    where: {
      OR: [
        { amount: 1450000 },
        { category: 'RETIRO_SOCIO' }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('Found movements:', JSON.stringify(movs, null, 2));
  await prisma.$disconnect();
}

checkMovements().catch(console.error);
