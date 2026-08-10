const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Ver la factura 594 completa
  const inv = await prisma.invoice.findUnique({
    where: { id: 594 },
    include: { payments: true }
  });

  console.log('Factura completa:', JSON.stringify(inv, null, 2));
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
