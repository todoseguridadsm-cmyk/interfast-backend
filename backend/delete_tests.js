const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanTests() {
  try {
    // Definimos el inicio del día de hoy como límite.
    // Estamos a 30 de Mayo de 2026.
    const cutoffDate = new Date('2026-05-30T00:00:00.000Z');

    console.log(`Límite para borrado: todo lo anterior a ${cutoffDate.toISOString()}`);

    // 1. Borrar movimientos de caja
    const deletedMovements = await prisma.cashMovement.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });
    console.log(`Borrados ${deletedMovements.count} movimientos de caja diarios.`);

    // 2. Encontrar todos los pagos anteriores a hoy
    const oldPayments = await prisma.payment.findMany({
      where: {
        paymentDate: {
          lt: cutoffDate
        }
      }
    });

    const invoiceIdsToReset = [...new Set(oldPayments.map(p => p.invoiceId))];

    // 3. Borrar los pagos de la tabla Payment
    const deletedPayments = await prisma.payment.deleteMany({
      where: {
        paymentDate: {
          lt: cutoffDate
        }
      }
    });
    console.log(`Borrados ${deletedPayments.count} pagos de facturas.`);

    // 4. Resetear el estado de las facturas a PENDING
    if (invoiceIdsToReset.length > 0) {
      const resetInvoices = await prisma.invoice.updateMany({
        where: {
          id: {
            in: invoiceIdsToReset
          }
        },
        data: {
          status: 'PENDING'
        }
      });
      console.log(`Se resetearon ${resetInvoices.count} facturas a estado PENDING.`);
    }

    console.log("Limpieza terminada con éxito.");
  } catch (error) {
    console.error("Error durante la limpieza:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanTests();
