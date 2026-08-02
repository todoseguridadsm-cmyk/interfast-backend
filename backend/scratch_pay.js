const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoiceId = 439;
  
  // Create payment record
  await prisma.payment.create({
    data: {
      invoiceId: invoiceId,
      amountPaid: 22990,
      paymentDate: new Date(),
      method: 'mercadopago'
    }
  });

  // Update invoice status
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'PAID' }
  });

  console.log(`Factura ${invoiceId} actualizada a PAID con éxito.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
