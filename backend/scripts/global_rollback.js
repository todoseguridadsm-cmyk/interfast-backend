const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../.env' });
const prisma = new PrismaClient();

async function rollback() {
  const currentOperator = 'REGULARIZATION_SCRIPT';
  
  try {
    const badPayments = await prisma.payment.findMany({
      where: { operator: currentOperator }
    });

    console.log(`Encontrados ${badPayments.length} pagos para revertir...`);

    for (const p of badPayments) {
      await prisma.$transaction(async (tx) => {
        // 1. Revertir factura original
        await tx.invoice.update({
          where: { id: p.invoiceId },
          data: { status: 'PENDING', operator: null }
        });
        
        // 2. Borrar CashMovement
        await tx.cashMovement.deleteMany({
          where: { operator: currentOperator }
        });

        // 3. Borrar Payment
        await tx.payment.delete({
          where: { id: p.id }
        });
      });
      console.log(`Revertida factura ${p.invoiceId} (Pago MP: ${p.mpPaymentId})`);
    }

    // 4. Borrar facturas particionadas si existieran
    const deletedInvoices = await prisma.invoice.deleteMany({
      where: { createdBy: currentOperator }
    });
    console.log(`Borradas ${deletedInvoices.count} facturas fraccionadas.`);
    
    console.log("¡Rollback general exitoso!");
  } catch (err) {
    console.error("Error en rollback:", err.message);
  }
}

rollback().finally(() => prisma.$disconnect());
