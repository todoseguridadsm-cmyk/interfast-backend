require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.client.findUnique({ where: { id: 19 } });
  console.log(c);
}
main().catch(console.log).finally(() => prisma.$disconnect());
