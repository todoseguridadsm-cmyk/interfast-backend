const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFalcon() {
  const invoiceId = 600;
  const clientId = 109;
  const transactionAmount = 26901;
  const invoiceAmount = 22990;
  const difference = transactionAmount - invoiceAmount;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Borrar el pago espurio de OTRO_SISTEMA (id: 647)
      await tx.payment.deleteMany({
        where: { id: 647 }
      });

      // 2. Crear el Payment real de MP
      await tx.payment.create({
        data: {
          invoiceId: invoiceId,
          method: 'MERCADOPAGO',
          amountPaid: transactionAmount,
          paymentDate: new Date('2026-08-31T17:23:00-03:00'),
          userId: 1
        }
      });

      // 3. Crear el Movimiento de Caja real (Arqueo)
      await tx.cashMovement.create({
        data: {
          type: 'IN',
          amount: transactionAmount,
          category: 'PAGO_FACTURA',
          description: `Cobro MP Webhook Fix - Factura #${invoiceId} (FALCON ROMINA)`,
          createdAt: new Date('2026-08-31T17:23:00-03:00'),
          userId: 1
        }
      });

      // 4. Saldo a favor (WalletBalance)
      if (difference > 0) {
        await tx.client.update({
          where: { id: clientId },
          data: { walletBalance: { increment: difference } }
        });
      }
    });
    console.log(`✅ Arreglado correctamente el pago de Falcon Romina.`);
    console.log(`- Pago de $${transactionAmount} ingresado.`);
    console.log(`- Arqueo de caja actualizado.`);
    console.log(`- Saldo a favor agregado: $${difference}`);
  } catch (err) {
    console.error("Error arreglando el pago:", err);
  }
}

fixFalcon().finally(() => prisma.$disconnect());
