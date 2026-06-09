const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicates() {
  const payments = await prisma.payment.findMany({
    orderBy: { id: 'asc' }
  });

  const seen = new Set();
  let deletedCount = 0;

  for (const p of payments) {
    if (p.method === 'MERCADOPAGO') {
      if (seen.has(p.invoiceId)) {
        // Delete duplicate
        await prisma.payment.delete({ where: { id: p.id } });
        console.log(`Deleted duplicate payment ID: ${p.id} for invoice: ${p.invoiceId}`);
        deletedCount++;
      } else {
        seen.add(p.invoiceId);
      }
    }
  }

  console.log(`Done. Deleted ${deletedCount} duplicates.`);
}

cleanDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
