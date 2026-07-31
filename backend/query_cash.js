const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const m = await prisma.cashMovement.findMany({
    where: { description: { contains: 'GAUNA GUSTAVO' } }
  });
  console.log("GAUNA GUSTAVO:", m);

  const m2 = await prisma.cashMovement.findMany({
    where: { description: { contains: 'MERLO ELIZABETH' } }
  });
  console.log("MERLO ELIZABETH:", m2);

  const m3 = await prisma.cashMovement.findMany({
    where: { description: { contains: 'MORON MIGUEL' } }
  });
  console.log("MORON MIGUEL:", m3);

  const m4 = await prisma.cashMovement.findMany({
    where: { description: { contains: 'FANIN VANESA' } }
  });
  console.log("FANIN VANESA:", m4);

  await prisma.$disconnect();
}
test();
