const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WhatsAppMessage" (
      id SERIAL PRIMARY KEY,
      phone TEXT NOT NULL,
      name TEXT,
      text TEXT NOT NULL,
      "isFromMe" BOOLEAN NOT NULL DEFAULT false,
      "isRead" BOOLEAN NOT NULL DEFAULT false,
      timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "WhatsAppMessage_phone_idx" ON "WhatsAppMessage"("phone");
  `);
  console.log('WhatsAppMessage table created safely');
}
run().catch(console.error).finally(() => prisma.$disconnect());
