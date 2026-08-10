const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECCIONANDO DEBITOS AUTOMATICOS (EUGENIO BUSTOS Y CALDERON JUAN ERNESTO) ===");

  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'BUSTOS', mode: 'insensitive' } },
        { name: { contains: 'CALDERON', mode: 'insensitive' } }
      ]
    },
    include: { invoices: { orderBy: { id: 'desc' } } }
  });

  console.log(`Clientes encontrados: ${clients.length}`);
  for (const c of clients) {
    console.log(`\nCliente ID ${c.id}: ${c.name} | DNI: ${c.dni} | DebitoAutomatico: ${c.debitoAutomatico} | Obs: "${c.observation}"`);
    console.log("Facturas recientes:");
    c.invoices.slice(0, 3).forEach(inv => {
      console.log(`  - Factura #${inv.id} (${inv.month}/${inv.year}) Status: ${inv.status} | PriceV1: ${inv.priceV1}`);
    });
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
