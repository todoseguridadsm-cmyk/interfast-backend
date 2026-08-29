require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.invoice.update({
    where: {
      id: 624
    },
    data: {
      status: 'PAID'
    }
  });
  console.log("Updated invoice 624 (FANIN VANESA) to PAID.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
