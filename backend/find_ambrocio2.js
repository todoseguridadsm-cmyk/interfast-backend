const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar por RAUL también
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'AMBROSIO', mode: 'insensitive' } },
        { name: { contains: 'AMBROCI', mode: 'insensitive' } },
        { name: { contains: 'RAUL', mode: 'insensitive' } },
      ]
    },
    select: { id: true, name: true }
  });

  console.log('Resultados:', JSON.stringify(clients, null, 2));
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
