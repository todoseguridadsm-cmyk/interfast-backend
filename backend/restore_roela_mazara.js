const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== RESTAURANDO PAGOS DE BANCO ROELA PARA MAZARA DAVID Y MAZARA DOMINGO ===");

  const adminUser = await prisma.user.findFirst({ where: { username: 'tkip' } });
  const userId = adminUser ? adminUser.id : 1;

  // 1. Mazara David (ID: 46)
  const davidClient = await prisma.client.findFirst({
    where: { OR: [{ id: 46 }, { name: { contains: 'MAZARA DAVID', mode: 'insensitive' } }] }
  });
  if (davidClient) {
    const davidInvoice = await prisma.invoice.findFirst({
      where: { clientId: davidClient.id },
      orderBy: { id: 'desc' }
    });
    if (davidInvoice) {
      await prisma.invoice.update({
        where: { id: davidInvoice.id },
        data: { status: 'PAID' }
      });
      const pDavid = await prisma.payment.create({
        data: {
          invoiceId: davidInvoice.id,
          method: 'BANCO_ROELA',
          amountPaid: 22990.46,
          paymentDate: new Date('2026-07-30T23:39:00.000Z'),
          userId: userId,
          operator: 'BANCO_ROELA'
        }
      });
      console.log(`✅ Restaurado Pago Banco Roela MAZARA DAVID (ID Pago: ${pDavid.id}) por $22,990.46`);
    }
  }

  // 2. Mazara Domingo (ID: 47)
  const domingoClient = await prisma.client.findFirst({
    where: { OR: [{ id: 47 }, { name: { contains: 'MAZARA DOMINGO', mode: 'insensitive' } }] }
  });
  if (domingoClient) {
    const domingoInvoice = await prisma.invoice.findFirst({
      where: { clientId: domingoClient.id },
      orderBy: { id: 'desc' }
    });
    if (domingoInvoice) {
      await prisma.invoice.update({
        where: { id: domingoInvoice.id },
        data: { status: 'PAID' }
      });
      const pDomingo = await prisma.payment.create({
        data: {
          invoiceId: domingoInvoice.id,
          method: 'BANCO_ROELA',
          amountPaid: 22990.47,
          paymentDate: new Date('2026-07-30T23:39:00.000Z'),
          userId: userId,
          operator: 'BANCO_ROELA'
        }
      });
      console.log(`✅ Restaurado Pago Banco Roela MAZARA DOMINGO (ID Pago: ${pDomingo.id}) por $22,990.47`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
