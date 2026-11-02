const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyPayment() {
  console.log("=== INICIANDO CARGA DE PAGO PARA ANGLADA HILDA DEL CARMEN ===");

  const clientId = 179;
  const invoiceId = 1016;
  const amount = 23991.80;
  const paymentDate = new Date('2026-10-08T23:47:00.000Z'); // 20:47 hs en Argentina (UTC-3)
  const mpPaymentId = '183178584856';
  const payerName = 'SERGIO ROBERTO SEGURA';

  // 1. Validar cliente y factura
  const client = await prisma.client.findUnique({
    where: { id: clientId }
  });
  if (!client) {
    throw new Error(`Cliente ID ${clientId} no encontrado`);
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId }
  });
  if (!invoice) {
    throw new Error(`Factura ID ${invoiceId} no encontrada`);
  }

  console.log(`Cliente: ${client.name} (DNI: ${client.dni})`);
  console.log(`Factura: #${invoice.id} - Período: ${invoice.month}/${invoice.year} - Monto original: $${invoice.originalAmount} - Estado actual: ${invoice.status}`);

  // 2. Ejecutar transacción atómica
  const result = await prisma.$transaction(async (tx) => {
    // a. Crear Pago
    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        method: 'MERCADOPAGO',
        amountPaid: amount,
        lateFeeApplied: 0,
        paymentDate: paymentDate,
        userId: 1,
        mpFee: 0,
        mpTax: 0,
        mpPaymentId: mpPaymentId,
        operator: 'MERCADOPAGO'
      }
    });

    // b. Actualizar estado de la Factura
    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        operator: 'MERCADOPAGO'
      }
    });

    // c. Asentar en Movimientos de Caja General / MP
    const cashMov = await tx.cashMovement.create({
      data: {
        type: 'IN',
        amount: amount,
        category: 'PAGO_FACTURA',
        description: `Cobro MP - Factura #${invoice.id} (${client.name} - ${payerName})`,
        operator: 'MERCADOPAGO',
        userId: 1,
        createdAt: paymentDate,
        externalTransactionId: mpPaymentId
      }
    });

    // d. Eliminar de pagos no identificados si existía
    const deletedUnidentified = await tx.unidentifiedPayment.deleteMany({
      where: {
        OR: [
          { id: 128 },
          { mpPaymentId: mpPaymentId }
        ]
      }
    });

    // e. Limpiar listas de corte
    await tx.cutoffList.deleteMany({
      where: {
        OR: [
          { invoiceId: invoice.id },
          { clientId: client.id }
        ]
      }
    });

    // f. Asegurar cliente activo
    const updatedClient = await tx.client.update({
      where: { id: client.id },
      data: { status: 'ACTIVE' }
    });

    return { payment, updatedInvoice, cashMov, deletedUnidentified, updatedClient };
  });

  console.log("\n✅ Transacción completada con éxito:");
  console.log(`- Pago creado: ID #${result.payment.id} | Monto: $${result.payment.amountPaid} | Fecha: ${result.payment.paymentDate.toISOString()} | MP ID: ${result.payment.mpPaymentId}`);
  console.log(`- Factura actualizada: ID #${result.updatedInvoice.id} | Estado: ${result.updatedInvoice.status}`);
  console.log(`- Movimiento de Caja registrado: ID #${result.cashMov.id} | Tipo: ${result.cashMov.type} | Monto: $${result.cashMov.amount} | Categoría: ${result.cashMov.category}`);
  console.log(`- Pagos no identificados eliminados: ${result.deletedUnidentified.count}`);
  console.log(`- Estado cliente: ${result.updatedClient.status}`);

  // Intentar desbloqueo Mikrotik si aplica
  if (client.ipNumber) {
    try {
      const mikrotik = require('./mikrotik');
      const targetNode = client.mainNode || 'Borde';
      await mikrotik.removeIpFromCutoffList(client.ipNumber, targetNode);
      console.log(`- Mikrotik: IP ${client.ipNumber} removida de cortes en nodo ${targetNode}`);
    } catch (mikrotikErr) {
      console.log(`- Aviso Mikrotik: ${mikrotikErr.message}`);
    }
  }

  // 3. Verificación de Arqueo y Cajas para el 08/10/2026
  const dateStr = '2026-10-08';
  const [year, month, day] = dateStr.split('-');
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  const dayPayments = await prisma.payment.findMany({
    where: {
      paymentDate: { gte: startOfDay, lte: endOfDay },
      method: { not: 'OTRO_SISTEMA' }
    }
  });

  const mpPayments = dayPayments.filter(p => (p.method || '').toUpperCase().includes('MERCADO'));
  const totalMp = mpPayments.reduce((s, p) => s + p.amountPaid, 0);

  const dayMovements = await prisma.cashMovement.findMany({
    where: {
      createdAt: { gte: startOfDay, lte: endOfDay }
    }
  });

  console.log("\n📊 IMPACTO EN CAJAS DEL 08/10/2026:");
  console.log(`- Total cobros MercadoPago en el día: $${totalMp.toLocaleString('es-AR', { minimumFractionDigits: 2 })} (${mpPayments.length} pagos)`);
  console.log(`- Total movimientos asentados en el día: ${dayMovements.length}`);

  await prisma.$disconnect();
}

applyPayment().catch(err => {
  console.error("❌ ERROR AL APLICAR PAGO:", err);
  prisma.$disconnect();
  process.exit(1);
});
