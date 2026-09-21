const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const client = await prisma.client.findFirst({ where: { name: { contains: 'DIAZ CLAUDIA' } } });
  if (client) {
    console.log("Client:", client.name, "Wallet:", client.walletBalance);
    const inv = await prisma.invoice.findMany({ where: { clientId: client.id }, orderBy: { id: 'desc' }, take: 2 });
    console.log("Invoices:", inv);
    for (const i of inv) {
      const pays = await prisma.payment.findMany({ where: { invoiceId: i.id } });
      console.log(`Payments for Invoice ${i.id}:`, pays);
    }
    const moves = await prisma.cashMovement.findMany({ where: { description: { contains: client.name } }, orderBy: { id: 'desc' }, take: 3 });
    console.log("Cash movements:", moves);
  } else {
    console.log('Client DIAZ CLAUDIA not found');
  }

  console.log('=== Recent Surpluses (SOBRANTE) ===');
  const surpluses = await prisma.cashMovement.findMany({ where: { category: 'SOBRANTE' }, orderBy: { id: 'desc' }, take: 5 });
  console.log(surpluses);
}
run().finally(() => prisma.$disconnect());
