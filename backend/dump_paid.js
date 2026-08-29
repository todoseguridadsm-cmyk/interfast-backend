require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const invoices = await prisma.invoice.findMany({
    where: {
      month: 8,
      year: 2026,
      status: 'PAID'
    },
    include: {
      client: true
    }
  });

  const uniqueClients = [...new Set(invoices.map(inv => inv.client.name.toUpperCase().trim()))];
  uniqueClients.sort();
  fs.writeFileSync('crm_paid.json', JSON.stringify(uniqueClients, null, 2));
  console.log(`Saved ${uniqueClients.length} clients to crm_paid.json`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
