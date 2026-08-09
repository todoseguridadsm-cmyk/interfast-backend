const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== PROBANDO MATCH POR ALIAS MP: EN OBSERVACIONES ===");

  const vilaClient = await prisma.client.findFirst({
    where: { name: { contains: 'VILA', mode: 'insensitive' } }
  });

  if (vilaClient) {
    console.log(`Cliente encontrado: "${vilaClient.name}" | Obs: "${vilaClient.observation}"`);

    // Simular lectura de alias en webhook
    const obs = vilaClient.observation || '';
    const rawAliases = obs
      .split(/[|\n]/)
      .map(s => s.replace(/^.*MP:\s*/i, '').trim())
      .filter(s => s.length > 2);

    console.log("Alias extraído de observaciones:", rawAliases);

    const payerSimulated = "Cynthia Lorena Ramon Veron";
    const payerClean = payerSimulated.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    for (const alias of rawAliases) {
      const aliasClean = alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const aliasTokens = aliasClean.split(/\s+/).filter(w => w.length >= 3);
      const matchedAliasTokens = aliasTokens.filter(tok => payerClean.includes(tok)).length;
      
      if (aliasTokens.length > 0 && (payerClean.includes(aliasClean) || matchedAliasTokens >= 2)) {
        console.log(`✅ MATCH EXITOSO: El pago realizado por "${payerSimulated}" se le imputó al cliente "${vilaClient.name}" por coincidir con sus observaciones.`);
      }
    }
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
