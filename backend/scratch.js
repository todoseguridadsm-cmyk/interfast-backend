const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.plan.findMany().then(console.log).finally(() => prisma.$disconnect());
