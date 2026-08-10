const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== AUDITANDO FACTURAS 07/2026 PENDIENTES Y DOBLES PAGOS ===");

  // 1. Clientes especificos: MERCADO AGUSTINA y FALCON ROMINA
  const targets = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'MERCADO AGUSTINA', mode: 'insensitive' } },
        { name: { contains: 'FALCON ROMINA', mode: 'insensitive' } },
        { name: { contains: 'MERCADO', mode: 'insensitive' } },
        { name: { contains: 'FALCON', mode: 'insensitive' } }
      ]
    },
    include: {
      invoices: {
        include: { payments: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }]
      }
    }
  });

  console.log("\n--- REVISIÓN ESPECÍFICA DE MERCADO Y FALCON ---");
  for (const c of targets) {
    console.log(`\nCliente ID ${c.id}: "${c.name}"`);
    c.invoices.forEach(inv => {
      console.log(`  - Factura #${inv.id} (${inv.month}/${inv.year}) Status: ${inv.status} | Payments: ${inv.payments.length}`);
      inv.payments.forEach(p => {
        console.log(`      * Pago #${p.id}: $${p.amountPaid} | Método: "${p.method}" | Date: ${p.paymentDate}`);
      });
    });
  }

  // 2. Revisión general de TODAS las facturas 07/2026 PENDING en la BD
  console.log("\n--- REVISIÓN GENERAL DE TODAS LAS FACTURAS 07/2026 EN ESTADO PENDING ---");
  const pendingJul = await prisma.invoice.findMany({
    where: { month: 7, year: 2026, status: 'PENDING' },
    include: {
      client: {
        include: {
          invoices: {
            include: { payments: true }
          }
        }
      }
    }
  });

  console.log(`Total facturas 07/2026 PENDING en la base de datos: ${pendingJul.length}`);

  for (const invJul of pendingJul) {
    const c = invJul.client;
    const invAug = c.invoices.find(i => i.month === 8 && i.year === 2026);
    const augPaymentsCount = invAug ? invAug.payments.length : 0;
    
    console.log(`\nFactura 07/2026 #${invJul.id} PENDING | Cliente ID ${c.id}: "${c.name}"`);
    console.log(`  -> Factura 08/2026 Status: ${invAug ? invAug.status : 'SIN FACTURA 8/2026'} | Pagos en 8/2026: ${augPaymentsCount}`);
    
    if (invAug && augPaymentsCount > 1) {
      console.log(`  ⚠️ ALERTA DOBLE PAGO EN AGOSTO: Cliente "${c.name}" tiene ${augPaymentsCount} pagos en 8/2026 y 07/2026 PENDING!`);
      invAug.payments.forEach(p => {
        console.log(`      * Pago #${p.id} en 8/2026: $${p.amountPaid} | Método: ${p.method} | Date: ${p.paymentDate}`);
      });
    }
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
