const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const operator = 'CARGA_MANUAL_SISTEMA';

  // 1. GUEVARA LILIANA LOURDES
  console.log('Procesando pago GUEVARA...');
  const inv1 = await prisma.invoice.findFirst({
    where: { clientId: 130, month: 9 }
  });

  if (inv1) {
    if (inv1.status !== 'PAID') {
      const amount1 = inv1.priceV1 || inv1.originalAmount;
      await prisma.$transaction([
        prisma.payment.create({
          data: {
            amountPaid: amount1,
            method: 'MERCADOPAGO',
            operator: operator,
            paymentDate: new Date('2026-09-03T17:51:00-03:00'),
            invoiceId: inv1.id
          }
        }),
        prisma.invoice.update({
          where: { id: inv1.id },
          data: { status: 'PAID', operator: operator }
        }),
        prisma.cashMovement.create({
          data: {
            type: 'IN',
            amount: amount1,
            category: 'PAGO_FACTURA',
            description: `Ingreso MP Pago de AILIN EMILIANA ANDRADA para GUEVARA LILIANA LOURDES`,
            operator: operator,
            userId: 1,
            createdAt: new Date('2026-09-03T17:51:00-03:00')
          }
        })
      ]);
      console.log(`Pago 1 (GUEVARA LILIANA LOURDES, Factura ${inv1.id}) cargado por $${amount1}.`);
    } else {
      console.log('La factura de GUEVARA ya figura como PAGADA.');
    }
  } else {
    console.log('No se encontró factura del mes 9 para GUEVARA.');
  }

  // 2. GUELI JUAN CARLOS (LOCAL)
  console.log('Procesando pago GUELI...');
  const inv2 = await prisma.invoice.findFirst({
    where: { clientId: 196, month: 9 }
  });

  if (inv2) {
    if (inv2.status !== 'PAID') {
      const amount2 = 24371.97;
      await prisma.$transaction([
        prisma.payment.create({
          data: {
            amountPaid: amount2,
            method: 'MERCADOPAGO',
            operator: operator,
            paymentDate: new Date('2026-09-14T18:37:00-03:00'),
            invoiceId: inv2.id
          }
        }),
        prisma.invoice.update({
          where: { id: inv2.id },
          data: { status: 'PAID', operator: operator }
        }),
        prisma.cashMovement.create({
          data: {
            type: 'IN',
            amount: amount2,
            category: 'PAGO_FACTURA',
            description: `Ingreso MP Pago de CLAUDIO JORGE GASET para GUELI JUAN CARLOS (LOCAL)`,
            operator: operator,
            userId: 1,
            createdAt: new Date('2026-09-14T18:37:00-03:00')
          }
        })
      ]);
      console.log(`Pago 2 (GUELI JUAN CARLOS, Factura ${inv2.id}) cargado por $${amount2}.`);
    } else {
      console.log('La factura de GUELI ya figura como PAGADA.');
    }
  } else {
    console.log('No se encontró factura del mes 9 para GUELI.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
