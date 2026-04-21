const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const c = await prisma.client.count();
    console.log('DB SUCCESS, Total clients:', c);
  } catch (error) {
    console.error('DB ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
