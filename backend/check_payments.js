const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const payments = await prisma.payment.findMany({
    where: { paymentDate: { gte: today } },
    include: {
      invoice: {
        include: { client: true }
      }
    },
    orderBy: { paymentDate: 'desc' }
  });

  console.log(`Pagos de hoy (${payments.length}):`);
  payments.forEach(p => {
    console.log(`[${p.id}] $${p.amountPaid} - ${p.method} - ${p.paymentDate} - ${p.invoice?.client?.name}`);
  });

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
