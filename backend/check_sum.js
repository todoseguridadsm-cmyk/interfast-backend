const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cutoff = new Date('2026-08-03T00:00:00');

  const payments = await prisma.payment.findMany({
    where: { 
      paymentDate: { gte: cutoff },
      method: { startsWith: 'MERCADO' } 
    },
    include: { invoice: { include: { client: true } } }
  });

  let total = 0;
  console.log('--- Pagos MP hoy ---');
  payments.forEach(p => {
    total += p.amountPaid;
    console.log(`- ${p.invoice?.client?.name}: $${p.amountPaid} (Método: ${p.method})`);
  });
  console.log(`--------------------`);
  console.log(`TOTAL MP: $${total.toFixed(2)}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
