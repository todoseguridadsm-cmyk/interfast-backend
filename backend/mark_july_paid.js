const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== MARCANDO FACTURAS DE JULIO 07/2026 COMO PAGADAS PARA MERCADO AGUSTINA, FALCON ROMINA Y CLIENTES MP DEL 30/31 JULIO ===");

  const targetNames = [
    'MERCADO AGUSTINA',
    'FALCON ROMINA',
    'RODRIGUEZ ANGELINA',
    'ZARANDON DARIO',
    'CAÑA MARIBEL',
    'VAQUER LEANDRO',
    'PATRICIA GOMEZ',
    'ROVIGATTI MARTIN'
  ];

  for (const name of targetNames) {
    const clients = await prisma.client.findMany({
      where: { name: { contains: name, mode: 'insensitive' } },
      include: { invoices: { where: { month: 7, year: 2026 } } }
    });

    for (const c of clients) {
      for (const inv of c.invoices) {
        if (inv.status !== 'PAID') {
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { status: 'PAID' }
          });
          console.log(`✅ Cliente "${c.name}" (ID: ${c.id}) -> Factura 07/2026 #${inv.id} actualizada a PAID 🟢.`);
        } else {
          console.log(`ℹ️ Cliente "${c.name}" (ID: ${c.id}) -> Factura 07/2026 #${inv.id} ya estaba en PAID 🟢.`);
        }
      }
    }
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
