const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 93; // AMBROSIO RAUL CESAR
  const amountPaid = 22999.94;

  // Buscar facturas pendientes
  const invoices = await prisma.invoice.findMany({
    where: { clientId, status: { in: ['PENDING', 'PARTIAL'] } },
    orderBy: { createdAt: 'desc' }
  });

  if (invoices.length === 0) {
    console.log('❌ No hay facturas pendientes para este cliente');
    await prisma.$disconnect();
    return;
  }

  const inv = invoices[0];
  console.log(`📄 Factura encontrada: ID ${inv.id} | Período ${inv.month}/${inv.year} | Total: $${inv.totalAmount} | Estado: ${inv.status}`);

  // Registrar el pago con método MERCADOPAGO
  const payment = await prisma.payment.create({
    data: {
      invoiceId: inv.id,
      amountPaid: amountPaid,
      method: 'MERCADOPAGO',
      paymentDate: new Date(),
    }
  });

  console.log(`✅ Pago registrado: ID ${payment.id} | Monto: $${payment.amountPaid} | Método: ${payment.method}`);

  // Determinar nuevo estado
  const newStatus = amountPaid >= inv.totalAmount ? 'PAID' : 'PARTIAL';

  const updatedInvoice = await prisma.invoice.update({
    where: { id: inv.id },
    data: { status: newStatus }
  });

  console.log(`✅ Factura ID ${updatedInvoice.id} actualizada a estado: ${updatedInvoice.status}`);
  console.log(`\n🎉 Listo! AMBROSIO RAUL CESAR - Factura ${inv.month}/${inv.year} marcada como ${newStatus}`);
  console.log(`   Monto pagado: $${amountPaid} | Total factura: $${inv.totalAmount}`);
  if (amountPaid < inv.totalAmount) {
    console.log(`   ⚠️  Diferencia pendiente: $${(inv.totalAmount - amountPaid).toFixed(2)}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
