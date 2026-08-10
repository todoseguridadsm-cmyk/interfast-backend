const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processLazarPayment() {
  const clientId = 41;
  const invoiceId = 546;
  const name = 'SANTIAGO JAVIER LAZAR';
  const amount = 15982.00;

  console.log(`=== INICIANDO PAGO INDIVIDUAL: ${name} (Cliente ID: ${clientId}) ===`);
  console.log(`Monto a pagar: $${amount} | Factura ID: ${invoiceId}\n`);

  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) {
    console.error(`❌ Factura ID ${invoiceId} no encontrada`);
    await prisma.$disconnect();
    return;
  }

  // 1. Crear Registro de Pago MercadoPago
  const payment = await prisma.payment.create({
    data: {
      invoiceId: inv.id,
      method: 'MERCADOPAGO',
      amountPaid: amount,
      lateFeeApplied: 0,
      userId: 1
    }
  });
  console.log(`✅ Pago ID ${payment.id} registrado | Monto: $${payment.amountPaid} | Método: ${payment.method}`);

  // 2. Crear Movimiento de Caja General
  const cashMov = await prisma.cashMovement.create({
    data: {
      type: 'IN',
      amount: amount,
      category: 'PAGO_FACTURA',
      description: `Cobro MERCADOPAGO - Factura #${inv.id} (${name})`,
      userId: 1
    }
  });
  console.log(`✅ Movimiento Caja ID ${cashMov.id} registrado | Monto: $${cashMov.amount}`);

  // 3. Actualizar Factura a PAID
  const updatedInv = await prisma.invoice.update({
    where: { id: inv.id },
    data: { status: 'PAID' }
  });
  console.log(`✅ Factura #${updatedInv.id} actualizada a estado: ${updatedInv.status}`);

  // 4. Limpiar CutoffList si existía
  const deletedCutoffs = await prisma.cutoffList.deleteMany({
    where: { invoiceId: inv.id }
  });
  if (deletedCutoffs.count > 0) {
    console.log(`✅ Removido de lista de corte (${deletedCutoffs.count} registros)`);
  }

  // 5. Garantizar estado activo del cliente
  await prisma.client.update({
    where: { id: clientId },
    data: { status: 'ACTIVE' }
  });
  console.log(`✅ Cliente ID ${clientId} verificado/actualizado como ACTIVE`);

  console.log(`\n==================================================`);
  console.log(`🎉 ¡PAGO DE SANTIAGO JAVIER LAZAR PROCESADO CON ÉXITO!`);
  console.log(`==================================================\n`);

  await prisma.$disconnect();
}

processLazarPayment().catch(err => {
  console.error('Error procesando pago de Lazar:', err);
  prisma.$disconnect();
  process.exit(1);
});
