const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // El monto pagado (22999.94) supera el priceV1 (22990), por lo tanto = PAID
  const updated = await prisma.invoice.update({
    where: { id: 594 },
    data: { status: 'PAID' }
  });

  console.log(`✅ Factura ID ${updated.id} actualizada a: ${updated.status}`);
  console.log(`   Monto original: $${updated.originalAmount}`);
  console.log(`   Pagado: $22999.94 (incluye centavos de identificación)`);
  console.log(`   Diferencia favor del cliente: $${(22999.94 - updated.originalAmount).toFixed(2)}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
