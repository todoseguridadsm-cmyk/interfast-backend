const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== ELIMINANDO REGISTROS DEL 30/7 Y 31/7 EN CIERRE Y ARQUEO DIARIO ===");

  const targetNames = [
    "RODRIGUEZ ANGELINA",
    "ZARANDON DARIO",
    "CAÑA MARIBEL",
    "VAQUER LEANDRO",
    "MAZARA DOMINGO",
    "MAZARA DAVID",
    "PATRICIA GOMEZ",
    "ROVIGATTI MARTIN",
    "FALCON ROMINA",
    "SANCHEZ MEDINA GABRIEL DARIO",
    "GONZALEZ ARTURO",
    "FUNDACION C.I.O.M.A",
    "PATRICIA SILVANA SFREDDO",
    "OLIVERE FABIANA",
    "MACHADO MARTIN",
    "MERCADO AGUSTINA",
    "MARIA FERNANDA NIETO",
    "FALCONI MARIO"
  ];

  // Buscar clientes coincidentes
  const clients = await prisma.client.findMany({
    where: {
      OR: targetNames.map(name => ({
        name: { contains: name, mode: 'insensitive' }
      }))
    }
  });

  const clientIds = clients.map(c => c.id);
  console.log(`Encontrados ${clients.length} clientes coincidentes. IDs:`, clientIds);

  // Definir rango de fechas (30 de Julio y 31 de Julio de 2026)
  const startDate = new Date('2026-07-29T00:00:00.000Z');
  const endDate = new Date('2026-07-31T23:59:59.999Z');

  // 1. Buscar pagos vinculados a estos clientes en ese rango
  const paymentsToDelete = await prisma.payment.findMany({
    where: {
      invoice: { clientId: { in: clientIds } },
      paymentDate: { gte: startDate, lte: endDate }
    },
    include: { invoice: { include: { client: true } } }
  });

  console.log(`Pagos encontrados del 30/7 y 31/7 para eliminar: ${paymentsToDelete.length}`);
  for (const p of paymentsToDelete) {
    console.log(`- Eliminando Pago ID ${p.id}: $${p.amountPaid} (${p.method}) - Cliente: ${p.invoice?.client?.name || 'Cliente'}`);
    
    // Cambiar el estado de la factura de vuelta a PENDING si fue marcadas como PAID por este pago
    if (p.invoiceId) {
      await prisma.invoice.update({
        where: { id: p.invoiceId },
        data: { status: 'PENDING' }
      });
    }

    await prisma.payment.delete({ where: { id: p.id } });
  }

  // 2. Buscar movimientos manuales si los hubiere en el rango
  const movementsToDelete = await prisma.cashMovement.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      OR: targetNames.map(name => ({
        description: { contains: name, mode: 'insensitive' }
      }))
    }
  });

  console.log(`Movimientos de caja manuales encontrados para eliminar: ${movementsToDelete.length}`);
  for (const m of movementsToDelete) {
    console.log(`- Eliminando Movimiento ID ${m.id}: $${m.amount} - ${m.description}`);
    await prisma.cashMovement.delete({ where: { id: m.id } });
  }

  console.log("✅ Eliminación completada. Cierre y Arqueo Diario ya no sumará estos registros.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
