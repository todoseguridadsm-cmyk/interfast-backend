const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const client = await prisma.client.findFirst({ where: { name: { contains: 'NADALEZ' } } });
  if (!client) return console.log('Client not found');
  const inv = await prisma.invoice.findFirst({ where: { clientId: client.id }, orderBy: { id: 'desc' } });
  console.log(inv);
}
run().finally(() => prisma.$disconnect());
