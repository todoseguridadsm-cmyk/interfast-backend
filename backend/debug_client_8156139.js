const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECCIONANDO CLIENTE MIGUEL ANGEL DIAZ (DNI: 8156139) ===");
  
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { dni: { contains: '8156139' } },
        { name: { contains: 'MIGUEL ANGEL DIAZ', mode: 'insensitive' } }
      ]
    }
  });

  console.log(`Clientes encontrados: ${clients.length}`);
  for (const c of clients) {
    console.log(`\nCliente ID ${c.id}: ${c.name} | DNI: ${c.dni} | Estado: ${c.status} | Dirección: ${c.address}`);
    
    const invoices = await prisma.invoice.findMany({
      where: { clientId: c.id },
      orderBy: { id: 'asc' },
      include: { payments: true }
    });

    console.log(`Facturas asociadas (${invoices.length}):`);
    for (const inv of invoices) {
      console.log(` - Factura ID ${inv.id}: Mes ${inv.month}/${inv.year} | Status: "${inv.status}" | Original: $${inv.originalAmount} | Pagos: ${inv.payments.length}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
