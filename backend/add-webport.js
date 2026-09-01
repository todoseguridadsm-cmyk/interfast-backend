require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addWebPort() {
  try {
    console.log('Adding webPort to Node table via raw SQL...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "Node" ADD COLUMN IF NOT EXISTS "webPort" INTEGER NOT NULL DEFAULT 80;`);
    console.log('Successfully added webPort column.');
  } catch (error) {
    console.error('Error adding webPort:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addWebPort();
