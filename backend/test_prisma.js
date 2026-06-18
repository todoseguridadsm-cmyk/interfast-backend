const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const contents = await prisma.content_library.findMany({
      where: { estado: 'Pendiente' },
      orderBy: { created_at: 'desc' }
    });
    console.log('Success:', contents.length, 'records found.');
  } catch(e) {
    console.error('Error:', e.message);
  }
}

main().finally(() => prisma.$disconnect());
