require('dotenv').config();
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const payments = await prisma.payment.findMany({
    where: { invoiceId: 676 }
  });
  console.log('Payments for invoice 676:', payments);

  const client = await prisma.client.findUnique({
    where: { id: 194 },
    include: { invoices: true }
  });
  console.log('Client 194:', client);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
