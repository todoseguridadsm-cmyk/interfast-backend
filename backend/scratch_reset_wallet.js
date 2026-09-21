const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.client.updateMany({ where: { name: { contains: 'DIAZ CLAUDIA' } }, data: { walletBalance: 0 } });
  await prisma.client.updateMany({ where: { name: { contains: 'NADALEZ' } }, data: { walletBalance: 0 } });
  console.log('Wallets reset for DIAZ CLAUDIA and NADALEZ');
}
run().finally(() => prisma.$disconnect());
