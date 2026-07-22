const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const inv400 = await prisma.invoice.findUnique({
      where: { id: 400 },
      include: { client: true }
    });
    const inv401 = await prisma.invoice.findUnique({
      where: { id: 401 },
      include: { client: true }
    });

    console.log("INVOICE 400:", JSON.stringify(inv400, null, 2));
    console.log("INVOICE 401:", JSON.stringify(inv401, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
