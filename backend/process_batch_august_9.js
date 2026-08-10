const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processBatchAugust9() {
  const items = [
    { clientId: 200, invoiceId: 515, name: 'ADRIANA ELISA PETIOT', amount: 22992.00 },
    { clientId: 177, invoiceId: 665, name: 'SILVIA ELVIRA PALACIOS', amount: 22991.77 },
    { clientId: 145, invoiceId: 628, name: 'LUIS HECTOR MORENO', amount: 22991.45 },
    { clientId: 133, invoiceId: 633, name: 'FABIAN NICOLAS AVILA', amount: 22990.00 },
    { clientId: 104, invoiceId: 516, name: 'MERLO ELIZABETH', amount: 22991.04 },
    { clientId: 61,  invoiceId: 568, name: 'LUIS ANTENOR SALINAS', amount: 22990.61 },
    { clientId: 58,  invoiceId: 565, name: 'ANA ROCIO CHIMENDO', amount: 22990.59 },
    { clientId: 107, invoiceId: 620, name: 'ADRIAN LEONEL GAVIOLA', amount: 22991.07 },
    { clientId: 44,  invoiceId: 534, name: 'MATEO MARCELO JAVIER', amount: 22990.44 }
  ];

  console.log('=== INICIANDO PROCESO REGISTRO DE 9 PAGOS (MERCADOPAGO & CAJA GENERAL) ===\n');
  let totalProcessedAmount = 0;

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
    console.log(`✅ Cliente ID ${item.clientId} verificado/actualizado como ACTIVE`);

    totalProcessedAmount += item.amount;
  }

  console.log(`\n==================================================`);
  console.log(`🎉 ¡PROCESO FINALIZADO CON ÉXITO!`);
  console.log(`Total abonado e ingresado a Cajas: $${totalProcessedAmount.toFixed(2)}`);
  console.log(`==================================================\n`);

  await prisma.$disconnect();
}

processBatchAugust9().catch(err => {
  console.error('Error procesando lote de pagos:', err);
  prisma.$disconnect();
  process.exit(1);
});
