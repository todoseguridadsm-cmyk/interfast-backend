const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const amount = 22991.37;
  const clientName = "Maria Liliana Gomez";

  const client = await prisma.client.findFirst({
    where: { name: { contains: "liliana gomez", mode: 'insensitive' } }
  });

  if (!client) {
    console.log('Client not found');
    return;
  }

  const invoice = await prisma.invoice.findFirst({
    where: { clientId: client.id, status: 'PENDING' },
    orderBy: [{ year: 'asc' }, { month: 'asc' }]
  });

  if (!invoice) {
    console.log('No pending invoice found for', client.name);
    return;
  }

  console.log(`Found invoice #${invoice.id} for ${client.name} (Original: $${invoice.originalAmount}, V1: $${invoice.priceV1})`);

  // Impute logic
  const today = new Date();
  let expectedTotal = invoice.priceV1 || invoice.originalAmount;
  
  if (invoice.dueDate1) {
    const d1 = new Date(invoice.dueDate1); d1.setHours(23, 59, 59, 999);
    const d2 = new Date(invoice.dueDate2 || invoice.dueDate1); d2.setHours(23, 59, 59, 999);
    const d3 = new Date(invoice.dueDate3 || invoice.dueDate1); d3.setHours(23, 59, 59, 999);
    
    if (today > d3 && invoice.priceV4) expectedTotal = invoice.priceV4;
    else if (today > d2 && invoice.priceV3) expectedTotal = invoice.priceV3;
    else if (today > d1 && invoice.priceV2) expectedTotal = invoice.priceV2;
  }

  console.log(`Expected Total for today: $${expectedTotal}`);
  
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: 'PAID', paymentDate: new Date(), paymentMethod: 'MERCADOPAGO' }
  });

  await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      method: 'MERCADOPAGO',
      amountPaid: amount,
      mpFee: 0,
      mpTax: 0,
      lateFeeApplied: 0,
      mpPaymentId: 'MANUAL_' + Date.now()
    }
  });

  await prisma.cashMovement.create({
    data: {
      type: 'IN',
      amount: amount,
      category: 'PAGO_FACTURA',
      description: `Cobro MP - Factura #${invoice.id} (${client.name}) - Imputación Manual`,
      userId: 1
    }
  });

  await prisma.cutoffList.deleteMany({
    where: { invoiceId: invoice.id }
  });

  await prisma.client.update({
    where: { id: client.id },
    data: { status: 'ACTIVE' }
  });

  const diff = expectedTotal - amount;
  if (diff > 200) {
    console.log('Difference > 200 detected, generating debt:', diff);
    await prisma.invoice.create({
      data: {
        clientId: client.id,
        month: invoice.month,
        year: invoice.year,
        originalAmount: diff,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        priceV1: diff,
        priceV2: diff,
        priceV3: diff,
        priceV4: diff,
        dueDate1: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        dueDate2: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        dueDate3: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        dueDate4: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  } else if (diff < -200) {
    const excess = -diff;
    console.log('Excess > 200 detected, adding to wallet:', excess);
    await prisma.client.update({
      where: { id: client.id },
      data: { walletBalance: { increment: excess } }
    });
  }
  
  console.log('Successfully imputed payment for Maria Liliana Gomez');
}

run().catch(console.error).finally(() => prisma.$disconnect());
