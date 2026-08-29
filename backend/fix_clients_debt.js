require('dotenv').config();
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Update PARTIAL invoices to PAID
  await prisma.invoice.updateMany({
    where: {
      id: { in: [583, 646] }
    },
    data: {
      status: 'PAID'
    }
  });
  console.log("Updated invoices 583 and 646 to PAID.");

  // Delete the PENDING remainder invoices
  await prisma.invoice.deleteMany({
    where: {
      id: { in: [706, 707] }
    }
  });
  console.log("Deleted invoices 706 and 707 to remove debt.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
