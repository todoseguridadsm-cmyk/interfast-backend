require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "CancellationRequest" ADD COLUMN IF NOT EXISTS "keepServiceUntil" TIMESTAMP`);
    console.log('Columna keepServiceUntil agregada');
  } catch(e) {
    console.log('Error:', e.message);
  }
  const rows = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'CancellationRequest'`);
  console.log('Columnas:', rows.map(r => r.column_name));
  await prisma.$disconnect();
}
run();
