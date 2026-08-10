const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const names = [
    'LEIVA ANDREA',
    'ALONSO MARIA ALEJANDRA',
    'JUAN HERNESTO CALDERON',
    'EUGENIO CONTE',
    'SANTIAGO ROLDAN'
  ];

  for (const name of names) {
    const client = await prisma.client.findFirst({
      where: { name: { contains: name, mode: 'insensitive' } }
    });
    if (client) {
      await prisma.client.update({
        where: { id: client.id },
        data: { debitoAutomatico: true }
      });
      console.log('✅ OK:', client.name, '| ID:', client.id);
    } else {
      console.log('❌ NO ENCONTRADO:', name);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
