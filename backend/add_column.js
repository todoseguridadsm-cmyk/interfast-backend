const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Añadiendo columna mpPaymentId a la tabla Payment...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN "mpPaymentId" TEXT;`);
    console.log("Columna añadida.");
  } catch (e) {
    console.log("Aviso: ", e.message);
  }

  try {
    console.log("Añadiendo restricción UNIQUE a mpPaymentId...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD CONSTRAINT "Payment_mpPaymentId_key" UNIQUE ("mpPaymentId");`);
    console.log("Restricción UNIQUE añadida.");
  } catch (e) {
    console.log("Aviso: ", e.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
