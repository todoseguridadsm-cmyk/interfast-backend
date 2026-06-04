const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createNodeTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Node" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "host" TEXT NOT NULL,
        "port" INTEGER NOT NULL DEFAULT 8728,
        "user" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);
    console.log("Tabla Node creada exitosamente.");
  } catch (error) {
    console.error("Error creando tabla Node:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createNodeTable();
