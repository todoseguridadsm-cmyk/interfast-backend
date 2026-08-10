const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECCIONANDO FACTURAS Y PAGOS DE MAZARA DAVID Y MAZARA DOMINGO ===");

  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'MAZARA', mode: 'insensitive' } }
      ]
    },
    include: {
      invoices: {
        include: { payments: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }]
      }
    }
  });

  for (const c of clients) {
    console.log(`\nCliente ID ${c.id}: "${c.name}"`);
    console.log("Facturas:");
    c.invoices.forEach(inv => {
      console.log(`  - Factura #${inv.id} (${inv.month}/${inv.year}) -> Status: ${inv.status} | OriginalAmount: ${inv.originalAmount} | Payments: ${inv.payments.length}`);
      inv.payments.forEach(p => {
        console.log(`      * Pago #${p.id}: $${p.amountPaid} | Método: "${p.method}" | Date: ${p.paymentDate}`);
      });
    });
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
