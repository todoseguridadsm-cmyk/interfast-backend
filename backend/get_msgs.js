const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const msgs = await prisma.historial_mensajes.findMany({
    orderBy: { created_at: 'desc' },
    take: 20
  });

  msgs.reverse().forEach(m => {
    console.log(`[${m.created_at.toISOString()}] ${m.remitente} (${m.phone}): ${m.mensaje}`);
  });
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
