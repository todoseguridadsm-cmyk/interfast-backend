const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColumns() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN "mpFee" DOUBLE PRECISION NOT NULL DEFAULT 0.0;`);
    console.log("Column mpFee added.");
  } catch(e) { console.log(e.message); }
  
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN "mpTax" DOUBLE PRECISION NOT NULL DEFAULT 0.0;`);
    console.log("Column mpTax added.");
  } catch(e) { console.log(e.message); }
  
  console.log("Done.");
}

addColumns()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
