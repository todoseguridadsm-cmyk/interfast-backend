const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'MORALES', mode: 'insensitive' } },
        { name: { contains: 'FERNANDA', mode: 'insensitive' } }
      ]
    }
  });

  console.log("Clientes Morales/Fernanda:");
  for (const c of clients) {
    const inv = await prisma.invoice.findFirst({ where: { clientId: c.id, month: 8, year: 2026 } });
    console.log(`- ID ${c.id}: "${c.name}" | Factura 8/2026 Status: ${inv ? inv.status : 'SIN FACTURA'}`);
  }
}

main().finally(() => prisma.$disconnect());
