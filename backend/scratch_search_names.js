const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchNames() {
  const namesToSearch = ['DANIEL ROBERTO MARIN', 'NADIA TRINIDAD PERALTA'];

  for (const name of namesToSearch) {
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: name, mode: 'insensitive' } },
          { observation: { contains: name, mode: 'insensitive' } }
        ]
      }
    });

    console.log(`\nResultados para "${name}":`);
    if (clients.length === 0) {
      console.log('No se encontraron coincidencias.');
    } else {
      clients.forEach(c => {
        console.log(`- ID: ${c.id}`);
        console.log(`  Nombre: ${c.name}`);
        console.log(`  DNI: ${c.dni}`);
        console.log(`  Observación: ${c.observation || 'Ninguna'}`);
      });
    }
  }
}

searchNames()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
