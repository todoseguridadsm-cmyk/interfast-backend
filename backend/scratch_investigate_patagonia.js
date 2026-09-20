const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const clients = await prisma.client.findMany({
    where: { name: { contains: 'Patagonia' } },
    include: { invoices: true }
  });
  console.log(JSON.stringify(clients, null, 2));
}
check().catch(console.error).finally(() => prisma.$disconnect());
