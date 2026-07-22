const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const allClients = await prisma.client.findMany({ select: { id: true, name: true }});
  
  const searchTerms = ["BLANES", "SEBASTIAN"];
  
  for (const term of searchTerms) {
    console.log(`\n--- Searching for: ${term} ---`);
    const matches = allClients.filter(c => (c.name || '').toUpperCase().includes(term));
    matches.forEach(m => console.log(`ID: ${m.id} | Name: ${m.name}`));
  }
  
  await prisma.$disconnect();
}
run();
