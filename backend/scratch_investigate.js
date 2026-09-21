const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const client = await prisma.client.findFirst({ where: { name: { contains: 'NADALEZ' } } });
  if (!client) return console.log('Client not found');
  console.log("Client:", client.name, "Wallet:", client.walletBalance);

  const inv = await prisma.invoice.findMany({ where: { clientId: client.id }, orderBy: { id: 'desc' }, take: 2 });
  console.log("Invoices:", inv);

  for (const i of inv) {
    const pays = await prisma.payment.findMany({ where: { invoiceId: i.id } });
    console.log(`Payments for Invoice ${i.id}:`, pays);
  }

  const moves = await prisma.cashMovement.findMany({ where: { description: { contains: client.name } }, orderBy: { id: 'desc' }, take: 5 });
  console.log("Cash movements:", moves);
}
run().finally(() => prisma.$disconnect());
