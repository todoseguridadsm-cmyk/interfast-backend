const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const results = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'CALDERON' } },
        { name: { contains: 'EUGENIO' } },
        { name: { contains: 'ROLDAN' } },
        { name: { contains: 'Calderon' } },
        { name: { contains: 'Eugenio' } },
        { name: { contains: 'Roldan' } },
      ]
    },
    select: { id: true, name: true }
  });
  console.log(JSON.stringify(results, null, 2));
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
