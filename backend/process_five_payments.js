const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processFivePayments() {
  const items = [
    { clientId: 8,   invoiceId: 499, name: 'ALLISIARDI FEDERICO MARTIN', amount: 22990.09 },
    { clientId: 97,  invoiceId: 576, name: 'LUCERO MERCEDES GLADYS',     amount: 24371.00 },
    { clientId: 6,   invoiceId: 494, name: 'ADARO RAUL',                 amount: 22990.07 },
    { clientId: 212, invoiceId: 673, name: 'LIRA PAEZ AGUSTIN NICOLAS',  amount: 22992.12 },
    { clientId: 158, invoiceId: 635, name: 'BARRERA DIEGO',              amount: 22990.00 }
  ];

  console.log('=== INICIANDO REGISTRO DE 5 PAGOS EN MERCADOPAGO Y CAJA GENERAL ===\n');
  
  // Verify User 1 exists or fetch first user
  let user = await prisma.user.findFirst();
  const userId = user ? user.id : 1;
  console.log(`Utilizando userId: ${userId} (${user ? user.username : 'Default'})\n`);

  let totalProcessedAmount = 0;

  for (const item of items) {
    console.log(`--------------------------------------------------`);
    console.log(`Procesando: ${item.name} (Cliente ID: ${item.clientId}) | Monto: $${item.amount}`);

    const inv = await prisma.invoice.findUnique({ where: { id: item.invoiceId } });
    if (!inv) {
      console.error(`❌ Factura ID ${item.invoiceId} no encontrada`);
      continue;
    }

    if (inv.status === 'PAID') {
      console.log(`⚠️ Factura #${inv.id} ya se encontraba PAGADA.`);
      continue;
    }

    // 1. Crear Registro de Pago MercadoPago
    const payment = await prisma.payment.create({
      data: {
        invoiceId: inv.id,
        method: 'MERCADOPAGO',
        amountPaid: item.amount,
        lateFeeApplied: 0,
        userId: userId
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
        userId: userId
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
    console.log(`✅ Cliente ID ${item.clientId} verificado/actualizado como ACTIVE`);

    totalProcessedAmount += item.amount;
  }

  console.log(`\n==================================================`);
  console.log(`🎉 ¡PROCESO FINALIZADO CON ÉXITO!`);
  console.log(`Total abonado e ingresado a Cajas: $${totalProcessedAmount.toFixed(2)}`);
  console.log(`==================================================\n`);

  await prisma.$disconnect();
}

processFivePayments().catch(err => {
  console.error('Error procesando lote de pagos:', err);
  prisma.$disconnect();
  process.exit(1);
});
