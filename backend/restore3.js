const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const names = ['fernando sebastian gonzalez', 'acebedo elisabeth esmeralda', 'adriana elisa petiot'];
  for (const name of names) {
    const client = await prisma.client.findFirst({
      where: { name: { contains: name.split(' ')[0], mode: 'insensitive' } } // fallback just in case
    });
    
    let target = client;
    if (!target) {
      console.log('Could not find', name);
      continue;
    }
    
    // search exact if possible to avoid wrong client
    const exact = await prisma.client.findFirst({
      where: { name: { contains: name, mode: 'insensitive' } }
    });
    if (exact) target = exact;

    if (target) {
      await prisma.invoice.updateMany({
        where: { clientId: target.id, status: 'PENDING' },
        data: { notifiedAt: new Date() }
      });
      console.log('Restored', target.name);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
