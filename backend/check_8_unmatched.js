const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECCIONANDO LOS 8 CLIENTES RESTANTES DE LA LISTA ===");

  const targets = [
    { label: "AMBROCIO RAUL", terms: ["AMBROCIO", "AMBROSIO"] },
    { label: "RIERA RAUL LAFRE / ADELA BRANDI", terms: ["RIERA", "BRANDI", "ADELA"] },
    { label: "GUARDIA ANDREA LUICINA", terms: ["GUARDIA", "LUICINA", "LUCINA"] },
    { label: "ROBERTO JOSE DONA", terms: ["ROBERTO JOSE", "DONA", "DOÑA"] },
    { label: "MARIA FERNANDA MORALES", terms: ["MORALES", "FERNANDA"] },
    { label: "DAVID MAZARA", terms: ["MAZARA", "DAVID"] },
    { label: "DOMINGO MAZARA", terms: ["MAZARA", "DOMINGO"] },
    { label: "GONZALEZ FERNANDO SEBASTIAN", terms: ["FERNANDO SEBASTIAN", "GONZALEZ"] }
  ];

  for (const t of targets) {
    console.log(`\n🔍 Buscando: "${t.label}"...`);
    const clients = await prisma.client.findMany({
      where: {
        OR: t.terms.map(term => ({ name: { contains: term, mode: 'insensitive' } }))
      }
    });

    if (clients.length === 0) {
      console.log(`❌ No se encontró ningún cliente con los términos: ${t.terms.join(', ')}`);
    } else {
      for (const c of clients) {
        const inv = await prisma.invoice.findFirst({
          where: { clientId: c.id, month: 8, year: 2026 },
          include: { payments: true }
        });
        if (inv) {
          console.log(`  - Cliente ID ${c.id}: "${c.name}" | Factura 8/2026 ID ${inv.id} -> Status: ${inv.status} | Pagos: ${inv.payments.length}`);
        } else {
          console.log(`  - Cliente ID ${c.id}: "${c.name}" | SIN FACTURA 8/2026`);
        }
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
