const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'D ANGELO BEATRIZ', mode: 'insensitive' } },
        { name: { contains: 'Rodríguez Janina Antonella', mode: 'insensitive' } }
      ]
    }
  });

  console.log(JSON.stringify(clients, null, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
