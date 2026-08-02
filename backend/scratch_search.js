const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'NICOLAS', mode: 'insensitive' } },
        { name: { contains: 'MARON', mode: 'insensitive' } }
      ]
    },
    include: {
      invoices: {
        where: { status: 'PENDING' }
      }
    }
  });

  const maronClients = clients.filter(c => c.name.toLowerCase().includes('maron'));
  console.log('Clientes encontrados con MARON:', JSON.stringify(maronClients, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
