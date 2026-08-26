require('dotenv').config();
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 194;
  
  // Update invoice 676 to PAID
  await prisma.invoice.update({
    where: { id: 676 },
    data: { status: 'PAID' }
  });
  console.log('Factura 676 actualizada a PAID');

  // Delete the pending invoice 709 (which is for 3910, approximately the 3911.25 mentioned)
  await prisma.invoice.delete({
    where: { id: 709 }
  });
  console.log('Factura 709 (deuda parcial) eliminada');

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { invoices: true }
  });
  
  console.log('Cliente actualizado:', client);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
