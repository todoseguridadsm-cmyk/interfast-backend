const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { addIpToCutoffList } = require('./mikrotik');

async function main() {
  const fakePayments = await prisma.payment.findMany({
    where: { id: { in: [646, 647, 648, 649, 650] } },
    include: { invoice: { include: { client: true } } }
  });

  for (const payment of fakePayments) {
    console.log(`Neutralizando payment ${payment.id} for invoice ${payment.invoiceId}`);
    
    // No borramos el pago para mantener el mpPaymentId en la DB y bloquear futuros cron
    await prisma.payment.update({ 
      where: { id: payment.id },
      data: {
        method: 'OTRO_SISTEMA',
        amountPaid: 0,
        lateFeeApplied: 0
      }
    });
    
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
        console.log('Cortado en mikrotik:', payment.invoice.client.name);
      } catch(e) {
        console.log('Error Mikrotik:', e.message);
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
