const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECCIONANDO FACTURA ID 506 ===");
  const inv = await prisma.invoice.findUnique({
    where: { id: 506 },
    include: { client: true, payments: true }
  });
  console.log(JSON.stringify(inv, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
