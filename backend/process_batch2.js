const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processBatch2() {
  const paymentsToProcess = [
    { clientId: 127, name: 'RUBEN ANTONIO TORO', amount: 22991.27, invoiceId: 615 },
    { clientId: 226, name: 'CRISTIAN DARIO BAROCCHI', amount: 22990.00, invoiceId: 697 },
    { clientId: 62,  name: 'CRISTIAN DARIO BAROCCHI 2', amount: 22990.00, createInvoice: true },
    { clientId: 180, name: 'CIPOLLA JOSE LUIS', amount: 22990.00, invoiceId: 651 },
    { clientId: 88,  name: 'BIBIANA FLORES', amount: 22990.00, invoiceId: 590 },
    { clientId: 216, name: 'MAURICIO OSCAR GRECO', amount: 22992.12, invoiceId: 671 },
    { clientId: 225, name: 'A. S. & S. A.', amount: 22990.00, invoiceId: 699 }
  ];

  console.log('=== INICIANDO PROCESO LOTE 2 (7 PAGOS MERCADOPAGO & CAJA GENERAL) ===\n');

  for (const item of paymentsToProcess) {
    console.log(`--------------------------------------------------`);
    console.log(`Procesando: ${item.name} (Cliente ID: ${item.clientId}) | Monto a pagar: $${item.amount}`);

    let invoiceId = item.invoiceId;

    // Si requiere crear factura (Cliente 62)
    if (item.createInvoice) {
      const newInv = await prisma.invoice.create({
        data: {
          clientId: item.clientId,
          month: 8,
          year: 2026,
          originalAmount: 22990,
          priceV1: 22990,
          priceV2: 24370,
          priceV3: 25750,
          priceV4: 26900,
          dueDate: new Date('2026-08-10'),
          dueDate1: new Date('2026-08-10'),
          dueDate2: new Date('2026-08-16'),
          dueDate3: new Date('2026-08-21'),
          dueDate4: new Date('2026-08-22'),
          status: 'PENDING'
        }
      });
      invoiceId = newInv.id;
      console.log(`🆕 Creada factura ID: ${invoiceId} (8/2026) para ${item.name}`);
    }

    const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!inv) {
      console.error(`❌ Factura ID ${invoiceId} no encontrada`);
      continue;
    }

    // 1. Crear Pago MercadoPago
    const payment = await prisma.payment.create({
      data: {
        invoiceId: inv.id,
        method: 'MERCADOPAGO',
        amountPaid: item.amount,
        lateFeeApplied: 0,
        userId: 1
      }
    });
    console.log(`✅ Pago ID ${payment.id} registrado | Monto: $${payment.amountPaid} | Método: ${payment.method}`);

    // 2. Crear Movimiento de Caja General
    const cashMov = await prisma.cashMovement.create({
      data: {
        type: 'IN',
        amount: item.amount,
        category: 'PAGO_FACTURA',
        description: `Cobro MERCADOPAGO - Factura #${inv.id} (${item.name})`,
        userId: 1
      }
    });
    console.log(`✅ Movimiento Caja ID ${cashMov.id} registrado | Monto: $${cashMov.amount}`);

    // 3. Actualizar factura a PAID
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
      where: { id: item.clientId },
      data: { status: 'ACTIVE' }
    });
    console.log(`✅ Cliente ID ${item.clientId} verificado como ACTIVE`);
  }

  console.log(`\n==================================================`);
  console.log(`🎉 ¡PROCESO DE LOTE 2 FINALIZADO CON ÉXITO!`);
  console.log(`==================================================\n`);

  await prisma.$disconnect();
}

processBatch2().catch(err => {
  console.error('Error procesando lote 2:', err);
  prisma.$disconnect();
  process.exit(1);
});
