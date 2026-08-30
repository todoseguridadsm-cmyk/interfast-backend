const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const names = ['petiot', 'cornejo'];
  for (const name of names) {
    const client = await prisma.client.findFirst({
      where: { name: { contains: name, mode: 'insensitive' } }
    });
    if (client) {
      await prisma.invoice.updateMany({
        where: { clientId: client.id, status: 'PENDING' },
        data: { notifiedAt: new Date() }
      });
      console.log('Restored', client.name);
    } else {
      console.log('Could not find', name);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
