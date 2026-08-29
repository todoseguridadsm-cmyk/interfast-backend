require('dotenv').config();
// Not overriding with DIRECT_URL this time
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
    },
    orderBy: {
      client: {
        name: 'asc'
      }
    }
  });

  console.log(`Total PAID invoices for August 2026: ${invoices.length}`);
  
  // To avoid duplicates if a client has multiple paid invoices (which shouldn't normally happen, but just in case)
  const uniqueClients = [...new Set(invoices.map(inv => inv.client.name))];
  console.log(`Total unique paid clients: ${uniqueClients.length}`);

  let output = "Lista de clientes PAGADOS en el CRM (Agosto 2026):\n\n";
  uniqueClients.forEach((name, index) => {
    output += `${index + 1}. ${name}\n`;
  });

  fs.writeFileSync('pagados_agosto.txt', output);
  console.log("Lista guardada en pagados_agosto.txt");
}

main().catch(console.error).finally(() => prisma.$disconnect());
