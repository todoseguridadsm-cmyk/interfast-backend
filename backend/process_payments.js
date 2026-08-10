const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processPayments() {
  const clientsToProcess = [
    { name: 'CONSORCIO B PRIV. PILAR', id: 217, invoiceId: 683, amount: 22990.12 },
    { name: 'CONSORCIO PROPIETARIOS B° PINAR DEL ESTE', id: 175, invoiceId: 654, amount: 22990.12 }
  ];

  console.log('--- INICIANDO PROCESO DE PAGO Y CAJA GENERAL ---');

  for (const item of clientsToProcess) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Procesando cliente: ${item.name} (ID: ${item.id})`);

    const client = await prisma.client.findUnique({
      where: { id: item.id },
      include: {
        invoices: {
          where: { status: 'PENDING' }
        }
      }
    });

    if (!client) {
      console.error(`❌ Cliente ID ${item.id} no encontrado.`);
      continue;
    }

    const inv = await prisma.invoice.findUnique({
      where: { id: item.invoiceId }
    });

    if (!inv) {
      console.error(`❌ Factura ID ${item.invoiceId} no encontrada.`);
      continue;
    }

    console.log(`📄 Factura actual ID: ${inv.id} | Periodo: ${inv.month}/${inv.year} | Monto original: $${inv.originalAmount} | Estado actual: ${inv.status}`);

    // 1. Crear Pago
    const payment = await prisma.payment.create({
      data: {
        invoiceId: inv.id,
        method: 'MERCADOPAGO',
        amountPaid: item.amount,
        lateFeeApplied: 0,
        userId: 1
      }
    });
    console.log(`✅ Pago creado ID: ${payment.id} | Monto: $${payment.amountPaid} | Método: ${payment.method}`);

    // 2. Crear Movimiento de Caja General
    const cashMov = await prisma.cashMovement.create({
      data: {
        type: 'IN',
        amount: item.amount,
        category: 'PAGO_FACTURA',
        description: `Cobro MERCADOPAGO - Factura #${inv.id} (${client.name})`,
        userId: 1
      }
    });
    console.log(`✅ Movimiento de Caja General registrado ID: ${cashMov.id} | Tipo: ${cashMov.type} | Monto: $${cashMov.amount} | Categoría: ${cashMov.category}`);

    // 3. Actualizar estado de Factura a PAID
    const updatedInvoice = await prisma.invoice.update({
      where: { id: inv.id },
      data: { status: 'PAID' }
    });
    console.log(`✅ Factura ID ${updatedInvoice.id} actualizada a estado: ${updatedInvoice.status}`);

    // 4. Limpiar CutoffList si existía
    const deletedCutoffs = await prisma.cutoffList.deleteMany({
      where: { invoiceId: inv.id }
    });
    if (deletedCutoffs.count > 0) {
      console.log(`✅ Removido de lista de corte (CutoffList count: ${deletedCutoffs.count})`);
    }

    // 5. Asegurar estado activo del cliente
    await prisma.client.update({
      where: { id: client.id },
      data: { status: 'ACTIVE' }
    });
    console.log(`✅ Estado del cliente ID ${client.id} verificado como ACTIVE`);
  }

  console.log(`\n==================================================`);
  console.log(`🎉 Proceso completado exitosamente para ambos clientes.`);
  console.log(`==================================================\n`);

  await prisma.$disconnect();
}

processPayments().catch(err => {
  console.error('Error procesando pagos:', err);
  prisma.$disconnect();
  process.exit(1);
});
