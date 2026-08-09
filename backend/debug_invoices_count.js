const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== PROCESANDO PAGO DE MARIA FERNANDA MORALES ===");

  // 1. Cargar pago de MARIA FERNANDA MORALES
  let client = await prisma.client.findFirst({
    where: {
      OR: [
        { name: { contains: 'MORALES BETINA', mode: 'insensitive' } },
        { name: { contains: 'MORALES', mode: 'insensitive' } }
      ]
    }
  });

  if (!client) {
    client = await prisma.client.findFirst({
      where: { name: { contains: 'FERNANDA', mode: 'insensitive' } }
    });
  }

  if (client) {
    const inv = await prisma.invoice.findFirst({
      where: { clientId: client.id, month: 8, year: 2026 }
    });

    if (inv) {
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { status: 'PAID' }
      });

      const adminUser = await prisma.user.findFirst({ where: { username: 'tkip' } });
      const userId = adminUser ? adminUser.id : 1;

      // Verificar si ya tiene pago
      const existingPay = await prisma.payment.findFirst({ where: { invoiceId: inv.id } });
      if (!existingPay) {
        await prisma.payment.create({
          data: {
            invoiceId: inv.id,
            method: 'MERCADOPAGO',
            amountPaid: 22991.18,
            paymentDate: new Date(),
            userId: userId,
            operator: 'MERCADOPAGO'
          }
        });
      }
      console.log(`✅ Pago de MARIA FERNANDA MORALES ($22,991.18) registrado para Cliente ID ${client.id} ("${client.name}").`);
    }
  }

  // 2. Conteo de facturas 8/2026 por estado en el CRM
  const paidInvoices = await prisma.invoice.findMany({
    where: { month: 8, year: 2026, status: 'PAID' },
    include: { client: true }
  });

  const pendingInvoices = await prisma.invoice.findMany({
    where: { month: 8, year: 2026, status: 'PENDING' },
    include: { client: true }
  });

  console.log(`\n===================================================`);
  console.log(`TOTAL FACTURAS 8/2026 EN LA BD DEL CRM:`);
  console.log(`🟢 TOTAL FACTURAS PAID (PAGADAS): ${paidInvoices.length}`);
  console.log(`🔴 TOTAL FACTURAS PENDING (PENDIENTES): ${pendingInvoices.length}`);
  console.log(`===================================================\n`);

  console.log("Facturas PAID (Pagadas) registradas:");
  paidInvoices.forEach((inv, idx) => {
    console.log(`${idx + 1}. Factura ID ${inv.id} | Cliente ID ${inv.clientId}: "${inv.client?.name}"`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
