require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.client.findMany({ where: { name: { contains: 'macay', mode: 'insensitive' } } });
  console.log(c);
}
main().catch(console.log).finally(() => prisma.$disconnect());
