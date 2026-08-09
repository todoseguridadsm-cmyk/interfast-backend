const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== REASIGNANDO PAGOS DE JULIO/AGOSTO PARA MAZARA DAVID Y MAZARA DOMINGO ===");

  // 1. MAZARA DAVID (ID: 46)
  // Mover Pago #513 ($22,990.46) de Factura #552 (8/2026) a Factura #314 (7/2026)
  await prisma.payment.update({
    where: { id: 513 },
    data: { invoiceId: 314 }
  });
  await prisma.invoice.update({
    where: { id: 314 },
    data: { status: 'PAID' }
  });
  await prisma.invoice.update({
    where: { id: 552 },
    data: { status: 'PAID' }
  });
  console.log("✅ MAZARA DAVID: Factura 7/2026 (#314) y Factura 8/2026 (#552) ambas corregidas a estado PAID.");

  // 2. MAZARA DOMINGO (ID: 47)
  // Mover Pago #514 ($22,990.47) de Factura #561 (8/2026) a Factura #300 (7/2026)
  await prisma.payment.update({
    where: { id: 514 },
    data: { invoiceId: 300 }
  });
  await prisma.invoice.update({
    where: { id: 300 },
    data: { status: 'PAID' }
  });
  await prisma.invoice.update({
    where: { id: 561 },
    data: { status: 'PAID' }
  });
  console.log("✅ MAZARA DOMINGO: Factura 7/2026 (#300) y Factura 8/2026 (#561) ambas corregidas a estado PAID.");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
