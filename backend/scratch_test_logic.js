const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getInvoiceTierStatus } = require('./utils/tierHelper');

async function testMe() {
  const client = await prisma.client.findFirst({
    where: { dni: '31950190', name: { contains: 'PATAGONIA' } }
  });
  console.log("Testeando con client:", client.id, client.name);
  
  const invoices = await prisma.invoice.findMany({
    where: { clientId: client.id },
    include: { payments: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 12
  });

  const pendingInvoices = invoices.filter(i => i.status === 'PENDING').reverse();
  console.log("Facturas pendientes:", pendingInvoices.length);
  
  if (pendingInvoices.length > 0) {
    const getCents999 = (cId) => (((parseInt(cId) % 999) + 1) / 100);
    const centsVal = getCents999(client.id || 1);
    
    let totalSum = 0;
    try {
      const detailedPending = pendingInvoices.map(inv => {
        const tierStatus = getInvoiceTierStatus(inv);
        const total = Math.round(parseFloat(tierStatus.totalAmount) * 100) / 100;
        totalSum += total;
        
        return {
          invoiceId: inv.id,
          totalAmount: total,
          baseAmount: Math.round(parseFloat(inv.priceV1 || inv.originalAmount) * 100) / 100,
        };
      });

      totalSum = Math.round((totalSum + centsVal) * 100) / 100;
      console.log("activeBill ok:", totalSum);
    } catch(err) {
      console.error("ERROR GENERANDO ACTIVEBILL:", err);
    }
  }
}
testMe().catch(console.error).finally(() => prisma.$disconnect());
