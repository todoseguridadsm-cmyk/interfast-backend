const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processBatch3() {
  const items = [
    { clientId: 128, invoiceId: 619, name: 'ELIANA VANESA VILLEGAS', amount: 22991.28 },
    { clientId: 98,  invoiceId: 578, name: 'DE CHAZAL NEGRI JUAN MANUEL', amount: 22990.00 },
    { clientId: 209, invoiceId: 674, name: 'MARIA ALEJANDRA PEREIRA', amount: 22992.09 },
    { clientId: 36,  invoiceId: 533, name: 'DANIEL IVAN GUELI', amount: 22990.36 },
    { clientId: 82,  invoiceId: 596, name: 'FRANCO AGUSTIN CORVALAN', amount: 22990.83 },
    { clientId: 110, invoiceId: 606, name: 'ARCE GUSTAVO ARIEL-( ESTELA TONELLI )', amount: 22990.00 },
    { clientId: 106, invoiceId: 610, name: 'VALENTINO GENTILE MICHELI', amount: 22990.00 },
    { clientId: 124, invoiceId: 605, name: 'SANCHEZ MARIA', amount: 22991.24 },
    { clientId: 195, invoiceId: 687, name: 'PETRI BRUNELLA', amount: 22991.95 },
    { clientId: 215, invoiceId: 691, name: 'HECTOR RAMON ROGGERONE', amount: 22992.15 },
    { clientId: 78,  invoiceId: 588, name: 'SANDRA ELIZABETH CASTILLO', amount: 22990.00 }
  ];

  console.log('=== INICIANDO PROCESO LOTE 3 (11 PAGOS MERCADOPAGO & CAJA GENERAL) ===\n');

  for (const item of items) {
    console.log(`--------------------------------------------------`);
    console.log(`Procesando: ${item.name} (Cliente ID: ${item.clientId}) | Monto: $${item.amount}`);

    const inv = await prisma.invoice.findUnique({ where: { id: item.invoiceId } });
    if (!inv) {
      console.error(`❌ Factura ID ${item.invoiceId} no encontrada`);
      continue;
    }

    // 1. Crear Registro de Pago MercadoPago
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
      where: { id: item.clientId },
      data: { status: 'ACTIVE' }
    });
    console.log(`✅ Cliente ID ${item.clientId} verificado como ACTIVE`);
  }

  console.log(`\n==================================================`);
  console.log(`🎉 ¡PROCESO DE LOTE 3 FINALIZADO CON ÉXITO!`);
  console.log(`==================================================\n`);

  await prisma.$disconnect();
}

processBatch3().catch(err => {
  console.error('Error procesando lote 3:', err);
  prisma.$disconnect();
  process.exit(1);
});
