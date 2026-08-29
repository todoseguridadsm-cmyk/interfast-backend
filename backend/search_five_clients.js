const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const clientQueries = [
  { term: 'ALLISIARDI', expectedAmount: 22990.09 },
  { term: 'LUCERO MERCEDES', expectedAmount: 24371 },
  { term: 'ADARO', expectedAmount: 22990.07 },
  { term: 'LIRA PAEZ', expectedAmount: 22992.12 },
  { term: 'BARRERA DIEGO', expectedAmount: 22990 }
];

async function main() {
  console.log('=== BUSCANDO CLIENTES Y SUS FACTURAS PENDIENTES ===\n');

  for (const q of clientQueries) {
    console.log(`Buscando por término: "${q.term}" (Monto esperado: ${q.expectedAmount})`);
    
    // Search by name
    const clients = await prisma.client.findMany({
      where: {
        name: {
          contains: q.term,
          mode: 'insensitive'
        }
      },
      include: {
        invoices: {
          orderBy: { id: 'desc' },
          take: 5
        }
      }
    });

    if (clients.length === 0) {
      console.log(`❌ No se encontró cliente con término "${q.term}"`);
    } else {
      for (const c of clients) {
        console.log(`  - Cliente ID ${c.id}: ${c.name} | Estado actual: ${c.status} | DNI: ${c.dni}`);
        if (c.invoices.length === 0) {
          console.log(`    ⚠️ No tiene facturas.`);
        } else {
          for (const inv of c.invoices) {
            console.log(`    Factura ID #${inv.id} | Mes/Año: ${inv.month}/${inv.year} | Estado: ${inv.status} | OrigAmount: ${inv.originalAmount} | v1:${inv.priceV1} v2:${inv.priceV2} v3:${inv.priceV3} v4:${inv.priceV4}`);
          }
        }
      }
    }
    console.log('--------------------------------------------------');
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
