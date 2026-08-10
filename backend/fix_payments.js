const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processPayment(name, amountPaid) {
  console.log(`\nBuscando a ${name}...`);
  const client = await prisma.client.findFirst({
    where: { name: { contains: name, mode: 'insensitive' } },
    select: { id: true, name: true }
  });

  if (!client) {
    console.log(`❌ No encontrado: ${name}`);
    return;
  }
  console.log(`✅ Cliente: ${client.name} (ID: ${client.id})`);

  const invoices = await prisma.invoice.findMany({
    where: { clientId: client.id, status: { in: ['PENDING', 'PARTIAL'] } },
    orderBy: { createdAt: 'desc' }
  });

  if (invoices.length === 0) {
    console.log(`❌ Sin facturas pendientes`);
    return;
  }

  const inv = invoices[0];

  const payment = await prisma.payment.create({
    data: {
      invoiceId: inv.id,
      amountPaid: amountPaid,
      method: 'MERCADOPAGO',
      paymentDate: new Date(),
    }
  });

  const updatedInvoice = await prisma.invoice.update({
    where: { id: inv.id },
    data: { status: 'PAID' }
  });

  console.log(`✅ Pago registrado! Factura de ${client.name} ahora es PAID. Monto: $${amountPaid}`);
}

async function main() {
  await processPayment('CHINI SANDRA', 22900);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
