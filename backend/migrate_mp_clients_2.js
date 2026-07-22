const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const clientNames = [
  "JUANA VEDIA",
  "ROXANA DUTTO",
  "VARGAS GLORIA LAURDES",
  "GUIRAO JESUS LAG E HIJOS S.R.L",
  "AMBROSIO RAUL CESAR",
  "BLANES OSCAR ALBERTO",
  "SCOLLO JUAN CARLOS",
  "VELAZQUEZ YAMILA",
  "BENEDETTI ROSA",
  "BUTTINI DI CESARE DAIANA",
  "TORO RUBEN",
  "ZOPULO MICAELA",
  "ANITORI MIRTA BEATRIZ ANA",
  "MORALES MAURICIO NICOLAS",
  "ILLANES JUAN SEBASTIAN",
  "GONZALEZ FERNANDO SEBASTIAN"
];

async function run() {
  const notFound = [];
  const foundIds = [];
  try {
    const allClients = await prisma.client.findMany({ select: { id: true, name: true }});
    console.log("DB clients loaded", allClients.length);
    
    for (const searchName of clientNames) {
      const normSearch = searchName.toUpperCase().replace(/\s+/g, ' ').trim();
      const match = allClients.find(c => {
        const dbName = (c.name || '').toUpperCase().replace(/\s+/g, ' ').trim();
        return dbName.includes(normSearch) || normSearch.includes(dbName);
      });
      if (match) {
        foundIds.push({ id: match.id, searchName, dbName: match.name });
      } else {
        notFound.push(searchName);
      }
    }
    
    console.log(`--- FOUND: ${foundIds.length} ---`);
    console.log(`--- NOT FOUND: ${notFound.length} ---`);
    
    let paidCount = 0;
    
    for (let i = 0; i < foundIds.length; i++) {
      const client = foundIds[i];
      console.log(`Processing ${i+1}/${foundIds.length}: ${client.dbName}`);
      
      const pending = await prisma.invoice.findMany({
        where: { clientId: client.id, status: 'PENDING' }
      });
      console.log(` > Found ${pending.length} pending invoices for ${client.dbName}`);
      
      for (const inv of pending) {
        await prisma.invoice.update({
          where: { id: inv.id },
          data: { status: 'PAID' }
        });
        
        await prisma.payment.create({
          data: {
            invoiceId: inv.id,
            method: 'MERCADOPAGO_VIEJO',
            amountPaid: inv.originalAmount,
            lateFeeApplied: 0
          }
        });
        paidCount++;
      }
    }
    
    console.log(`\nUpdated ${paidCount} invoices to PAID.`);
    if (notFound.length > 0) {
      console.log("\nNOT FOUND CLIENTS:");
      console.log(notFound.join("\n"));
    }
  } catch (err) {
    console.error("ERROR CAUGHT:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
