const { getInvoiceTierStatus } = require('./utils/tierHelper');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const inv = await prisma.invoice.findFirst({ where: { id: 781 } });
  console.log("Tier for Sep 10:", getInvoiceTierStatus(inv, new Date('2026-09-10T12:00:00Z')));
  console.log("Tier for Sep 15:", getInvoiceTierStatus(inv, new Date('2026-09-15T12:00:00Z')));
  console.log("Tier for Sep 17:", getInvoiceTierStatus(inv, new Date('2026-09-17T12:00:00Z')));
  console.log("Tier for Sep 20:", getInvoiceTierStatus(inv, new Date('2026-09-20T12:00:00Z')));
}

run().finally(() => prisma.$disconnect());
