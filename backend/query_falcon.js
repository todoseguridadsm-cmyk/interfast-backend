const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const unidentified = await prisma.unidentifiedPayment.findMany({
    where: { payerName: { contains: 'Falcon', mode: 'insensitive' } }
  });
  console.log("Pagos huérfanos:");
  console.log(unidentified);
}
run().catch(console.error).finally(() => prisma.$disconnect());
