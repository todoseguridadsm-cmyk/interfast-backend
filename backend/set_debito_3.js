const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // IDs confirmados:
  // 16 = CALDERON JUAN ERNESTO
  // 91 = CONTE EUGENIO  
  // 187 = ROLDAN SANTIAGO
  const ids = [16, 91, 187];

  for (const id of ids) {
    const client = await prisma.client.update({
      where: { id },
      data: { debitoAutomatico: true },
      select: { id: true, name: true, debitoAutomatico: true }
    });
    console.log('✅ OK:', client.name, '| ID:', client.id, '| debitoAutomatico:', client.debitoAutomatico);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
