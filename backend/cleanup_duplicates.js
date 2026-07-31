const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicates() {
  console.log("Checking for duplicated payments today (same invoice paid multiple times)...");
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. DUPLICATE PAYMENTS
  const paymentsToday = await prisma.payment.findMany({
    where: { paymentDate: { gte: today } }
  });

  const seenInvoices = new Set();
  let deletedPayments = 0;

  // We sort them so we keep the first one and delete subsequent ones
  paymentsToday.sort((a, b) => a.id - b.id);

  for (const p of paymentsToday) {
    if (seenInvoices.has(p.invoiceId)) {
      console.log(`Duplicate Payment found for Invoice #${p.invoiceId} (Payment ID: ${p.id}). Deleting...`);
      await prisma.payment.delete({ where: { id: p.id } });
      deletedPayments++;
    } else {
      seenInvoices.add(p.invoiceId);
    }
  }

  // 2. DUPLICATE CASH MOVEMENTS
  const movementsToday = await prisma.cashMovement.findMany({
    where: { createdAt: { gte: today }, category: 'PAGO_FACTURA' }
  });

  const seenMovements = new Set();
  let deletedMovements = 0;

  movementsToday.sort((a, b) => a.id - b.id);

  for (const mov of movementsToday) {
    // If it's a payment, the description should contain "Factura #XXX"
    const match = mov.description.match(/Factura #(\d+)/);
    if (match) {
      const invId = match[1];
      if (seenMovements.has(invId)) {
        console.log(`Duplicate Cash Movement found for Invoice #${invId} (Mov ID: ${mov.id}). Deleting...`);
        await prisma.cashMovement.delete({ where: { id: mov.id } });
        deletedMovements++;
      } else {
        seenMovements.add(invId);
      }
    }
  }

  console.log(`Done. Deleted ${deletedPayments} duplicate payments and ${deletedMovements} duplicate cash movements.`);
  await prisma.$disconnect();
}

cleanDuplicates();
