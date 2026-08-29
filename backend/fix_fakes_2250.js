const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { addIpToCutoffList } = require('./mikrotik');

async function main() {
  const fakePayments = await prisma.payment.findMany({
    where: { id: { in: [641, 642, 643, 644, 645] } },
    include: { invoice: { include: { client: true } } }
  });

  for (const payment of fakePayments) {
    console.log(`Reverting payment ${payment.id} for invoice ${payment.invoiceId}`);
    
    await prisma.payment.delete({ where: { id: payment.id } });
    
    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: 'PENDING' }
    });

    if (payment.invoice.client) {
      await prisma.client.update({
        where: { id: payment.invoice.client.id },
        data: { status: 'SUSPENDED' }
      });
      // Mikrotik
      try {
        await addIpToCutoffList(payment.invoice.client.ipNumber, payment.invoice.client.mainNode);
      } catch(e) {}
    }
  }
}

main().finally(() => prisma.$disconnect());
