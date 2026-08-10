const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBarocchi() {
  const c62 = await prisma.client.findUnique({
    where: { id: 62 },
    include: { invoices: true }
  });

  const c226 = await prisma.client.findUnique({
    where: { id: 226 },
    include: { invoices: true }
  });

  console.log('Client 62:', c62);
  console.log('Client 226:', c226);

  await prisma.$disconnect();
}

checkBarocchi();
