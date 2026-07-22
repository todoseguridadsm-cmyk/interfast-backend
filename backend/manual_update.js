const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const idsToProcess = [155, 157];
  let paidCount = 0;
  
  for (const id of idsToProcess) {
    const pending = await prisma.invoice.findMany({
      where: { clientId: id, status: 'PENDING' }
    });
    
    for (const inv of pending) {
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { status: 'PAID' }
      });
      
      await prisma.payment.create({
        data: {
          invoiceId: inv.id,
          method: 'MERCADOPAGO_VIEJO',
          amountPaid: inv.originalAmount,
          lateFeeApplied: 0
        }
      });
      paidCount++;
    }
  }
  
  console.log(`Updated ${paidCount} invoices to PAID for manually matched clients.`);
  await prisma.$disconnect();
}
run();
