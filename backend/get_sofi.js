const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const agents = await prisma.chat_hub_agents.findMany({
    where: {
      name: { contains: 'Sofi', mode: 'insensitive' }
    }
  });

  if (agents.length === 0) {
    console.log("No se encontraron agentes con el nombre Sofi.");
    // try to list all agents
    const all = await prisma.chat_hub_agents.findMany();
    all.forEach(a => console.log(a.name));
  } else {
    agents.forEach(a => {
      console.log(`\n=== AGENTE: ${a.name} (ID: ${a.id}) ===\n`);
      console.log(a.systemPrompt);
    });
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
