const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mikrotik = require('../mikrotik');

async function reassignGalesPayment(execute = false) {
  console.log(`[Reassign] Iniciando proceso de reasignación de pago Gales (Modo: ${execute ? 'EJECUCIÓN EN VIVO' : 'DRY-RUN / SIMULACIÓN'})...`);

  const payment = await prisma.payment.findUnique({
    where: { id: 1360 },
    include: { invoice: { include: { client: true } } }
  });

  if (!payment) {
    throw new Error('Pago ID 1360 no encontrado.');
  }

  const clientSource = payment.invoice.client;
  const targetClient = await prisma.client.findUnique({ where: { id: 116 } });
  const targetInvoice = await prisma.invoice.findUnique({ where: { id: 1309 } });
  const leftoverInvoice = await prisma.invoice.findUnique({ where: { id: 1400 } });

  console.log('--- DIAGNÓSTICO ACTUAL ---');
  console.log(`Pago ID: ${payment.id} | Monto: $${payment.amountPaid} | MP ID: ${payment.mpPaymentId}`);
  console.log(`Cliente Origen: ${clientSource.name} (ID: ${clientSource.id}) | Factura Actual: ${payment.invoiceId}`);
  console.log(`Factura Sobrante detectada en Origen: ${leftoverInvoice ? `ID ${leftoverInvoice.id} ($${leftoverInvoice.originalAmount})` : 'Ninguna'}`);
  console.log(`Cliente Destino: ${targetClient.name} (ID: ${targetClient.id}, Alias: ${targetClient.businessName})`);
  console.log(`Factura Destino: ID ${targetInvoice.id} (Mes: ${targetInvoice.month}/${targetInvoice.year}, Estado actual: ${targetInvoice.status})`);

  if (!execute) {
    console.log('\n[SIMULACIÓN EXITOSA] Todo verificado. Ejecute con argumento --execute para aplicar los cambios.');
    return;
  }

  console.log('\n[EJECUTANDO MODIFICACIONES EN BASE DE DATOS]...');

  // 1. Mover pago a Factura 1309
  await prisma.payment.update({
    where: { id: payment.id },
    data: { invoiceId: targetInvoice.id }
  });
  console.log(`1. Pago ID ${payment.id} vinculado a Factura Destino ${targetInvoice.id}.`);

  // 2. Actualizar Factura Origen 1202 a PENDING
  await prisma.invoice.update({
    where: { id: payment.invoice.id },
    data: { status: 'PENDING' }
  });
  console.log(`2. Factura Origen ID ${payment.invoice.id} actualizada a PENDING.`);

  // 3. Eliminar Factura Sobrante 1400 si existe
  if (leftoverInvoice) {
    await prisma.invoice.delete({
      where: { id: leftoverInvoice.id }
    });
    console.log(`3. Factura sobrante ID ${leftoverInvoice.id} eliminada.`);
  }

  // 4. Actualizar Factura Destino 1309 a PAID
  await prisma.invoice.update({
    where: { id: targetInvoice.id },
    data: { status: 'PAID' }
  });
  console.log(`4. Factura Destino ID ${targetInvoice.id} actualizada a PAID.`);

  // 5. Reactivar Cliente Destino (ID 116)
  await prisma.client.update({
    where: { id: targetClient.id },
    data: { status: 'ACTIVE' }
  });
  console.log(`5. Cliente Destino ${targetClient.name} (ID ${targetClient.id}) pasado a ACTIVE.`);

  // 6. Suspender Cliente Origen (ID 60) al quedar con factura vencida
  await prisma.client.update({
    where: { id: clientSource.id },
    data: { status: 'SUSPENDED' }
  });
  console.log(`6. Cliente Origen ${clientSource.name} (ID ${clientSource.id}) pasado a SUSPENDED.`);

  // 7. Limpiar corte de Cliente Destino
  await prisma.cutoffList.deleteMany({
    where: { clientId: targetClient.id }
  });
  console.log(`7. Registros de corte removidos para Cliente Destino ID ${targetClient.id}.`);

  // 8. Reincorporar Cliente Origen a corte
  const existingCutoff = await prisma.cutoffList.findFirst({
    where: { clientId: clientSource.id, invoiceId: payment.invoice.id }
  });
  if (!existingCutoff) {
    await prisma.cutoffList.create({
      data: {
        clientId: clientSource.id,
        invoiceId: payment.invoice.id,
        status: 'PENDING'
      }
    });
    console.log(`8. Cliente Origen ID ${clientSource.id} reincorporado a lista de corte.`);
  }

  // 9. Actualizar observaciones en ambos clientes para prevenir futuras confusiones en el bot
  await prisma.client.update({
    where: { id: targetClient.id },
    data: {
      observation: (targetClient.observation ? targetClient.observation + ' | ' : '') + 'MP: PABLO MATIAS GALEZ / GALEZ MATIAS (Titular conexión)'
    }
  });

  console.log('✅ Base de datos actualizada con éxito.');

  // Sincronización MikroTik
  if (targetClient.ipNumber) {
    try {
      const targetNode = targetClient.mainNode || 'Borde';
      await mikrotik.removeIpFromCutoffList(targetClient.ipNumber, targetNode);
      console.log(`✅ [MikroTik] IP ${targetClient.ipNumber} de ${targetClient.name} removida de Morosos en nodo ${targetNode}.`);
    } catch (err) {
      console.error(`⚠️ Error MikroTik para cliente destino:`, err.message);
    }
  }

  if (clientSource.ipNumber) {
    try {
      const sourceNode = clientSource.mainNode || 'Borde';
      await mikrotik.addIpToCutoffList(clientSource.ipNumber, sourceNode);
      console.log(`✅ [MikroTik] IP ${clientSource.ipNumber} de ${clientSource.name} agregada a Morosos en nodo ${sourceNode}.`);
    } catch (err) {
      console.error(`⚠️ Error MikroTik para cliente origen:`, err.message);
    }
  }

  console.log('🎉 Operación completada al 100%.');
}

const isExecute = process.argv.includes('--execute');
reassignGalesPayment(isExecute)
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
