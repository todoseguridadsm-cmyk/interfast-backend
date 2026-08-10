const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const searchTerms = [
  { key: 'VILLEGAS', search: ['VILLEGAS', 'ELIANA'] },
  { key: 'DE CHAZAL', search: ['CHAZAL', 'JUAN MANUEL'] },
  { key: 'PEREIRA', search: ['PEREIRA', 'MARIA ALEJANDRA'] },
  { key: 'GUELI', search: ['GUELI', 'DANIEL'] },
  { key: 'CORVALAN', search: ['CORVALAN', 'FRANCO'] },
  { key: 'ARCE / TONELLI', search: ['ARCE', 'TONELLI', 'GUSTAVO'] },
  { key: 'GENTILE', search: ['GENTILE', 'VALENTINO'] },
  { key: 'SANCHEZ', search: ['SANCHEZ', 'MARIA'] },
  { key: 'PETRI', search: ['PETRI', 'BRUNELLA'] },
  { key: 'ROGGERONE', search: ['ROGGERONE', 'HECTOR'] },
  { key: 'CASTILLO', search: ['CASTILLO', 'SANDRA'] }
];

async function findBatch3() {
  console.log('--- BUSCANDO CLIENTES LOTE 3 ---');

  for (const item of searchTerms) {
    const clients = await prisma.client.findMany({
      where: {
        OR: item.search.map(s => ({
          OR: [
            { name: { contains: s, mode: 'insensitive' } },
            { businessName: { contains: s, mode: 'insensitive' } },
            { observation: { contains: s, mode: 'insensitive' } }
          ]
        }))
      },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      }
    });

    console.log(`\n=== Busqueda: "${item.key}" (Coincidencias: ${clients.length}) ===`);
    clients.forEach(c => {
      console.log(`Client ID: ${c.id} | Name: "${c.name}" | Business: "${c.businessName}" | Obs: "${c.observation}" | Status: ${c.status}`);
      c.invoices.forEach(inv => {
        console.log(`   Invoice ID: ${inv.id} | Month/Year: ${inv.month}/${inv.year} | Status: ${inv.status} | OrigAmt: ${inv.originalAmount}`);
      });
    });
  }

  await prisma.$disconnect();
}

findBatch3().catch(console.error);
