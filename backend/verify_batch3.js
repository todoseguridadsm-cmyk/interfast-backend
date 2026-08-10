const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyBatch3() {
  const ids = [128, 98, 209, 36, 82, 110, 106, 124, 195, 215, 78];

  const clients = await prisma.client.findMany({
    where: { id: { in: ids } },
    include: {
      invoices: {
        where: { month: 8, year: 2026 },
        include: { payments: true }
      }
    }
  });

  console.log(`Verifying ${clients.length} clients:`);
  for (const c of clients) {
    const inv = c.invoices[0];
    const p = inv?.payments[0];
    console.log(`Client ${c.id}: ${c.name} | Inv #${inv?.id} Status: ${inv?.status} | Paid: $${p?.amountPaid} via ${p?.method}`);
  }

  await prisma.$disconnect();
}

verifyBatch3().catch(console.error);
