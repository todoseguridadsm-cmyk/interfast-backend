const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const invoiceIdsToRevert = [873, 757, 738, 866, 741, 849, 804];

async function run() {
  console.log("Iniciando Rollback de transacciones accidentales...");
  for (const invId of invoiceIdsToRevert) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Revertir status de factura
        await tx.invoice.update({
          where: { id: invId },
          data: { status: 'PENDING', operator: null }
        });
        
        // 2. Borrar Payment
        await tx.payment.deleteMany({
          where: { invoiceId: invId, operator: 'REGULARIZATION_SCRIPT' }
        });

        // 3. Borrar CashMovement
        const descPrefix = `Cobro MP Regularizado - Factura #${invId}`;
        await tx.cashMovement.deleteMany({
          where: { description: { startsWith: descPrefix } }
        });
      });
      console.log(`Rollback exitoso para factura #${invId}`);
    } catch (e) {
      console.error(`Error revirtiendo factura #${invId}:`, e.message);
    }
  }
}
run().finally(() => prisma.$disconnect());
