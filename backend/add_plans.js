const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Limpiar planes actuales
  await prisma.plan.deleteMany();
  
  // Agregar nuevos
  const p1 = await prisma.plan.create({ data: { name: "PLAN 20MB", megas: 20, price: 10000 } });
  const p2 = await prisma.plan.create({ data: { name: "PLAN 30MB", megas: 30, price: 15000 } });
  
  console.log("Planes insertados:", p1.name, p2.name);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
