const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== AJUSTANDO PAGOS DE MARIA FERNANDA NIETO Y MORALES ===");

  const adminUser = await prisma.user.findFirst({ where: { username: 'tkip' } });
  const userId = adminUser ? adminUser.id : 1;

  // 1. MARIA FERNANDA NIETO (ID: 77)
  const nietoClient = await prisma.client.findFirst({
    where: { OR: [{ id: 77 }, { name: { contains: 'FERNANDA NIETO', mode: 'insensitive' } }] }
  });

  if (nietoClient) {
    console.log(`Cliente encontrado: ID ${nietoClient.id} ("${nietoClient.name}")`);

    // Factura Mes 07/2026
    let invJul = await prisma.invoice.findFirst({
      where: { clientId: nietoClient.id, month: 7, year: 2026 }
    });
    if (invJul) {
      await prisma.invoice.update({ where: { id: invJul.id }, data: { status: 'PAID' } });
      const pJul = await prisma.payment.findFirst({ where: { invoiceId: invJul.id } });
      if (pJul) {
        await prisma.payment.update({ where: { id: pJul.id }, data: { amountPaid: 26900.77, method: 'MERCADOPAGO' } });
      } else {
        await prisma.payment.create({
          data: { invoiceId: invJul.id, method: 'MERCADOPAGO', amountPaid: 26900.77, paymentDate: new Date('2026-07-30T12:00:00.000Z'), userId, operator: 'MERCADOPAGO' }
        });
      }
      console.log(`✅ Mes 07/2026 de MARIA FERNANDA NIETO ajustado a $26,900.77 (PAID).`);
    }

    // Factura Mes 08/2026
    let invAug = await prisma.invoice.findFirst({
      where: { clientId: nietoClient.id, month: 8, year: 2026 }
    });
    if (invAug) {
      await prisma.invoice.update({ where: { id: invAug.id }, data: { status: 'PAID' } });
      const pAug = await prisma.payment.findFirst({ where: { invoiceId: invAug.id } });
      if (pAug) {
        await prisma.payment.update({ where: { id: pAug.id }, data: { amountPaid: 22990.77, method: 'MERCADOPAGO' } });
      } else {
        await prisma.payment.create({
          data: { invoiceId: invAug.id, method: 'MERCADOPAGO', amountPaid: 22990.77, paymentDate: new Date(), userId, operator: 'MERCADOPAGO' }
        });
      }
      console.log(`✅ Mes 08/2026 de MARIA FERNANDA NIETO ajustado a $22,990.77 (PAID).`);
    }
  }

  // 2. MORALES BETINA EMILSE (ID: 118)
  const moralesClient = await prisma.client.findFirst({
    where: { id: 118 }
  });
  if (moralesClient) {
    let invAugM = await prisma.invoice.findFirst({
      where: { clientId: moralesClient.id, month: 8, year: 2026 }
    });
    if (invAugM) {
      await prisma.invoice.update({ where: { id: invAugM.id }, data: { status: 'PAID' } });
      const pAugM = await prisma.payment.findFirst({ where: { invoiceId: invAugM.id } });
      if (pAugM) {
        await prisma.payment.update({ where: { id: pAugM.id }, data: { amountPaid: 22991.18, method: 'MERCADOPAGO' } });
      } else {
        await prisma.payment.create({
          data: { invoiceId: invAugM.id, method: 'MERCADOPAGO', amountPaid: 22991.18, paymentDate: new Date(), userId, operator: 'MERCADOPAGO' }
        });
      }
      console.log(`✅ Mes 08/2026 de MORALES BETINA EMILSE ajustado a $22,991.18 (PAID).`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
