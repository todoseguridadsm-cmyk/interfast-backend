const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const recent = await prisma.invoice.findMany({
    where: { 
      status: 'PENDING',
      notifiedAt: { not: null }
    },
    orderBy: { notifiedAt: 'desc' },
    take: 10,
    include: { client: true }
  });

  if (recent.length === 0) {
    console.log("No notified invoices found.");
    return;
  }

  for (const inv of recent) {
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { notifiedAt: null }
    });
    console.log(`Cleared notifiedAt for invoice #${inv.id} (${inv.client?.name})`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
